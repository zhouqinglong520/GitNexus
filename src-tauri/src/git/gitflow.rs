use crate::git::command::{GitCommand, GitError};
use crate::models::{GitFlowBranches, GitFlowFinishOptions, GitFlowStatus};
use std::process::Command as StdCommand;

/// Check if git-flow is available on the system.
pub fn is_gitflow_available() -> bool {
    StdCommand::new("git")
        .arg("flow")
        .arg("version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Initialize GitFlow in the repository.
///
/// If git-flow is available, uses `git flow init -d`.
/// Otherwise, manually creates the standard GitFlow branches.
pub fn gitflow_init(path: &str, branches: Option<GitFlowBranches>) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    let config = branches.unwrap_or_default();

    if is_gitflow_available() {
        // Use git flow init with defaults
        git.read_to_end(&["flow", "init", "-d"])?;

        // Set custom branch names if provided (non-default)
        if config.master != "master" {
            git.read_to_end(&["config", "gitflow.branch.master", &config.master])?;
        }
        if config.develop != "develop" {
            git.read_to_end(&["config", "gitflow.branch.develop", &config.develop])?;
        }
        if config.feature != "feature/" {
            git.read_to_end(&["config", "gitflow.prefix.feature", &config.feature])?;
        }
        if config.release != "release/" {
            git.read_to_end(&["config", "gitflow.prefix.release", &config.release])?;
        }
        if config.hotfix != "hotfix/" {
            git.read_to_end(&["config", "gitflow.prefix.hotfix", &config.hotfix])?;
        }
        if config.support != "support/" {
            git.read_to_end(&["config", "gitflow.prefix.support", &config.support])?;
        }
        if !config.version_tag_prefix.is_empty() {
            git.read_to_end(&[
                "config",
                "gitflow.prefix.versiontag",
                &config.version_tag_prefix,
            ])?;
        }
    } else {
        // Manual GitFlow initialization
        // Get current branch to determine if we need to rename
        let current_branch = git
            .read_to_end(&["rev-parse", "--abbrev-ref", "HEAD"])
            .map(|s| s.trim().to_string())
            .unwrap_or_else(|_| "master".to_string());

        // Create or rename master branch
        if current_branch != config.master {
            // Check if master already exists
            let master_exists = git
                .read_to_end(&["rev-parse", "--verify", &format!("refs/heads/{}", config.master)])
                .is_ok();

            if master_exists {
                git.read_to_end(&["checkout", &config.master])?;
            } else {
                git.read_to_end(&["branch", "-M", &config.master])?;
            }
        }

        // Create develop branch from master
        let develop_exists = git
            .read_to_end(&["rev-parse", "--verify", &format!("refs/heads/{}", config.develop)])
            .is_ok();

        if !develop_exists {
            git.read_to_end(&["checkout", "-b", &config.develop, &config.master])?;
        }

        // Set gitflow config entries for consistency
        git.read_to_end(&["config", "gitflow.branch.master", &config.master])?;
        git.read_to_end(&["config", "gitflow.branch.develop", &config.develop])?;
        git.read_to_end(&["config", "gitflow.prefix.feature", &config.feature])?;
        git.read_to_end(&["config", "gitflow.prefix.release", &config.release])?;
        git.read_to_end(&["config", "gitflow.prefix.hotfix", &config.hotfix])?;
        git.read_to_end(&["config", "gitflow.prefix.support", &config.support])?;
        if !config.version_tag_prefix.is_empty() {
            git.read_to_end(&[
                "config",
                "gitflow.prefix.versiontag",
                &config.version_tag_prefix,
            ])?;
        }
    }

    Ok(())
}

/// Start a new GitFlow branch.
///
/// Supports feature, release, and hotfix branch types.
pub fn gitflow_start(
    path: &str,
    branch_type: &str,
    name: &str,
    base: Option<&str>,
) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    let full_branch_name = format!("{}{}", branch_type, name);

    match branch_type {
        "feature/" | "feature" => {
            if is_gitflow_available() {
                git.read_to_end(&["flow", "feature", "start", name])?;
            } else {
                let develop = get_develop_branch(path);
                let base_ref = base.unwrap_or(&develop);
                git.read_to_end(&["checkout", "-b", &full_branch_name, base_ref])?;
            }
        }
        "release/" | "release" => {
            if is_gitflow_available() {
                git.read_to_end(&["flow", "release", "start", name])?;
            } else {
                let develop = get_develop_branch(path);
                let base_ref = base.unwrap_or(&develop);
                git.read_to_end(&["checkout", "-b", &full_branch_name, base_ref])?;
            }
        }
        "hotfix/" | "hotfix" => {
            if is_gitflow_available() {
                git.read_to_end(&["flow", "hotfix", "start", name])?;
            } else {
                let master = get_master_branch(path);
                let base_ref = base.unwrap_or(&master);
                git.read_to_end(&["checkout", "-b", &full_branch_name, base_ref])?;
            }
        }
        "support/" | "support" => {
            let base_ref = base.ok_or_else(|| {
                GitError::CommandError("support branches require a base commit".to_string())
            })?;
            git.read_to_end(&["checkout", "-b", &full_branch_name, base_ref])?;
        }
        _ => {
            return Err(GitError::CommandError(format!(
                "Unknown GitFlow branch type: {}",
                branch_type
            )));
        }
    }

    Ok(())
}

/// Finish a GitFlow branch.
///
/// Merges the branch back to its target and optionally tags, deletes, and pushes.
pub fn gitflow_finish(
    path: &str,
    branch_type: &str,
    name: &str,
    options: GitFlowFinishOptions,
) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    let full_branch_name = normalize_branch_name(branch_type, name);

    // Fetch from remote if requested
    if options.fetch {
        let _ = git.read_to_end(&["fetch", "--all"]);
    }

    if is_gitflow_available() {
        let mut args: Vec<&str> = vec!["flow", branch_type.trim_end_matches('/'), "finish"];

        if options.fetch {
            args.push("--fetch");
        }
        if options.rebase {
            args.push("--rebase");
        }
        if options.keep_branch {
            args.push("--keep");
        }
        if options.push {
            args.push("--push");
        }
        if let Some(ref msg) = options.message {
            args.push("--message");
            // We need the message to live long enough
            return gitflow_finish_with_message(&git, &args, msg);
        }

        args.push(name);
        git.read_to_end(&args)?;
    } else {
        // Manual finish implementation
        match branch_type.trim_end_matches('/') {
            "feature" => finish_feature_manual(&git, &full_branch_name, &options)?,
            "release" => finish_release_manual(&git, &full_branch_name, name, &options)?,
            "hotfix" => finish_hotfix_manual(&git, &full_branch_name, name, &options)?,
            _ => {
                return Err(GitError::CommandError(format!(
                    "Cannot finish unknown branch type: {}",
                    branch_type
                )));
            }
        }
    }

    Ok(())
}

/// Finish a feature branch manually (without git-flow).
fn finish_feature_manual(
    git: &GitCommand,
    branch_name: &str,
    options: &GitFlowFinishOptions,
) -> Result<(), GitError> {
    let develop = get_develop_branch(&git.repo_path);

    // Checkout develop
    git.read_to_end(&["checkout", &develop])?;

    // Rebase if requested
    if options.rebase {
        git.read_to_end(&["rebase", branch_name])?;
    } else {
        // Merge the feature branch (no-ff)
        git.read_to_end(&["merge", "--no-ff", branch_name])?;
    }

    // Delete the feature branch unless keep_branch is set
    if !options.keep_branch {
        git.read_to_end(&["branch", "-d", branch_name])?;
    }

    // Push if requested
    if options.push {
        let _ = git.read_to_end(&["push", "origin", &develop]);
    }

    Ok(())
}

/// Finish a release branch manually (without git-flow).
fn finish_release_manual(
    git: &GitCommand,
    branch_name: &str,
    tag_name: &str,
    options: &GitFlowFinishOptions,
) -> Result<(), GitError> {
    let master = get_master_branch(&git.repo_path);
    let develop = get_develop_branch(&git.repo_path);

    // Checkout master and merge
    git.read_to_end(&["checkout", &master])?;
    git.read_to_end(&["merge", "--no-ff", branch_name])?;

    // Tag the release
    let default_msg = format!("Release {}", tag_name);
    let tag_msg = options.message.as_deref().unwrap_or(&default_msg);
    git.read_to_end(&["tag", "-a", tag_name, "-m", tag_msg])?;

    // Checkout develop and merge
    git.read_to_end(&["checkout", &develop])?;
    git.read_to_end(&["merge", "--no-ff", branch_name])?;

    // Delete the release branch unless keep_branch is set
    if !options.keep_branch {
        git.read_to_end(&["branch", "-d", branch_name])?;
    }

    // Push if requested
    if options.push {
        let _ = git.read_to_end(&["push", "origin", "--tags"]);
        let _ = git.read_to_end(&["push", "origin", &master]);
        let _ = git.read_to_end(&["push", "origin", &develop]);
    }

    Ok(())
}

/// Finish a hotfix branch manually (without git-flow).
fn finish_hotfix_manual(
    git: &GitCommand,
    branch_name: &str,
    tag_name: &str,
    options: &GitFlowFinishOptions,
) -> Result<(), GitError> {
    let master = get_master_branch(&git.repo_path);
    let develop = get_develop_branch(&git.repo_path);

    // Checkout master and merge
    git.read_to_end(&["checkout", &master])?;
    git.read_to_end(&["merge", "--no-ff", branch_name])?;

    // Tag the hotfix
    let default_msg = format!("Hotfix {}", tag_name);
    let tag_msg = options.message.as_deref().unwrap_or(&default_msg);
    git.read_to_end(&["tag", "-a", tag_name, "-m", tag_msg])?;

    // Checkout develop and merge
    git.read_to_end(&["checkout", &develop])?;
    git.read_to_end(&["merge", "--no-ff", branch_name])?;

    // Delete the hotfix branch unless keep_branch is set
    if !options.keep_branch {
        git.read_to_end(&["branch", "-d", branch_name])?;
    }

    // Push if requested
    if options.push {
        let _ = git.read_to_end(&["push", "origin", "--tags"]);
        let _ = git.read_to_end(&["push", "origin", &master]);
        let _ = git.read_to_end(&["push", "origin", &develop]);
    }

    Ok(())
}

/// Helper to finish with a message using git-flow.
fn gitflow_finish_with_message(
    git: &GitCommand,
    base_args: &[&str],
    message: &str,
) -> Result<(), GitError> {
    let mut args: Vec<String> = base_args.iter().map(|s| s.to_string()).collect();
    args.push("--message".to_string());
    args.push(message.to_string());
    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    git.read_to_end(&args_ref)?;
    Ok(())
}

/// Get the list of all GitFlow branches and status.
pub fn gitflow_list(path: &str) -> Result<GitFlowStatus, GitError> {
    let git = GitCommand::new(path);

    // Check if GitFlow is initialized by looking for gitflow config
    let is_initialized = git
        .read_to_end(&["config", "--get", "gitflow.branch.master"])
        .is_ok();

    // Get master and develop branch names
    let master = git
        .read_to_end(&["config", "--get", "gitflow.branch.master"])
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|_| {
            // Fallback: check if master or main exists
            if git
                .read_to_end(&["rev-parse", "--verify", "refs/heads/main"])
                .is_ok()
            {
                "main".to_string()
            } else {
                "master".to_string()
            }
        });

    let develop = git
        .read_to_end(&["config", "--get", "gitflow.branch.develop"])
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|_| "develop".to_string());

    // Get feature prefix
    let feature_prefix = git
        .read_to_end(&["config", "--get", "gitflow.prefix.feature"])
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|_| "feature/".to_string());

    // Get release prefix
    let release_prefix = git
        .read_to_end(&["config", "--get", "gitflow.prefix.release"])
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|_| "release/".to_string());

    // Get hotfix prefix
    let hotfix_prefix = git
        .read_to_end(&["config", "--get", "gitflow.prefix.hotfix"])
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|_| "hotfix/".to_string());

    // List all local branches
    let all_branches = git.read_to_end(&["for-each-ref", "--format=%(refname:short)", "refs/heads/"])?;

    let mut features = Vec::new();
    let mut releases = Vec::new();
    let mut hotfixes = Vec::new();

    for line in all_branches.lines() {
        let name = line.trim();
        if name.is_empty() {
            continue;
        }
        if name.starts_with(&feature_prefix) {
            features.push(name.to_string());
        } else if name.starts_with(&release_prefix) {
            releases.push(name.to_string());
        } else if name.starts_with(&hotfix_prefix) {
            hotfixes.push(name.to_string());
        }
    }

    Ok(GitFlowStatus {
        master,
        develop,
        features,
        releases,
        hotfixes,
        is_initialized,
    })
}

// ============================================================
// Helper functions
// ============================================================

/// Get the configured master branch name.
fn get_master_branch(path: &str) -> String {
    let git = GitCommand::new(path);
    git.read_to_end(&["config", "--get", "gitflow.branch.master"])
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|_| {
            // Fallback: check if main exists
            if git
                .read_to_end(&["rev-parse", "--verify", "refs/heads/main"])
                .is_ok()
            {
                "main".to_string()
            } else {
                "master".to_string()
            }
        })
}

/// Get the configured develop branch name.
fn get_develop_branch(path: &str) -> String {
    let git = GitCommand::new(path);
    git.read_to_end(&["config", "--get", "gitflow.branch.develop"])
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|_| "develop".to_string())
}

/// Normalize a branch name with its prefix.
/// Handles both "feature/" and "feature" style inputs.
fn normalize_branch_name(branch_type: &str, name: &str) -> String {
    let prefix = branch_type.trim_end_matches('/');
    if name.starts_with(&format!("{}/", prefix)) {
        name.to_string()
    } else {
        format!("{}/{}", prefix, name)
    }
}
