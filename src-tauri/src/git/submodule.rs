use crate::git::command::{GitCommand, GitError};
use crate::models::Submodule;

/// List all submodules.
pub fn list_submodules(path: &str) -> Result<Vec<Submodule>, GitError> {
    let git = GitCommand::new(path);

    let output = git.read_to_end(&[
        "submodule",
        "status",
        "--recursive",
    ])?;

    let mut submodules = Vec::new();
    for line in output.lines() {
        if line.is_empty() {
            continue;
        }
        // Format: <sha> <path> [<branch>]
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 2 {
            continue;
        }
        let sha = parts[0].trim_start_matches('-').trim_start_matches('+').to_string();
        let sub_path = parts[1].to_string();
        let branch = if parts.len() > 2 {
            Some(parts[2].to_string())
        } else {
            None
        };

        // Get the submodule name from .gitmodules
        let name = sub_path.split('/').last().unwrap_or(&sub_path).to_string();

        // Try to get the URL
        let url = git
            .read_to_end(&["config", &format!("submodule.{}.url", name)])
            .unwrap_or_default()
            .trim()
            .to_string();

        submodules.push(Submodule {
            name,
            path: sub_path,
            url,
            branch,
            sha,
        });
    }

    Ok(submodules)
}

/// Add a submodule.
pub fn add_submodule(
    path: &str,
    url: &str,
    name: Option<&str>,
    branch: Option<&str>,
) -> Result<(), GitError> {
    let git = GitCommand::new(path);

    let mut args: Vec<&str> = vec!["submodule", "add"];
    if let Some(b) = branch {
        args.push("-b");
        args.push(b);
    }
    if let Some(n) = name {
        args.push("--name");
        args.push(n);
    }
    args.push(url);
    // The path is required; use name if not otherwise specified
    if let Some(n) = name {
        args.push(n);
    }

    git.read_to_end(&args)?;
    Ok(())
}

/// Update submodules.
pub fn update_submodule(
    path: &str,
    name: Option<&str>,
    init: bool,
    recursive: bool,
) -> Result<(), GitError> {
    let git = GitCommand::new(path);

    let mut args: Vec<&str> = vec!["submodule", "update"];
    if init {
        args.push("--init");
    }
    if recursive {
        args.push("--recursive");
    }
    if let Some(n) = name {
        args.push("--");
        args.push(n);
    }

    git.read_to_end(&args)?;
    Ok(())
}

/// Deinitialize a submodule (remove its working directory and config).
pub fn deinit_submodule(path: &str, name: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["submodule", "deinit", "-f", name])?;
    Ok(())
}

/// Set the tracking branch for a submodule and update it.
pub fn set_submodule_branch(path: &str, name: &str, branch: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);

    // Set the branch in .gitmodules
    let config_key = format!("submodule.{}.branch", name);
    git.read_to_end(&["config", "-f", ".gitmodules", &config_key, branch])?;

    // Update the submodule to track the new branch
    git.read_to_end(&["submodule", "update", "--remote", name])?;

    Ok(())
}

/// Change the URL of a submodule.
pub fn change_submodule_url(path: &str, name: &str, url: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["submodule", "set-url", name, url])?;
    Ok(())
}
