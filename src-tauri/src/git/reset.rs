use crate::git::command::{GitCommand, GitError};

/// Reset HEAD to a specific commit.
pub fn reset(path: &str, sha: &str, mode: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);

    let flag = match mode {
        "soft" => "--soft",
        "mixed" => "--mixed",
        "hard" => "--hard",
        _ => "--mixed",
    };

    git.read_to_end(&["reset", flag, sha])?;
    Ok(())
}
