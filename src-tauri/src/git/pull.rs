use crate::git::command::{GitCommand, GitError};

/// Pull from a remote.
pub async fn pull<F>(
    path: &str,
    remote: Option<&str>,
    branch: Option<&str>,
    rebase: bool,
    ff_only: bool,
    autostash: bool,
    on_output: F,
) -> Result<(), GitError>
where
    F: Fn(String) + Send + 'static,
{
    let git = GitCommand::new(path);

    let mut args: Vec<&str> = vec!["pull", "--progress"];
    if rebase {
        args.push("--rebase");
    }
    if ff_only {
        args.push("--ff-only");
    }
    if autostash {
        args.push("--autostash");
    }
    if let Some(r) = remote {
        args.push(r);
    }
    if let Some(b) = branch {
        args.push(b);
    }

    git.exec_async(&args, on_output, |_line| {}).await
}
