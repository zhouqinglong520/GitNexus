use crate::git::command::{GitCommand, GitError};
use crate::models::ConflictFile;

/// Get a list of files with merge conflicts (unmerged entries).
pub fn get_merge_conflicts(path: &str) -> Result<Vec<ConflictFile>, GitError> {
    let git = GitCommand::new(path);

    // Use git ls-files -u to list unmerged files.
    // Output format: <mode> <sha> <stage>\t<file>
    let output = git.read_to_end(&["ls-files", "-u"])?;

    let mut conflicts: Vec<ConflictFile> = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for line in output.lines() {
        if line.is_empty() {
            continue;
        }

        // Parse: "<mode> <sha> <stage>\t<file>"
        if let Some(tab_pos) = line.find('\t') {
            let file_path = line[tab_pos + 1..].to_string();

            // Deduplicate by file path (each conflicted file appears multiple times for different stages)
            if seen.insert(file_path.clone()) {
                conflicts.push(ConflictFile {
                    path: file_path,
                });
            }
        }
    }

    Ok(conflicts)
}
