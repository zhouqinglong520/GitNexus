use crate::git::command::{GitCommand, GitError};

/// Create an archive from the repository.
///
/// `format` can be "zip", "tar", "tar.gz", or "tgz".
pub fn create_archive(
    path: &str,
    output: &str,
    ref_name: &str,
    format: &str,
) -> Result<(), GitError> {
    let git = GitCommand::new(path);

    let mut args: Vec<&str> = vec!["archive"];

    let prefix = match format {
        "zip" => {
            args.push("--format=zip");
            None
        }
        "tar.gz" | "tgz" => {
            args.push("--format=tar.gz");
            None
        }
        _ => {
            args.push("--format=tar");
            None
        }
    };

    if let Some(p) = prefix {
        args.push("--prefix");
        args.push(p);
    }

    args.push("--output");
    args.push(output);
    args.push(ref_name);

    git.read_to_end(&args)?;
    Ok(())
}
