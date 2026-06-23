use crate::git::command::{GitCommand, GitError};
use crate::models::Stash;

/// List all stash entries.
pub fn list_stash(path: &str) -> Result<Vec<Stash>, GitError> {
    let git = GitCommand::new(path);

    // Use default format and parse each line
    // Default format: "stash@{N}: On branch: <message>"
    let output = git.read_to_end(&["stash", "list"])?;

    let mut stashes = Vec::new();
    for (index, line) in output.lines().enumerate() {
        if line.is_empty() {
            continue;
        }
        // Parse: "stash@{N}: On branch: <message>"
        // or:    "stash@{N}: WIP on <branch>: <message>"
        let sha = format!("stash@{{{}}}", index);
        
        // Extract branch and message
        let (branch, message) = if line.contains(": On ") {
            let rest = line.splitn(2, ": On ").nth(2).unwrap_or("");
            let colon_pos = rest.find(": ");
            if let Some(pos) = colon_pos {
                (Some(rest[..pos].to_string()), rest[pos + 2..].to_string())
            } else {
                (None, rest.to_string())
            }
        } else if line.contains(": WIP on ") {
            let rest = line.splitn(2, ": WIP on ").nth(2).unwrap_or("");
            let colon_pos = rest.find(": ");
            if let Some(pos) = colon_pos {
                (Some(rest[..pos].to_string()), rest[pos + 2..].to_string())
            } else {
                (None, rest.to_string())
            }
        } else {
            (None, line.to_string())
        };

        stashes.push(Stash {
            index: index as u32,
            sha,
            message,
            branch,
        });
    }

    Ok(stashes)
}

/// Push (create) a new stash entry.
pub fn push_stash(path: &str, message: Option<&str>, keep_index: bool) -> Result<(), GitError> {
    let git = GitCommand::new(path);

    let mut args: Vec<&str> = vec!["stash", "push"];
    if keep_index {
        args.push("--keep-index");
    }
    if let Some(m) = message {
        args.push("-m");
        args.push(m);
    }

    git.read_to_end(&args)?;
    Ok(())
}

/// Pop a stash entry.
pub fn pop_stash(path: &str, index: u32) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["stash", "pop", &format!("stash@{{{}}}", index)])?;
    Ok(())
}

/// Apply a stash entry without removing it.
pub fn apply_stash(path: &str, index: u32) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["stash", "apply", &format!("stash@{{{}}}", index)])?;
    Ok(())
}

/// Drop a stash entry.
pub fn drop_stash(path: &str, index: u32) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["stash", "drop", &format!("stash@{{{}}}", index)])?;
    Ok(())
}

/// Clear all stash entries.
pub fn clear_stash(path: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["stash", "clear"])?;
    Ok(())
}

/// Show the diff of a stash entry.
pub fn show_stash(path: &str, index: u32) -> Result<String, GitError> {
    let git = GitCommand::new(path);
    let stash_ref = format!("stash@{{{}}}", index);
    let output = git.read_to_end(&["stash", "show", "-p", &stash_ref])?;
    Ok(output)
}
