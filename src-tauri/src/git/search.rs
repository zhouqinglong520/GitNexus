use crate::git::command::{GitCommand, GitError};
use crate::models::Commit;

/// Search commits matching a query string with optional filters.
pub fn search_commits(
    path: &str,
    query: &str,
    author: Option<&str>,
    since: Option<&str>,
    until: Option<&str>,
    limit: u32,
) -> Result<Vec<Commit>, GitError> {
    let git = GitCommand::new(path);

    let mut args: Vec<String> = vec![
        "log".to_string(),
        "--all".to_string(),
        format!("--grep={}", query),
        "--format=%H%x00%P%x00%D%x00%an%x00%ae%x00%at%x00%s".to_string(),
    ];

    if let Some(a) = author {
        args.push(format!("--author={}", a));
    }
    if let Some(s) = since {
        args.push(format!("--since={}", s));
    }
    if let Some(u) = until {
        args.push(format!("--until={}", u));
    }

    let limit_str = limit.to_string();
    args.push("-n".to_string());
    args.push(limit_str);

    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let output = git.read_to_end(&arg_refs)?;

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
