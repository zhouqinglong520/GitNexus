use crate::git::command::{GitCommand, GitError};
use crate::models::LfsLock;
use std::process::Command as StdCommand;
use std::path::Path;

/// Check if git-lfs is available on the system.
pub fn is_lfs_available() -> bool {
    StdCommand::new("git")
        .arg("lfs")
        .arg("version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Track a file pattern with Git LFS.
///
/// Equivalent to `git lfs track <pattern>`.
pub fn track(path: &str, pattern: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["lfs", "track", pattern])?;
    Ok(())
}

/// Untrack a file pattern from Git LFS.
///
/// Equivalent to `git lfs untrack <pattern>`.
pub fn untrack(path: &str, pattern: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["lfs", "untrack", pattern])?;
    Ok(())
}

/// Get the list of tracked patterns from .gitattributes.
///
/// Reads the .gitattributes file and returns lines that contain `filter=lfs`.
pub fn list_tracks(path: &str) -> Result<Vec<String>, GitError> {
    let gitattributes = Path::new(path).join(".gitattributes");
    if !gitattributes.exists() {
        return Ok(Vec::new());
    }

    let content = std::fs::read_to_string(&gitattributes)
        .map_err(|e| GitError::CommandError(format!("Failed to read .gitattributes: {}", e)))?;

    let patterns: Vec<String> = content
        .lines()
        .filter(|line| line.contains("filter=lfs"))
        .map(|line| line.trim().to_string())
        .collect();

    Ok(patterns)
}

/// Fetch LFS objects from a remote.
///
/// Equivalent to `git lfs fetch [remote] [--include=<pattern>] [--exclude=<pattern>]`.
pub fn lfs_fetch(
    path: &str,
    remote: Option<&str>,
    include: Option<&str>,
    exclude: Option<&str>,
) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    let mut args: Vec<String> = vec!["lfs".to_string(), "fetch".to_string()];

    if let Some(r) = remote {
        args.push(r.to_string());
    }
    if let Some(inc) = include {
        args.push(format!("--include={}", inc));
    }
    if let Some(exc) = exclude {
        args.push(format!("--exclude={}", exc));
    }

    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    git.read_to_end(&args_ref)?;
    Ok(())
}

/// Fetch and checkout LFS objects from a remote.
///
/// Equivalent to `git lfs pull [remote] [--include=<pattern>] [--exclude=<pattern>]`.
pub fn lfs_pull(
    path: &str,
    remote: Option<&str>,
    include: Option<&str>,
    exclude: Option<&str>,
) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    let mut args: Vec<String> = vec!["lfs".to_string(), "pull".to_string()];

    if let Some(r) = remote {
        args.push(r.to_string());
    }
    if let Some(inc) = include {
        args.push(format!("--include={}", inc));
    }
    if let Some(exc) = exclude {
        args.push(format!("--exclude={}", exc));
    }

    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    git.read_to_end(&args_ref)?;
    Ok(())
}

/// Push LFS objects to a remote.
///
/// Equivalent to `git lfs push [remote] [--include=<pattern>] [--exclude=<pattern>] [--all]`.
pub fn lfs_push(
    path: &str,
    remote: Option<&str>,
    include: Option<&str>,
    exclude: Option<&str>,
    all: bool,
) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    let mut args: Vec<String> = vec!["lfs".to_string(), "push".to_string()];

    if let Some(r) = remote {
        args.push(r.to_string());
    }
    if let Some(inc) = include {
        args.push(format!("--include={}", inc));
    }
    if let Some(exc) = exclude {
        args.push(format!("--exclude={}", exc));
    }
    if all {
        args.push("--all".to_string());
    }

    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    git.read_to_end(&args_ref)?;
    Ok(())
}

/// Prune unreferenced LFS objects.
///
/// Equivalent to `git lfs prune [--dry-run]`.
/// Returns the output of the prune command.
pub fn lfs_prune(path: &str, dry_run: bool) -> Result<String, GitError> {
    let git = GitCommand::new(path);
    let mut args: Vec<&str> = vec!["lfs", "prune"];

    if dry_run {
        args.push("--dry-run");
    }

    git.read_to_end(&args)
}

/// Lock a file using Git LFS.
///
/// Equivalent to `git lfs lock <file>`.
pub fn lfs_lock(path: &str, file: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["lfs", "lock", file])?;
    Ok(())
}

/// Unlock a file using Git LFS.
///
/// Equivalent to `git lfs unlock <file> [--force]`.
pub fn lfs_unlock(path: &str, file: &str, force: bool) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    let mut args: Vec<&str> = vec!["lfs", "unlock"];

    if force {
        args.push("--force");
    }

    // We need to push the file path last
    let mut all_args: Vec<String> = args.iter().map(|s| s.to_string()).collect();
    all_args.push(file.to_string());
    let args_ref: Vec<&str> = all_args.iter().map(|s| s.as_str()).collect();
    git.read_to_end(&args_ref)?;
    Ok(())
}

/// List LFS locks.
///
/// Equivalent to `git lfs locks`.
/// Parses the output into a list of LfsLock structs.
pub fn list_locks(path: &str) -> Result<Vec<LfsLock>, GitError> {
    let git = GitCommand::new(path);
    let output = git.read_to_end(&["lfs", "locks"])?;

    let mut locks = Vec::new();
    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        // Parse lines of the form:
        // <file>\t<locked_by>\t<locked_at>
        // or handle variations
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.is_empty() {
            continue;
        }

        let file = parts[0].trim().to_string();
        let locked_by = if parts.len() > 1 {
            let by = parts[1].trim();
            if by.is_empty() || by == "-" {
                None
            } else {
                Some(by.to_string())
            }
        } else {
            None
        };
        let locked_at = if parts.len() > 2 {
            let at = parts[2].trim();
            if at.is_empty() || at == "-" {
                None
            } else {
                Some(at.to_string())
            }
        } else {
            None
        };

        locks.push(LfsLock {
            file,
            locked_by,
            locked_at,
        });
    }

    Ok(locks)
}
