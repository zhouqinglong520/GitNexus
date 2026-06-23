use crate::git::command::{GitCommand, GitError};

/// Discard changes in the specified files by restoring them from HEAD.
pub fn discard_changes(path: &str, files: &[String]) -> Result<(), GitError> {
    if files.is_empty() {
        return Ok(());
    }

    let git = GitCommand::new(path);
    let mut args: Vec<&str> = vec!["checkout", "--"];
    for f in files {
        args.push(f);
    }
    git.read_to_end(&args)?;
    Ok(())
}
