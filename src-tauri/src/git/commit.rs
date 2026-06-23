use crate::git::command::{GitCommand, GitError};

/// Create a commit.
pub fn commit(
    path: &str,
    message: &str,
    amend: bool,
    signoff: bool,
    no_verify: bool,
) -> Result<String, GitError> {
    let git = GitCommand::new(path);

    let mut args: Vec<&str> = vec!["commit"];
    if amend {
        args.push("--amend");
    }
    if signoff {
        args.push("--signoff");
    }
    if no_verify {
        args.push("--no-verify");
    }
    args.push("-m");
    args.push(message);

    let _output = git.read_to_end(&args)?;

    // Use rev-parse HEAD to reliably obtain the SHA of the new commit.
    let sha = git
        .read_to_end(&["rev-parse", "HEAD"])
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    Ok(sha)
}

/// Stage files (git add).
pub fn stage(path: &str, files: &[String]) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    let mut args: Vec<&str> = vec!["add", "--"];
    for f in files {
        args.push(f);
    }
    git.read_to_end(&args)?;
    Ok(())
}

/// Unstage files (git reset HEAD --).
pub fn unstage(path: &str, files: &[String]) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    let mut args: Vec<&str> = vec!["reset", "HEAD", "--"];
    for f in files {
        args.push(f);
    }
    git.read_to_end(&args)?;
    Ok(())
}

/// Stage all changes.
pub fn stage_all(path: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["add", "-A"])?;
    Ok(())
}

/// Unstage all changes.
pub fn unstage_all(path: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["reset", "HEAD"])?;
    Ok(())
}
