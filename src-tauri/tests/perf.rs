use app_lib::git::{self};
use std::time::Instant;
use std::sync::OnceLock;

static PERF_REPO: OnceLock<String> = OnceLock::new();

fn get_perf_repo() -> &'static str {
    PERF_REPO.get_or_init(|| {
        let path = "/tmp/gitnexus-perf-test";
        let _ = std::fs::remove_dir_all(path);
        std::fs::create_dir_all(path).unwrap();
        
        let git = git::command::GitCommand::new(path);
        git.read_to_end(&["init"]).unwrap();
        git.read_to_end(&["config", "user.email", "perf@gitnexus.dev"]).unwrap();
        git.read_to_end(&["config", "user.name", "Perf Test"]).unwrap();
        
        // Create 100 files and 10 commits
        for i in 0..10 {
            for j in 0..10 {
                let file = format!("{}/dir_{}_file_{}.txt", path, i % 5, j);
                std::fs::write(&file, format!("Content of file {} in commit {}\n", j, i)).unwrap();
            }
            git.read_to_end(&["add", "-A"]).unwrap();
            git.read_to_end(&["commit", "-m", &format!("Commit #{}", i)]).unwrap();
            git.read_to_end(&["branch", &format!("branch-{}", i)]).unwrap();
        }
        
        // Create tags
        for i in 0..5 {
            git.read_to_end(&["tag", &format!("v0.{}.0", i), "-m", &format!("Tag {}", i)]).unwrap();
        }
        
        // Create working copy changes
        for i in 0..5 {
            std::fs::write(format!("{}/modified_{}.txt", path, i), "modified\n").unwrap();
        }
        for i in 0..5 {
            std::fs::write(format!("{}/untracked_{}.txt", path, i), "untracked\n").unwrap();
        }
        
        path.to_string()
    })
}

#[test]
fn perf_open_repo() {
    let path = get_perf_repo();
    let start = Instant::now();
    let result = git::repository::open_repo(path);
    let elapsed = start.elapsed();
    assert!(result.is_ok());
    println!("  open_repo: {:?}", elapsed);
    assert!(elapsed.as_millis() < 500, "open_repo took {:?}", elapsed);
}

#[test]
fn perf_get_commits_100() {
    let path = get_perf_repo();
    let start = Instant::now();
    let result = git::log::get_commits(path, None, 100, 0);
    let elapsed = start.elapsed();
    assert!(result.is_ok());
    let commits = result.unwrap();
    println!("  get_commits(100): {:?} ({} commits)", elapsed, commits.len());
    assert!(elapsed.as_millis() < 1000, "get_commits took {:?}", elapsed);
}

#[test]
fn perf_get_status() {
    let path = get_perf_repo();
    let start = Instant::now();
    let result = git::status::get_status(path);
    let elapsed = start.elapsed();
    assert!(result.is_ok());
    let status = result.unwrap();
    println!("  get_status: {:?} ({} changes, {} untracked)", elapsed, status.changes.len(), status.untracked_files.len());
    assert!(elapsed.as_millis() < 500, "get_status took {:?}", elapsed);
}

#[test]
fn perf_list_branches() {
    let path = get_perf_repo();
    let start = Instant::now();
    let result = git::branch::list_branches(path);
    let elapsed = start.elapsed();
    assert!(result.is_ok());
    let branches = result.unwrap();
    println!("  list_branches: {:?} ({} branches)", elapsed, branches.len());
    assert!(elapsed.as_millis() < 500, "list_branches took {:?}", elapsed);
}

#[test]
fn perf_list_tags() {
    let path = get_perf_repo();
    let start = Instant::now();
    let result = git::tag::list_tags(path);
    let elapsed = start.elapsed();
    assert!(result.is_ok());
    let tags = result.unwrap();
    println!("  list_tags: {:?} ({} tags)", elapsed, tags.len());
    assert!(elapsed.as_millis() < 500, "list_tags took {:?}", elapsed);
}

#[test]
fn perf_get_diff() {
    let path = get_perf_repo();
    let start = Instant::now();
    let result = git::diff::get_diff(path, None, None, None);
    let elapsed = start.elapsed();
    assert!(result.is_ok());
    let diff = result.unwrap();
    println!("  get_diff: {:?} ({} bytes)", elapsed, diff.len());
    assert!(elapsed.as_millis() < 1000, "get_diff took {:?}", elapsed);
}

#[test]
fn perf_blame_large_file() {
    let path = get_perf_repo();
    // Create a file with 500 lines (only first time)
    let file_path = format!("{}/large_file.txt", path);
    if !std::path::Path::new(&file_path).exists() {
        let content: String = (0..500).map(|i| format!("Line {}: some content here\n", i)).collect();
        std::fs::write(&file_path, &content).unwrap();
        let git = git::command::GitCommand::new(path);
        let _ = git.read_to_end(&["add", "large_file.txt"]);
        let _ = git.read_to_end(&["commit", "-m", "Add large file"]);
    }
    
    let start = Instant::now();
    let result = git::blame::blame(path, "large_file.txt", None, None);
    let elapsed = start.elapsed();
    assert!(result.is_ok());
    let lines = result.unwrap();
    println!("  blame(500 lines): {:?} ({} lines)", elapsed, lines.len());
    assert!(elapsed.as_millis() < 3000, "blame took {:?}", elapsed);
}

#[test]
fn perf_get_statistics() {
    let path = get_perf_repo();
    let start = Instant::now();
    let result = git::statistics::get_statistics(path);
    let elapsed = start.elapsed();
    assert!(result.is_ok());
    let stats = result.unwrap();
    println!("  get_statistics: {:?} ({} commits, {} authors, {} branches, {} tags, {} files, {} bytes repo)",
        elapsed, stats.total_commits, stats.total_authors, stats.total_branches, stats.total_tags,
        stats.total_files, stats.repo_size);
    assert!(elapsed.as_millis() < 2000, "get_statistics took {:?}", elapsed);
}

#[test]
fn perf_stage_all() {
    let path = get_perf_repo();
    let start = Instant::now();
    let result = git::commit::stage_all(path);
    let elapsed = start.elapsed();
    assert!(result.is_ok());
    println!("  stage_all: {:?}", elapsed);
    assert!(elapsed.as_millis() < 1000, "stage_all took {:?}", elapsed);
    // Unstage to restore state for other tests
    let _ = git::commit::unstage_all(path);
}

#[test]
fn perf_commit() {
    let path = get_perf_repo();
    let _ = git::commit::stage_all(path);
    let start = Instant::now();
    let result = git::commit::commit(path, "Performance test commit", false, false, false);
    let elapsed = start.elapsed();
    assert!(result.is_ok());
    println!("  commit: {:?}", elapsed);
    assert!(elapsed.as_millis() < 1000, "commit took {:?}", elapsed);
}

#[test]
fn perf_worktree_list() {
    let path = get_perf_repo();
    let start = Instant::now();
    let result = git::worktree::list_worktrees(path);
    let elapsed = start.elapsed();
    assert!(result.is_ok());
    println!("  list_worktrees: {:?}", elapsed);
    assert!(elapsed.as_millis() < 500, "list_worktrees took {:?}", elapsed);
}
