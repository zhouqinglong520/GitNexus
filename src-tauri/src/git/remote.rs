use crate::git::command::{GitCommand, GitError};

/// Add a new remote.
pub fn add_remote(path: &str, name: &str, url: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["remote", "add", name, url])?;
    Ok(())
}

/// Remove a remote.
pub fn remove_remote(path: &str, name: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["remote", "remove", name])?;
    Ok(())
}

/// Prune stale tracking references for a remote.
pub fn prune_remote(path: &str, name: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["remote", "prune", name])?;
    Ok(())
}
