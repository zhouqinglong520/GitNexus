use crate::git::command::{GitCommand, GitError};
use crate::models::BlameLine;

/// Get blame information for a file, optionally for a range of lines.
pub fn blame(
    path: &str,
    file: &str,
    line_start: Option<u32>,
    line_end: Option<u32>,
) -> Result<Vec<BlameLine>, GitError> {
    let git = GitCommand::new(path);

    let mut dynamic_args: Vec<String> = vec![
        "blame".to_string(),
        "--porcelain".to_string(),
    ];
    if line_start.is_some() || line_end.is_some() {
        let start = line_start.unwrap_or(1);
        let end_str = line_end.map(|e| e.to_string()).unwrap_or_default();
        let range = if line_end.is_some() {
            format!("{},{}", start, end_str)
        } else {
            format!("{},", start)
        };
        dynamic_args.push("-L".to_string());
        dynamic_args.push(range);
    }
    dynamic_args.push("--".to_string());
    dynamic_args.push(file.to_string());

    let args_refs: Vec<&str> = dynamic_args.iter().map(|s| s.as_str()).collect();
    let output = git.read_to_end(&args_refs)?;

    let mut blame_lines = Vec::new();
    let mut current_sha = String::new();
    let mut current_author_name = String::new();
    let mut current_author_email = String::new();
    let mut current_author_time: i64 = 0;
    let mut current_summary = String::new();

    for line in output.lines() {
        if line.is_empty() {
            continue;
        }

        // Header line: SHA orig_line result_line [num_lines]
        if line.len() >= 40 && line.chars().nth(40) == Some(' ') {
            current_sha = line[..40].to_string();
            current_summary = String::new();
            continue;
        }

        // Author line
        if line.starts_with("author ") {
            current_author_name = line[7..].to_string();
            continue;
        }

        // Author-mail line
        if line.starts_with("author-mail ") {
            let mail = line[11..].trim_matches('<').trim_matches('>');
            current_author_email = mail.to_string();
            continue;
        }

        // Author-time line
        if line.starts_with("author-time ") {
            current_author_time = line[12..].parse().unwrap_or(0);
            continue;
        }

        // Summary line (first line of commit message)
        if line.starts_with("summary ") {
            current_summary = line[8..].to_string();
            continue;
        }

        // Content line: starts with \t
        if line.starts_with('\t') {
            let content = line[1..].to_string();
            blame_lines.push(BlameLine {
                sha: current_sha.clone(),
                author_name: current_author_name.clone(),
                author_email: current_author_email.clone(),
                author_time: current_author_time,
                line_number: 0, // will be set below
                content,
                commit_message: current_summary.clone(),
            });
        }
    }

    // Set line numbers
    let base_line = line_start.unwrap_or(1);
    for (i, blame_line) in blame_lines.iter_mut().enumerate() {
        blame_line.line_number = base_line + i as u32;
    }

    Ok(blame_lines)
}
