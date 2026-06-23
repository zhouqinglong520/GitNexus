use notify::{Event, EventKind, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::mpsc;
use std::time::{Duration, Instant};
use tauri::Emitter;

use crate::git::command::GitError;

/// File change event type emitted to the frontend via Tauri events.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum FsChangeEvent {
    WorkingCopyChanged,
    BranchChanged,
    StashChanged,
    TagChanged,
    SubmoduleChanged,
    ConfigChanged,
}

/// Directories to exclude from working directory watching.
const EXCLUDED_DIRS: &[&str] = &[
    "node_modules",
    "target",
    "dist",
    "build",
    ".next",
    "__pycache__",
    ".venv",
    "vendor",
    ".git",
];

/// Debounce interval in milliseconds.
const DEBOUNCE_MS: u64 = 500;

/// Start a file system watcher for the given repository.
///
/// Watches both the `.git` directory (for branch/stash/tag/config changes)
/// and the working directory (for file changes), emitting classified
/// `FsChangeEvent` payloads through the Tauri event system.
pub fn start_watcher(app_handle: tauri::AppHandle, repo_path: String) -> Result<(), GitError> {
    let repo = std::path::PathBuf::from(&repo_path);
    let git_dir = repo.join(".git");

    if !git_dir.exists() {
        return Err(GitError::CommandError(format!(
            "Not a git repository: {}",
            repo_path
        )));
    }

    let (tx, rx) = mpsc::channel::<Result<Event, notify::Error>>();

    // Create the watcher
    let mut watcher =
        notify::recommended_watcher(tx).map_err(|e| GitError::ProcessError(e.to_string()))?;

    // Watch .git/HEAD, .git/refs/, .git/index, .git/config, .git/modules
    let git_paths_to_watch = [
        git_dir.join("HEAD"),
        git_dir.join("refs"),
        git_dir.join("index"),
        git_dir.join("config"),
        git_dir.join("modules"),
        git_dir.join("stash"),
        git_dir.join("packed-refs"),
    ];

    for path in &git_paths_to_watch {
        if path.exists() {
            if path.is_dir() {
                watcher
                    .watch(path, RecursiveMode::Recursive)
                    .map_err(|e| GitError::ProcessError(e.to_string()))?;
            } else {
                watcher
                    .watch(path, RecursiveMode::NonRecursive)
                    .map_err(|e| GitError::ProcessError(e.to_string()))?;
            }
        }
    }

    // Watch the working directory (non-recursive to avoid deep watches)
    watcher
        .watch(&repo, RecursiveMode::NonRecursive)
        .map_err(|e| GitError::ProcessError(e.to_string()))?;

    // Spawn a thread to process events with debouncing
    std::thread::spawn(move || {
        let mut last_event_time: Option<Instant> = None;
        let mut pending_event: Option<FsChangeEvent> = None;

        loop {
            match rx.recv_timeout(Duration::from_millis(100)) {
                Ok(Ok(event)) => {
                    let classified = classify_event(&event, &repo);
                    if let Some(change) = classified {
                        pending_event = Some(change);
                        last_event_time = Some(Instant::now());
                    }
                }
                Ok(Err(_)) => {
                    // Ignore errors from the watcher
                }
                Err(mpsc::RecvTimeoutError::Timeout) => {
                    // Check if debounce period has elapsed
                    if let Some(last_time) = last_event_time {
                        if last_time.elapsed() >= Duration::from_millis(DEBOUNCE_MS) {
                            if let Some(change) = pending_event.take() {
                                let _ = app_handle.emit("fs-change", change);
                            }
                            last_event_time = None;
                        }
                    }
                }
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    // Channel closed, exit the thread
                    break;
                }
            }
        }
    });

    Ok(())
}

/// Classify a notify event into an FsChangeEvent based on the path.
fn classify_event(event: &Event, repo_path: &Path) -> Option<FsChangeEvent> {
    let path = event.paths.first()?;

    // Only handle Create/Modify/Remove kinds
    match &event.kind {
        EventKind::Create(_)
        | EventKind::Modify(_)
        | EventKind::Remove(_) => {}
        _ => return None,
    }

    let path_str = path.to_string_lossy();
    let git_str = repo_path.join(".git").to_string_lossy().to_string();

    if path_str.starts_with(&git_str) {
        // Event inside .git directory
        let relative = path_str.strip_prefix(&git_str).unwrap_or("");

        if relative.contains("/refs/") || relative == "/HEAD" || relative.contains("packed-refs") {
            return Some(FsChangeEvent::BranchChanged);
        }
        if relative == "/index" {
            return Some(FsChangeEvent::WorkingCopyChanged);
        }
        if relative == "/stash" || relative.contains("/refs/stash") {
            return Some(FsChangeEvent::StashChanged);
        }
        if relative.contains("/refs/tags/") {
            return Some(FsChangeEvent::TagChanged);
        }
        if relative.contains("/modules") {
            return Some(FsChangeEvent::SubmoduleChanged);
        }
        if relative == "/config" {
            return Some(FsChangeEvent::ConfigChanged);
        }
    } else {
        // Event in working directory - check exclusions
        for excluded in EXCLUDED_DIRS {
            if path_str.contains(excluded) {
                return None;
            }
        }
        return Some(FsChangeEvent::WorkingCopyChanged);
    }

    None
}
