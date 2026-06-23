use crate::git::command::GitError;
use crate::models::InProgressState;
use std::path::Path;

/// Detect in-progress Git operations by checking state files in `.git/`.
pub fn get_in_progress(path: &str) -> Result<InProgressState, GitError> {
    let git_dir = Path::new(path).join(".git");

    if !git_dir.exists() {
        return Err(GitError::CommandError(format!(
            "Not a git repository: {}",
            path
        )));
    }

    // Check for merge state
    if git_dir.join("MERGE_HEAD").exists() {
        let merge_head = std::fs::read_to_string(git_dir.join("MERGE_HEAD"))
            .unwrap_or_default()
            .trim()
            .to_string();
        return Ok(InProgressState {
            operation: "merge".to_string(),
            detail: Some(format!("Merging with {}", merge_head)),
        });
    }

    // Check for rebase state (rebase-merge or rebase-apply)
    if git_dir.join("rebase-merge").exists() || git_dir.join("rebase-apply").exists() {
        let rebase_dir = if git_dir.join("rebase-merge").exists() {
            git_dir.join("rebase-merge")
        } else {
            git_dir.join("rebase-apply")
        };

        let onto = std::fs::read_to_string(rebase_dir.join("onto"))
            .unwrap_or_default()
            .trim()
            .to_string();

        let msg_head = rebase_dir.join("msgnum");
        let msg_total = rebase_dir.join("end");
        let step_info = if msg_head.exists() && msg_total.exists() {
            let current = std::fs::read_to_string(&msg_head)
                .unwrap_or_default()
                .trim()
                .to_string();
            let total = std::fs::read_to_string(&msg_total)
                .unwrap_or_default()
                .trim()
                .to_string();
            format!("step {}/{}", current, total)
        } else {
            String::new()
        };

        let detail = if !onto.is_empty() && !step_info.is_empty() {
            format!("Rebasing onto {} ({})", onto, step_info)
        } else if !onto.is_empty() {
            format!("Rebasing onto {}", onto)
        } else {
            step_info
        };

        return Ok(InProgressState {
            operation: "rebase".to_string(),
            detail: if detail.is_empty() {
                None
            } else {
                Some(detail)
            },
        });
    }

    // Check for cherry-pick state
    if git_dir.join("CHERRY_PICK_HEAD").exists() {
        let cherry_pick_head = std::fs::read_to_string(git_dir.join("CHERRY_PICK_HEAD"))
            .unwrap_or_default()
            .trim()
            .to_string();
        return Ok(InProgressState {
            operation: "cherry-pick".to_string(),
            detail: Some(format!("Cherry-picking {}", cherry_pick_head)),
        });
    }

    // Check for revert state
    if git_dir.join("REVERT_HEAD").exists() {
        let revert_head = std::fs::read_to_string(git_dir.join("REVERT_HEAD"))
            .unwrap_or_default()
            .trim()
            .to_string();
        return Ok(InProgressState {
            operation: "revert".to_string(),
            detail: Some(format!("Reverting {}", revert_head)),
        });
    }

    // Check for bisect state
    if git_dir.join("BISECT_LOG").exists() {
        return Ok(InProgressState {
            operation: "bisect".to_string(),
            detail: Some("Bisect in progress".to_string()),
        });
    }

    // No in-progress operation
    Ok(InProgressState {
        operation: String::new(),
        detail: None,
    })
}
