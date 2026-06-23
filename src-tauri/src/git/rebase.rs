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

/// Start an interactive rebase. The `onto` parameter specifies the target commit.
/// Uses GIT_SEQUENCE_EDITOR to automatically accept the default todo list,
/// effectively starting the rebase in a non-interactive manner.
pub async fn start_interactive_rebase<F>(
    path: &str,
    onto: Option<&str>,
    on_output: F,
) -> Result<(), GitError>
where
    F: Fn(String) + Send + 'static,
{
    let mut args: Vec<&str> = vec!["rebase", "-i"];
    if let Some(o) = onto {
        args.push(o);
    }

    // Use "true" as the sequence editor so the rebase proceeds with the default plan
    // without opening an interactive editor. The caller can use the output to monitor progress.
    let mut cmd = tokio::process::Command::new("git");
    cmd.arg("--no-pager")
        .arg("-c")
        .arg("core.quotepath=off")
        .current_dir(path)
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_SEQUENCE_EDITOR", "true")
        .args(&args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    let output = cmd
        .output()
        .await
        .map_err(|e| GitError::ProcessError(e.to_string()))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            on_output(line.to_string());
        }
        Ok(())
    } else {
        Err(GitError::CommandError(
            String::from_utf8_lossy(&output.stderr).to_string(),
        ))
    }
}
