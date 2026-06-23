use crate::git::command::{GitCommand, GitError};
use crate::models::{Commit, CommitDetail};

/// Get commit history for a branch.
pub fn get_commits(
    path: &str,
    branch: Option<&str>,
    limit: u32,
    offset: u32,
) -> Result<Vec<Commit>, GitError> {
    let git = GitCommand::new(path);

    let mut args: Vec<&str> = vec![
        "log",
        "--format=%H%x00%P%x00%D%x00%an%x00%ae%x00%at%x00%s",
    ];

    if let Some(b) = branch {
        args.push(b);
    }

    let offset_str = offset.to_string();
    let limit_str = limit.to_string();
    args.push("--skip");
    args.push(&offset_str);
    args.push("-n");
    args.push(&limit_str);

    let output = git.read_to_end(&args)?;

    let mut commits = Vec::new();
    for line in output.lines() {
        if line.is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split('\0').collect();
        if parts.len() < 7 {
            continue;
        }
        let sha = parts[0].to_string();
        let parents = if parts[1].is_empty() {
            Vec::new()
        } else {
            parts[1].split_whitespace().map(|s| s.to_string()).collect()
        };
        let refs = parts[2].to_string();
        let author_name = parts[3].to_string();
        let author_email = parts[4].to_string();
        let author_time: i64 = parts[5].parse().unwrap_or(0);
        let subject = parts[6].to_string();

        commits.push(Commit {
            sha,
            parents,
            refs,
            author_name,
            author_email,
            author_time,
            subject,
        });
    }

    Ok(commits)
}

/// Get detailed information about a single commit.
pub fn get_commit_detail(path: &str, sha: &str) -> Result<CommitDetail, GitError> {
    let git = GitCommand::new(path);

    let format_str = "%H%x00%P%x00%D%x00%an%x00%ae%x00%at%x00%cn%x00%ce%x00%ct%x00%s%x00%B";
    let output = git.read_to_end(&[
        "log",
        "-1",
        &format!("--format={}", format_str),
        sha,
    ])?;

    // Split by \0 properly
    let parts: Vec<&str> = output.split('\0').collect();
    if parts.len() < 10 {
        return Err(GitError::ParseError("Failed to parse commit detail".into()));
    }

    let sha = parts[0].to_string();
    let parents = if parts[1].is_empty() {
        Vec::new()
    } else {
        parts[1].split_whitespace().map(|s| s.to_string()).collect()
    };
    let refs = parts[2].to_string();
    let author_name = parts[3].to_string();
    let author_email = parts[4].to_string();
    let author_time: i64 = parts[5].parse().unwrap_or(0);
    let committer_name = parts[6].to_string();
    let committer_email = parts[7].to_string();
    let committer_time: i64 = parts[8].parse().unwrap_or(0);
    let subject = parts[9].to_string();
    let body = if parts.len() > 10 {
        parts[10..].join("\0").trim().to_string()
    } else {
        String::new()
    };

    Ok(CommitDetail {
        sha,
        parents,
        refs,
        author_name,
        author_email,
        author_time,
        committer_name,
        committer_email,
        committer_time,
        subject,
        body,
    })
}

/// Get commit history for a specific file (follows renames).
pub fn get_file_history(path: &str, file: &str, limit: u32) -> Result<Vec<Commit>, GitError> {
    let git = GitCommand::new(path);

    let limit_str = limit.to_string();
    let args: Vec<&str> = vec![
        "log",
        "--follow",
        "--format=%H%x00%P%x00%D%x00%an%x00%ae%x00%at%x00%s",
        "-n",
        &limit_str,
        "--",
        file,
    ];

    let output = git.read_to_end(&args)?;

    let mut commits = Vec::new();
    for line in output.lines() {
        if line.is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split('\0').collect();
        if parts.len() < 7 {
            continue;
        }
        let sha = parts[0].to_string();
        let parents = if parts[1].is_empty() {
            Vec::new()
        } else {
            parts[1].split_whitespace().map(|s| s.to_string()).collect()
        };
        let refs = parts[2].to_string();
        let author_name = parts[3].to_string();
        let author_email = parts[4].to_string();
        let author_time: i64 = parts[5].parse().unwrap_or(0);
        let subject = parts[6].to_string();

        commits.push(Commit {
            sha,
            parents,
            refs,
            author_name,
            author_email,
            author_time,
            subject,
        });
    }

    Ok(commits)
}

/// Get the direct children (first-level descendant commits) of a given commit.
pub fn get_commit_children(path: &str, sha: &str) -> Result<Vec<Commit>, GitError> {
    let git = GitCommand::new(path);

    let ancestry_range = format!("{}..HEAD", sha);
    let args: Vec<&str> = vec![
        "log",
        "--all",
        "--format=%H%x00%P%x00%D%x00%an%x00%ae%x00%at%x00%s",
        "--ancestry-path",
        &ancestry_range,
    ];

    let output = git.read_to_end(&args)?;

    // We need to find commits whose parent list includes the given SHA.
    // Parse all commits from the ancestry path, then filter for direct children.
    let mut children = Vec::new();
    for line in output.lines() {
        if line.is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split('\0').collect();
        if parts.len() < 7 {
            continue;
        }
        let commit_sha = parts[0].to_string();
        let parents = if parts[1].is_empty() {
            Vec::new()
        } else {
            parts[1].split_whitespace().map(|s| s.to_string()).collect()
        };

        // Direct child: this commit's parent is the target SHA
        if parents.contains(&sha.to_string()) {
            let refs = parts[2].to_string();
            let author_name = parts[3].to_string();
            let author_email = parts[4].to_string();
            let author_time: i64 = parts[5].parse().unwrap_or(0);
            let subject = parts[6].to_string();

            children.push(Commit {
                sha: commit_sha,
                parents,
                refs,
                author_name,
                author_email,
                author_time,
                subject,
            });

            // Only take the first layer of children
            if children.len() >= 50 {
                break;
            }
        }
    }

    Ok(children)
}
