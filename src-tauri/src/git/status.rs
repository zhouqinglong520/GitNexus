use crate::git::command::{GitCommand, GitError};
use crate::models::{Change, ChangeStatus, WorktreeStatus};

/// Get the working tree status using `git status --porcelain=v2`.
pub fn get_status(path: &str) -> Result<WorktreeStatus, GitError> {
    let git = GitCommand::new(path);

    let output = git.read_to_end(&["status", "--porcelain=v2", "--branch"])?;

    let mut branch = String::new();
    let mut ahead: u32 = 0;
    let mut behind: u32 = 0;
    let mut changes: Vec<Change> = Vec::new();
    let mut untracked_files: Vec<String> = Vec::new();

    for line in output.lines() {
        if line.is_empty() {
            continue;
        }

        if line.starts_with("#") {
            // Branch info line
            if line.starts_with("# branch.head ") {
                branch = line[14..].to_string();
            } else if line.starts_with("# branch.ab ") {
                let parts: Vec<&str> = line[12..].split_whitespace().collect();
                if parts.len() == 2 {
                    ahead = parts[0].parse().unwrap_or(0);
                    behind = parts[1].parse().unwrap_or(0);
                }
            }
            continue;
        }

        if line.starts_with("?") {
            // Untracked
            let rest = &line[2..];
            let parts: Vec<&str> = rest.splitn(2, ' ').collect();
            if parts.len() == 2 {
                let file_path = parts[1].to_string();
                untracked_files.push(file_path.clone());
                changes.push(Change {
                    path: file_path,
                    old_path: None,
                    status: ChangeStatus::Untracked,
                    staged: false,
                });
            }
            continue;
        }

        // Ordinary / rename / copy changes
        if line.starts_with('1') || line.starts_with('2') {
            let is_rename_or_copy = line.starts_with('2');
            // Format: XY sub mH mI mW hH hI eN eA eD eR path [old_path]
            // All fields are always present; path is the last element.
            // For renames/copies, the format has an additional old_path field.
            let rest = &line[2..];
            let fields: Vec<&str> = rest.split_whitespace().collect();
            if fields.len() >= 12 {
                let xy = fields[0];
                let x = xy.chars().next().unwrap_or(' ');
                let y = xy.chars().nth(1).unwrap_or(' ');

                let staged = x != '.' && x != ' ' && x != '?';
                let status = parse_change_status(if staged { x } else { y });

                let file_path = fields.last().unwrap().to_string();
                let old_path = if is_rename_or_copy && fields.len() > 12 {
                    Some(fields[fields.len() - 2].to_string())
                } else {
                    None
                };

                changes.push(Change {
                    path: file_path,
                    old_path,
                    status,
                    staged,
                });
            }
            continue;
        }

        // Unmerged entries (u)
        // Format: XY sub mH mI mW hH hI path
        if line.starts_with('u') {
            let rest = &line[2..];
            let fields: Vec<&str> = rest.split_whitespace().collect();
            if !fields.is_empty() {
                let file_path = fields.last().unwrap().to_string();
                changes.push(Change {
                    path: file_path,
                    old_path: None,
                    status: ChangeStatus::Conflicted,
                    staged: false,
                });
            }
            continue;
        }
    }

    Ok(WorktreeStatus {
        branch,
        ahead,
        behind,
        changes,
        untracked_files,
    })
}

fn parse_change_status(c: char) -> ChangeStatus {
    match c {
        'A' => ChangeStatus::Added,
        'D' => ChangeStatus::Deleted,
        'M' => ChangeStatus::Modified,
        'R' => ChangeStatus::Renamed,
        'C' => ChangeStatus::Copied,
        '?' => ChangeStatus::Untracked,
        '!' => ChangeStatus::Ignored,
        'U' => ChangeStatus::Unmerged,
        _ => ChangeStatus::Modified,
    }
}
