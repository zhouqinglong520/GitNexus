use crate::git::command::{GitCommand, GitError};
use crate::models::RepositoryStats;

/// Get repository statistics.
pub fn get_statistics(path: &str) -> Result<RepositoryStats, GitError> {
    let git = GitCommand::new(path);

    // Total commits
    let total_commits = git
        .read_to_end(&["rev-list", "--count", "HEAD"])
        .map(|s| s.trim().parse::<u64>().unwrap_or(0))
        .unwrap_or(0);

    // Total authors
    let total_authors = git
        .read_to_end(&["shortlog", "-sn", "HEAD"])
        .map(|s| s.lines().count() as u64)
        .unwrap_or(0);

    // Total branches
    let total_branches = git
        .read_to_end(&["branch", "-a"])
        .map(|s| {
            s.lines()
                .filter(|l| !l.trim().is_empty())
                .count() as u64
        })
        .unwrap_or(0);

    // Total tags
    let total_tags = git
        .read_to_end(&["tag"])
        .map(|s| {
            s.lines()
                .filter(|l| !l.trim().is_empty())
                .count() as u64
        })
        .unwrap_or(0);

    // Total files tracked by git
    let total_files = git
        .read_to_end(&["ls-files"])
        .map(|s| {
            s.lines()
                .filter(|l| !l.trim().is_empty())
                .count() as u64
        })
        .unwrap_or(0);

    // Repository size in bytes (using git count-objects)
    let repo_size = git
        .read_to_end(&["count-objects", "-vH"])
        .map(|s| {
            for line in s.lines() {
                if let Some(size_str) = line.strip_prefix("size:") {
                    // size is in KiB, convert to bytes
                    if let Ok(kib) = size_str.trim().parse::<f64>() {
                        return (kib * 1024.0).round() as u64;
                    }
                }
                // Some git versions use "size-pack:"
                if let Some(size_str) = line.strip_prefix("size-pack:") {
                    if let Ok(kib) = size_str.trim().parse::<f64>() {
                        return (kib * 1024.0).round() as u64;
                    }
                }
            }
            0
        })
        .unwrap_or(0);

    Ok(RepositoryStats {
        total_commits,
        total_authors,
        total_branches,
        total_tags,
        total_files,
        repo_size,
    })
}
