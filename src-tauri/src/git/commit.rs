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

/// Stage a hunk (partial file staging) using `git apply --cached`.
/// The `patch_text` should be a complete unified diff hunk for the given file,
/// including the `---`/`+++` headers and the `@@ ... @@` hunk header.
pub fn stage_hunk(path: &str, file: &str, patch_text: &str) -> Result<(), GitError> {
    use std::io::Write;

    // Build a complete patch with file headers so `git apply` can parse it.
    // We use /dev/null for new files and the actual file path for existing files.
    let full_patch = format!(
        "diff --git a/{file} b/{file}\n{patch_text}",
        file = file,
        patch_text = patch_text.trim(),
    );

    let mut cmd = std::process::Command::new("git");
    cmd.arg("--no-pager")
        .arg("-c")
        .arg("core.quotepath=off")
        .arg("apply")
        .arg("--cached")
        .current_dir(path)
        .env("GIT_TERMINAL_PROMPT", "0")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| GitError::ProcessError(e.to_string()))?;

    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(full_patch.as_bytes());
    }

    let output = child
        .wait_with_output()
        .map_err(|e| GitError::ProcessError(e.to_string()))?;

    if output.status.success() {
        Ok(())
    } else {
        Err(GitError::CommandError(
            String::from_utf8_lossy(&output.stderr).to_string(),
        ))
    }
}

/// Unstage a hunk using `git apply --cached --reverse`.
/// The `patch_text` should be the same patch text that was used to stage the hunk.
pub fn unstage_hunk(path: &str, file: &str, patch_text: &str) -> Result<(), GitError> {
    use std::io::Write;

    let full_patch = format!(
        "diff --git a/{file} b/{file}\n{patch_text}",
        file = file,
        patch_text = patch_text.trim(),
    );

    let mut cmd = std::process::Command::new("git");
    cmd.arg("--no-pager")
        .arg("-c")
        .arg("core.quotepath=off")
        .arg("apply")
        .arg("--cached")
        .arg("--reverse")
        .current_dir(path)
        .env("GIT_TERMINAL_PROMPT", "0")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| GitError::ProcessError(e.to_string()))?;

    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(full_patch.as_bytes());
    }

    let output = child
        .wait_with_output()
        .map_err(|e| GitError::ProcessError(e.to_string()))?;

    if output.status.success() {
        Ok(())
    } else {
        Err(GitError::CommandError(
            String::from_utf8_lossy(&output.stderr).to_string(),
        ))
    }
}
