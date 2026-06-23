use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Command as StdCommand;
use std::process::Stdio;

use crate::git::command::GitError;

// ============================================================
// Custom Action types
// ============================================================

/// A user-defined custom action that can be executed on a repository.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomAction {
    pub id: String,
    pub name: String,
    pub command: String,
    pub working_directory: String,
    pub scope: String,
    pub variables: Vec<CustomActionVariable>,
    pub wait_for_completion: bool,
}

/// A variable definition for a custom action (shown as UI controls).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomActionVariable {
    pub name: String,
    pub control_type: String,
    pub default_value: String,
    pub options: Vec<String>,
}

// ============================================================
// Repo Config types
// ============================================================

/// Per-repository configuration stored in `{git_common_dir}/gitui.settings`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoConfig {
    pub default_remote: Option<String>,
    pub merge_mode: Option<String>,
    pub submodule_auto_update: Option<bool>,
    pub commit_types: Option<Vec<CommitType>>,
    pub commit_template: Option<String>,
    pub ai_service: Option<String>,
    pub custom_actions: Option<Vec<CustomAction>>,
    pub issue_tracking_rules: Option<Vec<IssueTrackingRule>>,
}

/// A commit type definition for structured commit messages.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitType {
    pub name: String,
    pub description: String,
    pub emoji: Option<String>,
}

/// A rule for linking issue IDs to URLs.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IssueTrackingRule {
    pub pattern: String,
    pub url_template: String,
}

impl Default for RepoConfig {
    fn default() -> Self {
        Self {
            default_remote: None,
            merge_mode: None,
            submodule_auto_update: None,
            commit_types: None,
            commit_template: None,
            ai_service: None,
            custom_actions: None,
            issue_tracking_rules: None,
        }
    }
}

// ============================================================
// Execute custom action
// ============================================================

/// Execute a custom action, substituting variables in the command string.
///
/// Supported built-in variables:
/// - `{RepoPath}` - absolute path to the repository
/// - `{Branch}` - current branch name
/// - `{CommitSHA}` - current HEAD commit SHA
/// - `{FilePath}` - selected file path (if applicable)
/// - `{TagName}` - selected tag name (if applicable)
/// - `{ControlN}` - value of the N-th custom variable (1-indexed)
pub fn execute_custom_action(
    repo_path: &str,
    action: &CustomAction,
    variable_values: HashMap<String, String>,
    on_output: impl Fn(String),
) -> Result<String, GitError> {
    // Determine working directory
    let work_dir = match action.working_directory.as_str() {
        "repo" => repo_path.to_string(),
        "home" => {
            dirs::home_dir()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|| repo_path.to_string())
        }
        custom => custom.to_string(),
    };

    // Resolve current branch
    let branch = get_current_branch(repo_path).unwrap_or_default();
    let commit_sha = get_head_sha(repo_path).unwrap_or_default();

    // Build variable map
    let mut vars: HashMap<String, String> = HashMap::new();
    vars.insert("RepoPath".to_string(), repo_path.to_string());
    vars.insert("Branch".to_string(), branch);
    vars.insert("CommitSHA".to_string(), commit_sha);

    // Insert user-provided context variables
    if let Some(v) = variable_values.get("FilePath") {
        vars.insert("FilePath".to_string(), v.clone());
    }
    if let Some(v) = variable_values.get("TagName") {
        vars.insert("TagName".to_string(), v.clone());
    }

    // Insert custom control variables: Control1, Control2, ...
    for (i, var_def) in action.variables.iter().enumerate() {
        let key = format!("Control{}", i + 1);
        let value = variable_values
            .get(&var_def.name)
            .cloned()
            .unwrap_or_else(|| var_def.default_value.clone());
        vars.insert(key, value);
    }

    // Substitute variables in command
    let mut final_command = action.command.clone();
    for (key, value) in &vars {
        final_command = final_command.replace(&format!("{{{}}}", key), value);
    }

    // Execute the command
    let mut cmd = StdCommand::new("sh");
    cmd.arg("-c")
        .arg(&final_command)
        .current_dir(&work_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let output = cmd
        .output()
        .map_err(|e| GitError::ProcessError(format!("Failed to execute command: {}", e)))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    // Send output lines to callback
    for line in stdout.lines() {
        on_output(line.to_string());
    }

    if output.status.success() {
        Ok(stdout)
    } else {
        Err(GitError::CommandError(format!(
            "Custom action '{}' failed: {}",
            action.name, stderr
        )))
    }
}

// ============================================================
// Repo config read/write
// ============================================================

/// Read the repository-specific configuration from `{git_common_dir}/gitui.settings`.
pub fn get_repo_config(path: &str) -> Result<RepoConfig, GitError> {
    let git_dir = get_git_common_dir(path)?;
    let config_path = git_dir.join("gitui.settings");

    if !config_path.exists() {
        return Ok(RepoConfig::default());
    }

    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| GitError::ProcessError(format!("Failed to read gitui.settings: {}", e)))?;

    serde_json::from_str(&content)
        .map_err(|e| GitError::ParseError(format!("Failed to parse gitui.settings: {}", e)))
}

/// Save the repository-specific configuration to `{git_common_dir}/gitui.settings`.
pub fn save_repo_config(path: &str, config: &RepoConfig) -> Result<(), GitError> {
    let git_dir = get_git_common_dir(path)?;
    let config_path = git_dir.join("gitui.settings");

    let content = serde_json::to_string_pretty(config)
        .map_err(|e| GitError::ParseError(format!("Failed to serialize config: {}", e)))?;

    std::fs::write(&config_path, content)
        .map_err(|e| GitError::ProcessError(format!("Failed to write gitui.settings: {}", e)))?;

    Ok(())
}

// ============================================================
// Helpers
// ============================================================

/// Get the current branch name of a repository.
fn get_current_branch(repo_path: &str) -> Option<String> {
    let output = StdCommand::new("git")
        .arg("--no-pager")
        .arg("rev-parse")
        .arg("--abbrev-ref")
        .arg("HEAD")
        .current_dir(repo_path)
        .env("GIT_TERMINAL_PROMPT", "0")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .ok()?;

    if output.status.success() {
        let branch = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if branch.is_empty() {
            None
        } else {
            Some(branch)
        }
    } else {
        None
    }
}

/// Get the current HEAD commit SHA.
fn get_head_sha(repo_path: &str) -> Option<String> {
    let output = StdCommand::new("git")
        .arg("--no-pager")
        .arg("rev-parse")
        .arg("HEAD")
        .current_dir(repo_path)
        .env("GIT_TERMINAL_PROMPT", "0")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .ok()?;

    if output.status.success() {
        let sha = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if sha.is_empty() {
            None
        } else {
            Some(sha)
        }
    } else {
        None
    }
}

/// Resolve the git common directory for a repository path.
/// This handles both regular repos and worktrees.
fn get_git_common_dir(repo_path: &str) -> Result<std::path::PathBuf, GitError> {
    let output = StdCommand::new("git")
        .arg("--no-pager")
        .arg("rev-parse")
        .arg("--git-common-dir")
        .current_dir(repo_path)
        .env("GIT_TERMINAL_PROMPT", "0")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| GitError::ProcessError(e.to_string()))?;

    if output.status.success() {
        let dir = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let dir_path = std::path::Path::new(&dir);
        // If the path is relative, resolve it against the repo path
        let abs_path = if dir_path.is_relative() {
            std::path::Path::new(repo_path).join(dir_path)
        } else {
            dir_path.to_path_buf()
        };
        Ok(abs_path)
    } else {
        // Fallback to .git directory
        let git_dir = std::path::PathBuf::from(repo_path).join(".git");
        if git_dir.exists() {
            Ok(git_dir)
        } else {
            Err(GitError::CommandError(
                "Not a git repository".to_string(),
            ))
        }
    }
}
