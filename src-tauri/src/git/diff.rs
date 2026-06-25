use crate::git::command::{GitCommand, GitError};
use crate::models::DiffFile;

/// Get diff between two refs, optionally filtered by file path.
pub fn get_diff(
    path: &str,
    old_ref: Option<&str>,
    new_ref: Option<&str>,
    path_filter: Option<&str>,
    ignore_whitespace: Option<bool>,
    context_lines: Option<u32>,
) -> Result<String, GitError> {
    let git = GitCommand::new(path);

    let mut args: Vec<String> = vec!["diff".to_string()];

    if ignore_whitespace == Some(true) {
        args.push("-w".to_string());
    }
    if let Some(cl) = context_lines {
        args.push(format!("-U{}", cl));
    }
    if let Some(old) = old_ref {
        args.push(old.to_string());
    }
    if let Some(new) = new_ref {
        args.push(new.to_string());
    }
    if let Some(pf) = path_filter {
        args.push("--".to_string());
        args.push(pf.to_string());
    }

    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    git.read_to_end(&args_ref)
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

/// Get the list of changed files between two revisions with their status.
pub fn diff_revision_files(path: &str, old_ref: &str, new_ref: &str) -> Result<Vec<DiffFile>, GitError> {
    let git = GitCommand::new(path);

    let output = git.read_to_end(&["diff", "--name-status", old_ref, new_ref])?;

    let mut files = Vec::new();
    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        // Format: <status><tab><path> or <status><tab><old_path><tab><new_path> for renames
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.is_empty() {
            continue;
        }

        let status = parts[0].trim().to_string();
        let file_path = if parts.len() > 1 {
            parts[1].to_string()
        } else {
            continue;
        };

        files.push(DiffFile {
            path: file_path,
            status,
        });
    }

    Ok(files)
}

/// Query the content of a file at a specific revision.
pub fn query_file_content(path: &str, ref_name: &str, file_path: &str) -> Result<String, GitError> {
    let git = GitCommand::new(path);

    let ref_spec = format!("{}:{}", ref_name, file_path);
    git.read_to_end(&["show", &ref_spec])
}
