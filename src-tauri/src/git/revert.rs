use crate::git::command::{GitCommand, GitError};

/// Revert a commit.
pub fn revert(path: &str, sha: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["revert", sha])?;
    Ok(())
}
