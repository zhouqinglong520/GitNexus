use crate::git::command::{GitCommand, GitError};
use crate::models::Worktree;

/// List all worktrees in the repository.
pub fn list_worktrees(path: &str) -> Result<Vec<Worktree>, GitError> {
    let git = GitCommand::new(path);
    let output = git.read_to_end(&["worktree", "list", "--porcelain"])?;

    let mut worktrees = Vec::new();
    let mut current = Worktree {
        name: String::new(),
        path: String::new(),
        branch: None,
        is_main: false,
        is_locked: false,
    };

    for line in output.lines() {
        if line.is_empty() {
            if !current.path.is_empty() {
                worktrees.push(current.clone());
            }
            current = Worktree {
                name: String::new(),
                path: String::new(),
                branch: None,
                is_main: false,
                is_locked: false,
            };
            continue;
        }

        if let Some(value) = line.strip_prefix("worktree ") {
            current.path = value.to_string();
        } else if let Some(value) = line.strip_prefix("HEAD ") {
            // HEAD reference, not needed for our model
            let _ = value;
        } else if let Some(value) = line.strip_prefix("branch ") {
            // branch refs/heads/name
            let name = value
                .strip_prefix("refs/heads/")
                .unwrap_or(value)
                .to_string();
            current.branch = Some(name);
        } else if line == "bare" {
            current.is_main = true;
        } else if line == "locked" {
            current.is_locked = true;
        } else if let Some(reason) = line.strip_prefix("locked ") {
            // locked with reason
            let _ = reason;
            current.is_locked = true;
        }
    }

    // Push the last entry if non-empty
    if !current.path.is_empty() {
        worktrees.push(current);
    }

    // Mark the first worktree as main if not already marked
    if let Some(first) = worktrees.first_mut() {
        first.is_main = true;
    }

    // Derive name from path (last path component)
    for wt in &mut worktrees {
        wt.name = std::path::Path::new(&wt.path)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| wt.path.clone());
    }

    Ok(worktrees)
}

/// Add a new worktree.
pub fn add_worktree(
    path: &str,
    worktree_path: &str,
    branch: Option<&str>,
    create_branch: bool,
) -> Result<(), GitError> {
    let git = GitCommand::new(path);

    let mut args: Vec<&str> = vec!["worktree", "add"];

    if create_branch {
        if let Some(b) = branch {
            args.push("-b");
            args.push(b);
        }
    } else if let Some(b) = branch {
        args.push("-B");
        args.push(b);
    }

    args.push(worktree_path);

    git.read_to_end(&args)?;
    Ok(())
}

/// Remove a worktree.
pub fn remove_worktree(path: &str, worktree_path: &str, force: bool) -> Result<(), GitError> {
    let git = GitCommand::new(path);

    let mut args: Vec<&str> = vec!["worktree", "remove"];
    if force {
        args.push("--force");
    }
    args.push(worktree_path);

    git.read_to_end(&args)?;
    Ok(())
}

/// Prune stale worktree entries.
pub fn prune_worktrees(path: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["worktree", "prune"])?;
    Ok(())
}
