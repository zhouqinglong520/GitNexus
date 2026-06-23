use crate::git::command::{GitCommand, GitError};
use crate::models::{Remote, RepositoryInfo};

/// Open a repository at the given path and return basic info.
pub fn open_repo(path: &str) -> Result<RepositoryInfo, GitError> {
    let git = GitCommand::new(path);

    let head = git.read_to_end(&["rev-parse", "HEAD"])?;
    let head = head.trim().to_string();

    let branch_output = git.read_to_end(&["rev-parse", "--abbrev-ref", "HEAD"]);
    let branch = if let Ok(b) = &branch_output {
        let b = b.trim().to_string();
        if b == "HEAD" { None } else { Some(b) }
    } else {
        None
    };

    let bare = git.read_to_end(&["rev-parse", "--is-bare-repository"])?;
    let is_bare = bare.trim() == "true";

    let worktree = if is_bare {
        path.to_string()
    } else {
        git.read_to_end(&["rev-parse", "--show-toplevel"])?
            .trim()
            .to_string()
    };

    Ok(RepositoryInfo {
        path: path.to_string(),
        head,
        branch,
        is_bare,
        worktree,
    })
}

/// Initialize a new git repository.
pub fn init_repo(path: &str, is_bare: bool) -> Result<String, GitError> {
    let git = GitCommand::new(path);
    let mut args = vec!["init"];
    if is_bare {
        args.push("--bare");
    }
    let output = git.read_to_end(&args)?;
    Ok(output.trim().to_string())
}

/// Clone a repository asynchronously with progress callback.
pub async fn clone_repo<F>(
    url: &str,
    path: &str,
    depth: Option<u32>,
    branch: Option<&str>,
    on_progress: F,
) -> Result<(), GitError>
where
    F: Fn(String) + Send + 'static,
{
    // clone uses the parent directory as cwd
    let parent = std::path::Path::new(path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string());

    let git = GitCommand::new(&parent);

    let mut args: Vec<String> = vec!["clone".to_string(), "--progress".to_string()];
    if let Some(d) = depth {
        args.push(format!("--depth={}", d));
    }
    if let Some(b) = branch {
        args.push("--branch".to_string());
        args.push(b.to_string());
    }
    args.push(url.to_string());
    // The target directory name
    if let Some(name) = std::path::Path::new(path).file_name() {
        args.push(name.to_string_lossy().to_string());
    }

    let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    git.exec_async(
        &args_refs,
        on_progress,
        |_line| {},
    )
    .await
}

/// Get list of remotes.
pub fn get_remotes(path: &str) -> Result<Vec<Remote>, GitError> {
    let git = GitCommand::new(path);
    let output = git.read_to_end(&["remote", "-v"])?;

    let mut remotes: Vec<Remote> = Vec::new();
    let mut map: std::collections::HashMap<String, Remote> = std::collections::HashMap::new();

    for line in output.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let name = parts[0].to_string();
            let url = parts[1].to_string();
            let entry = map.entry(name.clone()).or_insert_with(|| Remote {
                name: name.clone(),
                url: String::new(),
                push_url: None,
                head: None,
            });
            if line.contains("(fetch)") {
                entry.url = url;
            } else if line.contains("(push)") {
                entry.push_url = Some(url);
            }
        }
    }

    for (_, remote) in map.into_iter() {
        remotes.push(remote);
    }

    Ok(remotes)
}

/// Get a git config value.
pub fn get_config(path: &str, key: &str) -> Result<String, GitError> {
    let git = GitCommand::new(path);
    let output = git.read_to_end(&["config", "--get", key])?;
    Ok(output.trim().to_string())
}

/// Set a git config value.
pub fn set_config(path: &str, key: &str, value: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["config", key, value])?;
    Ok(())
}
