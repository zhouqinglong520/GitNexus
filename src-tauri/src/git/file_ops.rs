use crate::git::command::{GitCommand, GitError};
use std::path::Path;
use std::fs::OpenOptions;
use std::io::Write;

/// Toggle assume-unchanged flag for files.
pub fn assume_unchanged(path: &str, files: &[String], enable: bool) -> Result<(), GitError> {
    let git = GitCommand::new(path);

    let flag = if enable {
        "--assume-unchanged"
    } else {
        "--no-assume-unchanged"
    };

    for file in files {
        git.read_to_end(&["update-index", flag, file])?;
    }

    Ok(())
}

/// Toggle skip-worktree flag for files.
pub fn skip_worktree(path: &str, files: &[String], enable: bool) -> Result<(), GitError> {
    let git = GitCommand::new(path);

    let flag = if enable {
        "--skip-worktree"
    } else {
        "--no-skip-worktree"
    };

    for file in files {
        git.read_to_end(&["update-index", flag, file])?;
    }

    Ok(())
}

/// Append patterns to the .gitignore file.
pub fn add_to_gitignore(path: &str, patterns: &[String]) -> Result<(), GitError> {
    let gitignore_path = Path::new(path).join(".gitignore");

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&gitignore_path)
        .map_err(|e| GitError::ProcessError(e.to_string()))?;

    for pattern in patterns {
        writeln!(file, "{}", pattern).map_err(|e| GitError::ProcessError(e.to_string()))?;
    }

    Ok(())
}

/// Delete files from the repository and filesystem (git rm).
pub fn delete_files(path: &str, files: &[String]) -> Result<(), GitError> {
    let git = GitCommand::new(path);

    let mut args: Vec<&str> = vec!["rm"];
    for file in files {
        args.push(file);
    }

    git.read_to_end(&args)?;
    Ok(())
}
