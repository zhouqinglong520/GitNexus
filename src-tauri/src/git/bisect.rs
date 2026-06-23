use crate::git::command::{GitCommand, GitError};
use crate::models::{BisectResult, BisectState};

/// Start a git bisect session.
///
/// If `bad` and `good` are provided, starts bisect with those revisions.
/// Otherwise, just initializes the bisect state.
pub fn bisect_start(path: &str, bad: Option<&str>, good: Option<&str>) -> Result<(), GitError> {
    let git = GitCommand::new(path);

    match (bad, good) {
        (Some(b), Some(g)) => {
            git.read_to_end(&["bisect", "start", b, g])?;
        }
        (Some(b), None) => {
            git.read_to_end(&["bisect", "start", b])?;
        }
        (None, Some(g)) => {
            git.read_to_end(&["bisect", "start", g])?;
        }
        (None, None) => {
            git.read_to_end(&["bisect", "start"])?;
        }
    }

    Ok(())
}

/// Mark a commit as good, bad, or skip during bisect.
///
/// Returns a `BisectResult` with the output and current state.
pub fn bisect_mark(
    path: &str,
    state: &str,
    revision: Option<&str>,
) -> Result<BisectResult, GitError> {
    let git = GitCommand::new(path);

    let output = match revision {
        Some(rev) => git.read_to_end(&["bisect", state, rev])?,
        None => git.read_to_end(&["bisect", state])?,
    };

    // Parse the output to determine bisect state
    let is_finished = output.contains("first bad commit") || output.contains("bisect run successful");

    let found_commit = if is_finished {
        extract_first_bad_commit(&output)
    } else {
        None
    };

    let current_commit = if !is_finished {
        extract_current_commit(&output)
    } else {
        None
    };

    Ok(BisectResult {
        output: output.trim().to_string(),
        current_commit,
        is_finished,
        found_commit,
    })
}

/// Reset the bisect state, returning to the original branch.
pub fn bisect_reset(path: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["bisect", "reset"])?;
    Ok(())
}

/// Get the bisect log as a string.
pub fn bisect_log(path: &str) -> Result<String, GitError> {
    let git = GitCommand::new(path);
    let output = git.read_to_end(&["bisect", "log"])?;
    Ok(output.trim().to_string())
}

/// Get the current bisect state by parsing the bisect log.
///
/// Returns `None` if bisect is not currently active.
pub fn bisect_status(path: &str) -> Result<Option<BisectState>, GitError> {
    let git = GitCommand::new(path);

    // Check if bisect is active by looking for BISECT_HEAD
    let bisect_head = git.read_to_end(&["rev-parse", "--verify", "BISECT_HEAD"]);
    if bisect_head.is_err() {
        return Ok(None);
    }

    let current_commit = bisect_head.map(|s| s.trim().to_string()).ok();

    // Get the bisect log to parse good/bad/skip revisions
    let log_output = git.read_to_end(&["bisect", "log"]).unwrap_or_default();

    let mut good_revisions = Vec::new();
    let mut bad_revisions = Vec::new();
    let mut skipped_revisions = Vec::new();

    for line in log_output.lines() {
        let line = line.trim();
        if line.starts_with("git bisect good") {
            // Extract the revision hash
            let parts: Vec<&str> = line.split_whitespace().collect();
            if let Some(&rev) = parts.last() {
                good_revisions.push(rev.to_string());
            }
        } else if line.starts_with("git bisect bad") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if let Some(&rev) = parts.last() {
                bad_revisions.push(rev.to_string());
            }
        } else if line.starts_with("git bisect skip") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if let Some(&rev) = parts.last() {
                skipped_revisions.push(rev.to_string());
            }
        }
    }

    let total_revisions = (good_revisions.len() + bad_revisions.len() + skipped_revisions.len()) as u32;
    let tested_revisions = total_revisions;

    Ok(Some(BisectState {
        good_revisions,
        bad_revisions,
        skipped_revisions,
        current_commit,
        total_revisions,
        tested_revisions,
    }))
}

// ============================================================
// Helper functions
// ============================================================

/// Extract the first bad commit hash from bisect output.
fn extract_first_bad_commit(output: &str) -> Option<String> {
    for line in output.lines() {
        let line = line.trim();
        if line.contains("first bad commit") {
            // Format: "<hash> is the first bad commit"
            if let Some(hash) = line.split_whitespace().next() {
                return Some(hash.to_string());
            }
        }
    }
    None
}

/// Extract the current commit being tested from bisect output.
fn extract_current_commit(output: &str) -> Option<String> {
    for line in output.lines() {
        let line = line.trim();
        // Look for lines like: "Bisecting: 123 revisions left to test after this"
        // or just the commit hash at the start
        if line.starts_with("Bisecting:") {
            continue;
        }
        // The current commit is typically shown as a short hash at the beginning
        if line.len() >= 7 && line.chars().take(7).all(|c| c.is_ascii_hexdigit()) {
            return Some(line.chars().take(7).collect());
        }
    }
    None
}
