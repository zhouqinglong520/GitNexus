use crate::git::command::{GitCommand, GitError};

/// Start a rebase operation.
pub async fn rebase<F>(
    path: &str,
    onto: Option<&str>,
    branch: Option<&str>,
    on_output: F,
) -> Result<(), GitError>
where
    F: Fn(String) + Send + 'static,
{
    let git = GitCommand::new(path);

    let mut args: Vec<&str> = vec!["rebase"];
    if let Some(o) = onto {
        args.push("--onto");
        args.push(o);
    }
    if let Some(b) = branch {
        args.push(b);
    }

    git.exec_async(&args, on_output, |_line| {}).await
}

/// Continue a rebase after resolving conflicts.
pub fn rebase_continue(path: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["rebase", "--continue"])?;
    Ok(())
}

/// Skip the current commit during rebase.
pub fn rebase_skip(path: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["rebase", "--skip"])?;
    Ok(())
}

/// Abort the current rebase.
pub fn rebase_abort(path: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["rebase", "--abort"])?;
    Ok(())
}
