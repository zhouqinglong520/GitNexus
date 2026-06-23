use crate::git::command::{GitCommand, GitError};
use std::path::Path;

/// Generate a patch file for a single commit.
/// Returns the path to the generated patch file.
pub fn save_patch(path: &str, output_dir: &str, sha: &str) -> Result<String, GitError> {
    let git = GitCommand::new(path);

    let output = git.read_to_end(&["format-patch", "-1", sha, "-o", output_dir])?;

    // The output of format-patch is the filename of the generated patch
    let patch_file = output.trim().to_string();

    // Return the full path
    let full_path = Path::new(output_dir).join(&patch_file);
    Ok(full_path.to_string_lossy().to_string())
}

/// Apply a patch file to the current working tree.
pub fn apply_patch(path: &str, patch_file: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["apply", patch_file])?;
    Ok(())
}
