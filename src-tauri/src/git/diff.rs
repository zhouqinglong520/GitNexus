use crate::git::command::{GitCommand, GitError};

/// Get diff between two refs, optionally filtered by file path.
pub fn get_diff(
    path: &str,
    old_ref: Option<&str>,
    new_ref: Option<&str>,
    path_filter: Option<&str>,
) -> Result<String, GitError> {
    let git = GitCommand::new(path);

    let mut args: Vec<&str> = vec!["diff"];

    if let Some(old) = old_ref {
        args.push(old);
    }
    if let Some(new) = new_ref {
        args.push(new);
    }
    if let Some(pf) = path_filter {
        args.push("--");
        args.push(pf);
    }

    git.read_to_end(&args)
}

/// Get diff of staged changes for a specific file (or all staged).
pub fn get_diff_staged(path: &str, file: Option<&str>) -> Result<String, GitError> {
    let git = GitCommand::new(path);

    let mut args: Vec<&str> = vec!["diff", "--cached"];
    if let Some(f) = file {
        args.push("--");
        args.push(f);
    }

    git.read_to_end(&args)
}

/// Get diff of unstaged changes for a specific file (or all unstaged).
pub fn get_diff_unstaged(path: &str, file: Option<&str>) -> Result<String, GitError> {
    let git = GitCommand::new(path);

    let mut args: Vec<&str> = vec!["diff"];
    if let Some(f) = file {
        args.push("--");
        args.push(f);
    }

    git.read_to_end(&args)
}
