use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::time::{timeout, Duration};

// Windows 平台：隐藏控制台窗口的创建标志
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Error type for all git operations.
#[derive(Debug, thiserror::Error)]
pub enum GitError {
    #[error("Git process error: {0}")]
    ProcessError(String),

    #[error("Git command error: {0}")]
    CommandError(String),

    #[error("Git parse error: {0}")]
    ParseError(String),

    #[error("Git operation timed out")]
    Timeout,

    #[error("Git operation cancelled")]
    Cancelled,
}

impl From<std::io::Error> for GitError {
    fn from(err: std::io::Error) -> Self {
        GitError::ProcessError(err.to_string())
    }
}

/// A bridge to the git CLI. All git sub-commands go through this struct.
#[derive(Debug, Clone)]
pub struct GitCommand {
    pub repo_path: String,
}

impl GitCommand {
    pub fn new(repo_path: impl Into<String>) -> Self {
        Self {
            repo_path: repo_path.into(),
        }
    }

    /// Build a base `Command` with global flags: --no-pager -c core.quotepath=off
    fn base_cmd(&self) -> Command {
        let mut cmd = Command::new("git");
        cmd.arg("--no-pager")
            .arg("-c")
            .arg("core.quotepath=off")
            .current_dir(&self.repo_path)
            .env("GIT_TERMINAL_PROMPT", "0");

        // Windows: 隐藏控制台窗口，防止弹出 CMD 黑窗口
        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);

        cmd
    }

    // ------------------------------------------------------------------
    // Execution modes
    // ------------------------------------------------------------------

    /// Execute a git command asynchronously, streaming stdout/stderr via callbacks.
    /// Returns the exit code on success.
    pub async fn exec_async<F, E>(
        &self,
        args: &[&str],
        on_stdout: F,
        on_stderr: E,
    ) -> Result<(), GitError>
    where
        F: Fn(String),
        E: Fn(String),
    {
        let mut cmd = self.base_cmd();
        cmd.args(args);

        cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

        let mut child = cmd.spawn().map_err(|e| GitError::ProcessError(e.to_string()))?;

        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| GitError::ProcessError("Failed to capture stdout".into()))?;
        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| GitError::ProcessError("Failed to capture stderr".into()))?;

        let mut stdout_reader = BufReader::new(stdout).lines();
        let mut stderr_reader = BufReader::new(stderr).lines();

        let mut stdout_done = false;
        let mut stderr_done = false;

        loop {
            tokio::select! {
                line = stdout_reader.next_line(), if !stdout_done => {
                    match line {
                        Ok(Some(line)) => on_stdout(line),
                        Ok(None) => { stdout_done = true; }
                        Err(e) => return Err(GitError::ProcessError(e.to_string())),
                    }
                }
                line = stderr_reader.next_line(), if !stderr_done => {
                    match line {
                        Ok(Some(line)) => on_stderr(line),
                        Ok(None) => { stderr_done = true; }
                        Err(e) => return Err(GitError::ProcessError(e.to_string())),
                    }
                }
                _ = tokio::task::yield_now(), if stdout_done && stderr_done => {
                    // Both streams finished; just wait for the process to exit.
                    let status = child.wait().await
                        .map_err(|e| GitError::ProcessError(e.to_string()))?;
                    if status.success() {
                        return Ok(());
                    } else {
                        return Err(GitError::CommandError(format!(
                            "git {} exited with code {}",
                            args.join(" "),
                            status.code().unwrap_or(-1)
                        )));
                    }
                }
            }
        }
    }

    /// Execute a git command synchronously (blocking), read all stdout to end.
    pub fn read_to_end(&self, args: &[&str]) -> Result<String, GitError> {
        use std::process::Command as StdCommand;
        use std::time::Instant;

        let mut cmd = StdCommand::new("git");
        cmd.arg("--no-pager")
            .arg("-c")
            .arg("core.quotepath=off")
            .args(args)
            .current_dir(&self.repo_path)
            .env("GIT_TERMINAL_PROMPT", "0")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        // Windows: 隐藏控制台窗口，防止弹出 CMD 黑窗口
        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);

        let start = Instant::now();

        let output = cmd
            .output()
            .map_err(|e| GitError::ProcessError(e.to_string()))?;

        let elapsed = start.elapsed().as_millis() as u64;

        let exit_code = output.status.code().unwrap_or(-1);
        let stdout_str = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr_str = String::from_utf8_lossy(&output.stderr).to_string();

        // Record command log
        let entry = crate::git::command_log::create_log_entry(
            "git",
            args,
            &self.repo_path,
            exit_code,
            elapsed,
            &stdout_str,
            &stderr_str,
        );
        crate::git::command_log::log_command(entry);

        if output.status.success() {
            Ok(stdout_str)
        } else {
            Err(GitError::CommandError(stderr_str))
        }
    }

    /// Execute a git command asynchronously, read all stdout to end.
    /// Includes a 60-second timeout to prevent hanging on large operations.
    pub async fn read_to_end_async(&self, args: &[&str]) -> Result<String, GitError> {
        let mut cmd = self.base_cmd();
        cmd.args(args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        let start = std::time::Instant::now();

        let result = timeout(Duration::from_secs(60), cmd.output()).await;
        match result {
            Ok(Ok(output)) => {
                let elapsed = start.elapsed().as_millis() as u64;
                let exit_code = output.status.code().unwrap_or(-1);
                let stdout_str = String::from_utf8_lossy(&output.stdout).to_string();
                let stderr_str = String::from_utf8_lossy(&output.stderr).to_string();

                // Record command log
                let entry = crate::git::command_log::create_log_entry(
                    "git",
                    args,
                    &self.repo_path,
                    exit_code,
                    elapsed,
                    &stdout_str,
                    &stderr_str,
                );
                crate::git::command_log::log_command(entry);

                if output.status.success() {
                    Ok(stdout_str)
                } else {
                    Err(GitError::CommandError(stderr_str))
                }
            }
            Ok(Err(e)) => Err(GitError::ProcessError(e.to_string())),
            Err(_) => Err(GitError::Timeout),
        }
    }
}
