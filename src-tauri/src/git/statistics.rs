use crate::git::command::{GitCommand, GitError};
use crate::models::RepositoryStats;

/// Get repository statistics.
/// Runs all git commands in parallel using tokio::task::spawn_blocking.
/// If `since` is provided, filters commits to those after the given date (e.g. "2024-01-01").
pub async fn get_statistics(path: &str, since: Option<&str>) -> Result<RepositoryStats, GitError> {
    let path1 = path.to_string();
    let path2 = path.to_string();
    let path3 = path.to_string();
    let path4 = path.to_string();
    let path5 = path.to_string();
    let path6 = path.to_string();
    let path7 = path.to_string();
    let path8 = path.to_string();
    let path9 = path.to_string();
    let path10 = path.to_string();
    let path11 = path.to_string();

    let since_owned = since.map(|s| s.to_string());
    let since_clone = since_owned.clone();
    let since_owned3 = since.map(|s| s.to_string());
    let since_owned4 = since.map(|s| s.to_string());

    let (total_commits, total_authors, total_branches, total_tags, total_remotes, total_stashes, total_worktrees, first_commit_time, last_commit_time, total_insertions, total_deletions) = tokio::join!(
        tokio::task::spawn_blocking(move || {
            let git = GitCommand::new(&path1);
            let since_arg;
            let args: Vec<&str> = match &since_owned {
                Some(s) => {
                    since_arg = format!("--since={}", s);
                    vec!["rev-list", "--count", &since_arg, "HEAD"]
                }
                None => vec!["rev-list", "--count", "HEAD"],
            };
            git.read_to_end(&args)
                .map(|s| s.trim().parse::<u64>().unwrap_or(0))
                .unwrap_or(0)
        }),
        tokio::task::spawn_blocking(move || {
            let git = GitCommand::new(&path2);
            let since_arg;
            let args: Vec<&str> = match &since_clone {
                Some(s) => {
                    since_arg = format!("--since={}", s);
                    vec!["shortlog", "-sn", &since_arg, "HEAD"]
                }
                None => vec!["shortlog", "-sn", "HEAD"],
            };
            git.read_to_end(&args)
                .map(|s| s.lines().count() as u64)
                .unwrap_or(0)
        }),
        tokio::task::spawn_blocking(move || {
            let git = GitCommand::new(&path3);
            git.read_to_end(&["branch", "-a"])
                .map(|s| {
                    s.lines()
                        .filter(|l| !l.trim().is_empty())
                        .count() as u64
                })
                .unwrap_or(0)
        }),
        tokio::task::spawn_blocking(move || {
            let git = GitCommand::new(&path4);
            git.read_to_end(&["tag"])
                .map(|s| {
                    s.lines()
                        .filter(|l| !l.trim().is_empty())
                        .count() as u64
                })
                .unwrap_or(0)
        }),
        tokio::task::spawn_blocking(move || {
            let git = GitCommand::new(&path5);
            git.read_to_end(&["remote"])
                .map(|s| {
                    s.lines()
                        .filter(|l| !l.trim().is_empty())
                        .count() as u64
                })
                .unwrap_or(0)
        }),
        tokio::task::spawn_blocking(move || {
            let git = GitCommand::new(&path6);
            git.read_to_end(&["stash", "list"])
                .map(|s| {
                    s.lines()
                        .filter(|l| !l.trim().is_empty())
                        .count() as u64
                })
                .unwrap_or(0)
        }),
        tokio::task::spawn_blocking(move || {
            let git = GitCommand::new(&path7);
            git.read_to_end(&["worktree", "list"])
                .map(|s| {
                    s.lines()
                        .filter(|l| !l.trim().is_empty())
                        .count() as u64
                })
                .unwrap_or(0)
        }),
        tokio::task::spawn_blocking(move || {
            let git = GitCommand::new(&path8);
            git.read_to_end(&["log", "--reverse", "--format=%at", "-1"])
                .ok()
                .and_then(|s| {
                    let trimmed = s.trim();
                    if trimmed.is_empty() { None } else { trimmed.parse::<i64>().ok() }
                })
        }),
        tokio::task::spawn_blocking(move || {
            let git = GitCommand::new(&path9);
            git.read_to_end(&["log", "-1", "--format=%at"])
                .ok()
                .and_then(|s| {
                    let trimmed = s.trim();
                    if trimmed.is_empty() { None } else { trimmed.parse::<i64>().ok() }
                })
        }),
        tokio::task::spawn_blocking(move || {
            let git = GitCommand::new(&path10);
            let since_arg;
            let args: Vec<&str> = match &since_owned3 {
                Some(s) => {
                    since_arg = format!("--since={}", s);
                    vec!["log", "--shortstat", &since_arg, "--format="]
                }
                None => vec!["log", "--shortstat", "--format="],
            };
            git.read_to_end(&args)
                .map(|s| {
                    let mut total: u64 = 0;
                    for line in s.lines() {
                        if let Some(rest) = line.strip_prefix(" ") {
                            let parts: Vec<&str> = rest.split(", ").collect();
                            for part in parts {
                                if part.contains("insertion") {
                                    total += part.split_whitespace().next()
                                        .and_then(|s| s.parse::<u64>().ok())
                                        .unwrap_or(0);
                                }
                            }
                        }
                    }
                    total
                })
                .unwrap_or(0)
        }),
        tokio::task::spawn_blocking(move || {
            let git = GitCommand::new(&path11);
            let since_arg;
            let args: Vec<&str> = match &since_owned4 {
                Some(s) => {
                    since_arg = format!("--since={}", s);
                    vec!["log", "--shortstat", &since_arg, "--format="]
                }
                None => vec!["log", "--shortstat", "--format="],
            };
            git.read_to_end(&args)
                .map(|s| {
                    let mut total: u64 = 0;
                    for line in s.lines() {
                        if let Some(rest) = line.strip_prefix(" ") {
                            let parts: Vec<&str> = rest.split(", ").collect();
                            for part in parts {
                                if part.contains("deletion") {
                                    total += part.split_whitespace().next()
                                        .and_then(|s| s.parse::<u64>().ok())
                                        .unwrap_or(0);
                                }
                            }
                        }
                    }
                    total
                })
                .unwrap_or(0)
        }),
    );

    Ok(RepositoryStats {
        total_commits: total_commits.unwrap_or(0),
        total_authors: total_authors.unwrap_or(0),
        total_branches: total_branches.unwrap_or(0),
        total_tags: total_tags.unwrap_or(0),
        total_remotes: total_remotes.unwrap_or(0),
        total_stashes: total_stashes.unwrap_or(0),
        total_worktrees: total_worktrees.unwrap_or(0),
        first_commit_time: first_commit_time.unwrap_or(None),
        last_commit_time: last_commit_time.unwrap_or(None),
        total_insertions: total_insertions.unwrap_or(0),
        total_deletions: total_deletions.unwrap_or(0),
    })
}
