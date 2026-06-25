use crate::git::command::{GitCommand, GitError};

/// Run git garbage collection.
pub fn run_gc(path: &str, aggressive: bool, prune: bool) -> Result<String, GitError> {
    let git = GitCommand::new(path);

    let mut args: Vec<&str> = vec!["gc"];
    if aggressive {
        args.push("--aggressive");
    }
    if prune {
        args.push("--prune=now");
    }

    git.read_to_end(&args)
}
