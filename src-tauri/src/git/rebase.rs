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

/// Edit the commit message during a rebase by amending the current commit
/// and continuing the rebase.
pub fn rebase_edit_message(path: &str, message: String) -> Result<(), GitError> {
    let git = GitCommand::new(path);

    // Amend the current commit with the new message
    git.read_to_end(&["commit", "--amend", "-m", &message])?;

    // Continue the rebase
    git.read_to_end(&["rebase", "--continue"])?;

    Ok(())
}

/// Start an interactive rebase with a custom todo list.
/// The `todo_text` parameter contains the full rebase-todo content (e.g. "pick abc123 ...\nreword def456 ...\n").
/// Uses GIT_SEQUENCE_EDITOR to replace the default todo file with the custom content.
pub async fn start_interactive_rebase_with_todos<F>(
    path: &str,
    onto: &str,
    todo_text: &str,
    on_output: F,
) -> Result<(), GitError>
where
    F: Fn(String) + Send + 'static,
{
    // Build a shell command that writes our custom todo content into the file
    // that git provides via $1 argument to GIT_SEQUENCE_EDITOR.
    // To avoid shell injection, we write the todo text to a temp file first,
    // then copy it to overwrite the git todo file.
    // Use a unique filename based on nanosecond timestamp to avoid race conditions
    // when multiple rebase operations run concurrently.
    let temp_dir = std::env::temp_dir();
    let unique_id = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let temp_file = temp_dir.join(format!("git-rebase-todo-{}", unique_id));
    std::fs::write(&temp_file, todo_text)
        .map_err(|e| GitError::ProcessError(format!("Failed to write temp todo file: {}", e)))?;

    #[cfg(target_os = "windows")]
    let editor_script = format!("cmd /C copy \"{}\" \"%1\"", temp_file.display());
    #[cfg(not(target_os = "windows"))]
    let editor_script = format!("cp {} \"$1\"", temp_file.display());

    let mut cmd = tokio::process::Command::new("git");
    cmd.arg("--no-pager")
        .arg("-c")
        .arg("core.quotepath=off")
        .current_dir(path)
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_SEQUENCE_EDITOR", &editor_script)
        .args(&["rebase", "-i", onto])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    let output = cmd
        .output()
        .await
        .map_err(|e| GitError::ProcessError(e.to_string()))?;

    // Clean up temp file
    let _ = std::fs::remove_file(&temp_file);

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
