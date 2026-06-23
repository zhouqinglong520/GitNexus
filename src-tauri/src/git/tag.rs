use crate::git::command::{GitCommand, GitError};
use crate::models::Tag;

/// List all tags.
pub fn list_tags(path: &str) -> Result<Vec<Tag>, GitError> {
    let git = GitCommand::new(path);

    // Use `git tag -l --format` with separate calls for reliability
    // Lightweight tags: `git tag -l`
    // Annotated tags: `git for-each-ref --format='%(refname:short) %(objectname) tag %(contents) %(taggername) %(taggeremail) %(taggerdate:unix)' refs/tags/`
    
    let all_output = git.read_to_end(&[
        "for-each-ref",
        "--format=%(refname:short) %(objectname) %(objecttype) %(contents:lines=1) %(taggername) %(taggeremail) %(taggerdate:unix)",
        "refs/tags/",
    ])?;

    let mut tags = Vec::new();
    for line in all_output.lines() {
        if line.is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.splitn(7, ' ').collect();
        if parts.len() < 3 {
            continue;
        }
        let name = parts[0].to_string();
        let sha = parts[1].to_string();
        let obj_type = parts[2].to_string();
        let is_annotated = obj_type == "tag";
        let message = if parts.len() > 3 && !parts[3].is_empty() {
            Some(parts[3].to_string())
        } else {
            None
        };
        let tagger_name = if parts.len() > 4 && !parts[4].is_empty() {
            Some(parts[4].to_string())
        } else {
            None
        };
        let tagger_email = if parts.len() > 5 && !parts[5].is_empty() {
            Some(parts[5].to_string())
        } else {
            None
        };
        let tagger_time = if parts.len() > 6 && !parts[6].is_empty() {
            parts[6].parse::<i64>().ok()
        } else {
            None
        };

        tags.push(Tag {
            name,
            sha,
            is_annotated,
            message,
            tagger_name,
            tagger_email,
            tagger_time,
        });
    }

    Ok(tags)
}

/// Create a new tag.
pub fn create_tag(
    path: &str,
    name: &str,
    message: Option<&str>,
    ref_name: Option<&str>,
) -> Result<(), GitError> {
    let git = GitCommand::new(path);

    let mut args: Vec<&str> = vec!["tag"];
    if let Some(m) = message {
        args.push("-a");
        args.push("-m");
        args.push(m);
    }
    args.push(name);
    if let Some(r) = ref_name {
        args.push(r);
    }

    git.read_to_end(&args)?;
    Ok(())
}

/// Delete a tag.
pub fn delete_tag(path: &str, name: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    git.read_to_end(&["tag", "-d", name])?;
    Ok(())
}

/// Push a tag to a remote.
pub fn push_tag(path: &str, name: &str, remote: &str) -> Result<(), GitError> {
    let git = GitCommand::new(path);
    let tag_ref = format!("refs/tags/{}", name);
    git.read_to_end(&["push", remote, &tag_ref])?;
    Ok(())
}
