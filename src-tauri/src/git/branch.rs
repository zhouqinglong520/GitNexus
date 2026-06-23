use crate::git::command::{GitCommand, GitError};
use crate::models::Branch;

/// List all branches (local + remote).
pub fn list_branches(path: &str) -> Result<Vec<Branch>, GitError> {
    let git = GitCommand::new(path);

    // Use separate commands to avoid format parsing issues across git versions
    let local_output = git.read_to_end(&["for-each-ref", "--format=%(refname:short)", "refs/heads/"])?;
    let remote_output = git.read_to_end(&["for-each-ref", "--format=%(refname:short)", "refs/remotes/"])?;

    let mut branches = Vec::new();

    // Local branches
    for line in local_output.lines() {
        let name = line.trim().to_string();
        if name.is_empty() {
            continue;
        }
        branches.push(Branch {
            name,
            is_current: false,
            is_remote: false,
            upstream: None,
            last_commit: None,
        });
    }

    // Remote branches
    for line in remote_output.lines() {
        let name = line.trim().to_string();
        if name.is_empty() || name.ends_with("/HEAD") {
            continue;
        }
        branches.push(Branch {
            name,
            is_current: false,
            is_remote: true,
            upstream: None,
            last_commit: None,
        });
    }

    // Mark current branch
    if let Ok(current) = git.read_to_end(&["rev-parse", "--abbrev-ref", "HEAD"]) {
        let current = current.trim();
        for branch in &mut branches {
            if !branch.is_remote && branch.name == current {
                branch.is_current = true;
            }
        }
    }

    Ok(branches)
}

/// Create a new branch.
pub fn create_branch(path: &str, name: &str, ref_name: Option<&str>) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    let mut args: Vec<&str> = vec!["branch", name];
    if let Some(r) = ref_name {
        args.push(r);
    }
    git.read_to_end(&args)?;
    Ok(())
}

/// Delete a branch.
pub fn delete_branch(path: &str, name: &str, force: bool) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    let flag = if force { "-D" } else { "-d" };
    git.read_to_end(&["branch", flag, name])?;
    Ok(())
}

/// Rename a branch.
pub fn rename_branch(path: &str, old_name: &str, new_name: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["branch", "-m", old_name, new_name])?;
    Ok(())
}

/// Checkout a branch.
pub fn checkout_branch(path: &str, name: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["checkout", name])?;
    Ok(())
}

/// Set upstream for a branch.
pub fn set_upstream(path: &str, branch: &str, remote_branch: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["branch", "--set-upstream-to", remote_branch, branch])?;
    Ok(())
}
