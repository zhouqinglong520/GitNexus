use crate::git::command::{GitCommand, GitError};

/// Merge a branch into the current branch.
pub async fn merge(
    path: &str,
    branch: &str,
    strategy: Option<&str>,
    ff_mode: Option<&str>,
) -> Result<(), GitError> {
    let git = GitCommand::new(path);

    let mut args: Vec<&str> = vec!["merge"];
    if let Some(s) = strategy {
        args.push("--strategy");
        args.push(s);
    }
    if let Some(ff) = ff_mode {
        match ff {
            "ff" => args.push("--ff"),
            "no-ff" => args.push("--no-ff"),
            "ff-only" => args.push("--ff-only"),
            _ => {}
        }
    }
    args.push(branch);

    git.read_to_end_async(&args).await?;
    Ok(())
}

/// Abort the current merge.
pub fn abort_merge(path: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["merge", "--abort"])?;
    Ok(())
}
