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

/// Change the URL of an existing remote.
pub fn edit_remote(path: &str, name: &str, new_url: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["remote", "set-url", name, new_url])?;
    Ok(())
}

/// Delete a tag from a remote repository.
pub fn delete_remote_tag(path: &str, name: &str, remote: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["push", remote, "--delete", &format!("refs/tags/{}", name)])?;
    Ok(())
}
