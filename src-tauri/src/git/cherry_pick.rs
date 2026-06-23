use crate::git::command::{GitCommand, GitError};

/// Cherry-pick a commit.
pub fn cherry_pick(path: &str, sha: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["cherry-pick", sha])?;
    Ok(())
}

/// Continue cherry-pick after resolving conflicts.
pub fn cherry_pick_continue(path: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["cherry-pick", "--continue"])?;
    Ok(())
}

/// Abort the current cherry-pick.
pub fn cherry_pick_abort(path: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["cherry-pick", "--abort"])?;
    Ok(())
}
