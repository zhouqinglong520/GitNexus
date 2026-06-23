use crate::git::command::{GitCommand, GitError};

/// Push to a remote, with optional progress callback.
pub async fn push<F>(
    path: &str,
    remote: Option<&str>,
    branch: Option<&str>,
    force: bool,
    force_with_lease: bool,
    set_upstream: bool,
    tags: bool,
    on_progress: F,
) -> Result<(), GitError>
where
    F: Fn(String) + Send + 'static,
{
    let git = GitCommand::new(path);

    let mut args: Vec<&str> = vec!["push", "--progress"];
    if force {
        args.push("--force");
    }
    if force_with_lease {
        args.push("--force-with-lease");
    }
    if set_upstream {
        args.push("--set-upstream");
    }
    if tags {
        args.push("--tags");
    }
    if let Some(r) = remote {
        args.push(r);
    }
    if let Some(b) = branch {
        args.push(b);
    }

    git.exec_async(&args, on_progress, |_line| {}).await
}
