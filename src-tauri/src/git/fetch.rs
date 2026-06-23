use crate::git::command::{GitCommand, GitError};

/// Fetch from a remote with optional progress callback.
pub async fn fetch<F>(
    path: &str,
    remote: Option<&str>,
    prune: bool,
    tags: bool,
    depth: Option<u32>,
    on_progress: F,
) -> Result<(), GitError>
where
    F: Fn(String) + Send + 'static,
{
    let git = GitCommand::new(path);

    let mut args: Vec<String> = vec!["fetch".to_string(), "--progress".to_string()];
    if prune {
        args.push("--prune".to_string());
    }
    if tags {
        args.push("--tags".to_string());
    }
    if let Some(d) = depth {
        args.push("--depth".to_string());
        args.push(d.to_string());
    }
    if let Some(r) = remote {
        args.push(r.to_string());
    }

    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    git.exec_async(&args_refs, on_progress, |_line| {}).await
}
