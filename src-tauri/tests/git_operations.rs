use app_lib::git::{self};
use app_lib::models::*;
use std::sync::Mutex;

// Use a mutex to prevent parallel test repo conflicts
static REPO_MUTEX: Mutex<()> = Mutex::new(());

/// Helper: create a test repo with known state. Returns repo path.
fn setup_test_repo(name: &str) -> String {
    let _lock = REPO_MUTEX.lock().unwrap();
    let path = format!("/tmp/gitnexus-test-{}", name);
    let _ = std::fs::remove_dir_all(&path);
    std::fs::create_dir_all(&path).unwrap();
    
    let git = git::command::GitCommand::new(&path);
    git.read_to_end(&["init"]).unwrap();
    git.read_to_end(&["config", "user.email", "test@gitnexus.dev"]).unwrap();
    git.read_to_end(&["config", "user.name", "GitNexus Test"]).unwrap();
    
    std::fs::write(format!("{}/README.md", path), "Hello\n").unwrap();
    std::fs::create_dir_all(format!("{}/src", path)).unwrap();
    std::fs::write(format!("{}/src/main.rs", path), "fn main(){}\n").unwrap();
    git.read_to_end(&["add", "-A"]).unwrap();
    git.read_to_end(&["commit", "-m", "Initial commit"]).unwrap();
    git.read_to_end(&["branch", "feature/test"]).unwrap();
    git.read_to_end(&["tag", "v0.1.0", "-m", "Version 0.1"]).unwrap();
    
    // Create stash
    std::fs::write(format!("{}/wip.txt", path), "wip\n").unwrap();
    git.read_to_end(&["add", "wip.txt"]).unwrap();
    git.read_to_end(&["stash", "push", "-m", "WIP"]).unwrap();
    
    // Create working copy changes
    std::fs::write(format!("{}/README.md", path), "Hello\nModified\n").unwrap();
    std::fs::write(format!("{}/untracked.txt", path), "new\n").unwrap();
    
    path
}

#[test]
fn test_open_repo() {
    let path = setup_test_repo("open");
    let result = git::repository::open_repo(&path);
    assert!(result.is_ok(), "open_repo failed: {:?}", result.err());
    let info = result.unwrap();
    assert_eq!(info.is_bare, false);
    assert!(!info.head.is_empty());
}

#[test]
fn test_get_commits() {
    let path = setup_test_repo("commits");
    let result = git::log::get_commits(&path, None, 10, 0);
    assert!(result.is_ok(), "get_commits failed: {:?}", result.err());
    let commits = result.unwrap();
    assert!(commits.len() >= 1, "Expected at least 1 commit, got {}", commits.len());
}

#[test]
fn test_get_commit_detail() {
    let path = setup_test_repo("detail");
    let commits = git::log::get_commits(&path, None, 1, 0).unwrap();
    assert!(!commits.is_empty());
    let sha = &commits[0].sha;
    let result = git::log::get_commit_detail(&path, sha);
    assert!(result.is_ok(), "get_commit_detail failed: {:?}", result.err());
    let detail = result.unwrap();
    assert_eq!(detail.sha, *sha);
    assert!(!detail.subject.is_empty());
}

#[test]
fn test_get_status() {
    let path = setup_test_repo("status");
    let result = git::status::get_status(&path);
    assert!(result.is_ok(), "get_status failed: {:?}", result.err());
    let status = result.unwrap();
    assert_eq!(status.branch, "master", "Branch should be 'master', got '{}'", status.branch);
    // README.md is modified
    assert!(status.changes.iter().any(|c| c.path == "README.md"), "Should have README.md modified");
}

#[test]
fn test_list_branches() {
    let path = setup_test_repo("branches");
    let result = git::branch::list_branches(&path);
    assert!(result.is_ok(), "list_branches failed: {:?}", result.err());
    let branches = result.unwrap();
    assert!(branches.iter().any(|b| b.name == "master" && b.is_current), "Should have master as current");
    assert!(branches.iter().any(|b| b.name == "feature/test"), "Should have feature/test");
}

#[test]
fn test_list_tags() {
    let path = setup_test_repo("tags");
    let result = git::tag::list_tags(&path);
    assert!(result.is_ok(), "list_tags failed: {:?}", result.err());
    let tags = result.unwrap();
    assert!(tags.iter().any(|t| t.name == "v0.1.0"), "Should have v0.1.0 tag");
}

#[test]
fn test_list_stash() {
    let path = setup_test_repo("stash");
    let result = git::stash::list_stash(&path);
    assert!(result.is_ok(), "list_stash failed: {:?}", result.err());
    let stashes = result.unwrap();
    assert_eq!(stashes.len(), 1, "Should have 1 stash");
}

#[test]
fn test_get_diff() {
    let path = setup_test_repo("diff");
    let result = git::diff::get_diff(&path, None, None, None);
    assert!(result.is_ok(), "get_diff failed: {:?}", result.err());
}

#[test]
fn test_get_config() {
    let path = setup_test_repo("config");
    let result = git::repository::get_config(&path, "user.name");
    assert!(result.is_ok(), "get_config failed: {:?}", result.err());
    assert_eq!(result.unwrap(), "GitNexus Test");
}

#[test]
fn test_blame() {
    let path = setup_test_repo("blame");
    let result = git::blame::blame(&path, "README.md", None, None);
    assert!(result.is_ok(), "blame failed: {:?}", result.err());
    let lines = result.unwrap();
    assert!(!lines.is_empty());
    assert!(!lines[0].sha.is_empty());
}

#[test]
fn test_get_statistics() {
    let path = setup_test_repo("stats");
    let result = git::statistics::get_statistics(&path);
    assert!(result.is_ok(), "get_statistics failed: {:?}", result.err());
    let stats = result.unwrap();
    assert!(stats.total_commits >= 1);
    assert!(stats.total_authors >= 1);
    assert!(stats.total_branches >= 2);
    assert!(stats.total_tags >= 1);
}

#[test]
fn test_list_submodules() {
    let path = setup_test_repo("submodules");
    let result = git::submodule::list_submodules(&path);
    assert!(result.is_ok(), "list_submodules failed: {:?}", result.err());
}

#[test]
fn test_create_and_delete_branch() {
    let path = setup_test_repo("branch_crud");
    let result = git::branch::create_branch(&path, "test-branch-tmp", None);
    assert!(result.is_ok(), "create_branch failed: {:?}", result.err());
    let branches = git::branch::list_branches(&path).unwrap();
    assert!(branches.iter().any(|b| b.name == "test-branch-tmp"), "Branch should exist");
    let result = git::branch::delete_branch(&path, "test-branch-tmp", false);
    assert!(result.is_ok(), "delete_branch failed: {:?}", result.err());
}

#[test]
fn test_create_and_delete_tag() {
    let path = setup_test_repo("tag_crud");
    let result = git::tag::create_tag(&path, "test-tag-tmp", Some("Test"), None);
    assert!(result.is_ok(), "create_tag failed: {:?}", result.err());
    let tags = git::tag::list_tags(&path).unwrap();
    assert!(tags.iter().any(|t| t.name == "test-tag-tmp"), "Tag should exist");
    let result = git::tag::delete_tag(&path, "test-tag-tmp");
    assert!(result.is_ok(), "delete_tag failed: {:?}", result.err());
}

#[test]
fn test_stage_unstage() {
    let path = setup_test_repo("stage");
    let result = git::commit::stage(&path, &["untracked.txt".to_string()]);
    assert!(result.is_ok(), "stage failed: {:?}", result.err());
    let status = git::status::get_status(&path).unwrap();
    let staged = status.changes.iter().any(|c| c.path == "untracked.txt" && c.staged);
    assert!(staged, "untracked.txt should be staged");
    let result = git::commit::unstage(&path, &["untracked.txt".to_string()]);
    assert!(result.is_ok(), "unstage failed: {:?}", result.err());
}

#[test]
fn test_discard_changes() {
    let path = setup_test_repo("discard");
    let result = git::discard::discard_changes(&path, &["README.md".to_string()]);
    assert!(result.is_ok(), "discard failed: {:?}", result.err());
    let status = git::status::get_status(&path).unwrap();
    let readme_modified = status.changes.iter().any(|c| c.path == "README.md");
    assert!(!readme_modified, "README.md should no longer be modified");
}

#[test]
fn test_set_get_config() {
    let path = setup_test_repo("setconfig");
    let result = git::repository::set_config(&path, "test.nexus.key", "test-value");
    assert!(result.is_ok(), "set_config failed: {:?}", result.err());
    let result = git::repository::get_config(&path, "test.nexus.key");
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), "test-value");
}

#[test]
fn test_get_diff_staged() {
    let path = setup_test_repo("diff_staged");
    let _ = git::commit::stage(&path, &["untracked.txt".to_string()]);
    let result = git::diff::get_diff_staged(&path, Some("untracked.txt"));
    assert!(result.is_ok(), "get_diff_staged failed: {:?}", result.err());
}

#[test]
fn test_get_diff_unstaged() {
    let path = setup_test_repo("diff_unstaged");
    let result = git::diff::get_diff_unstaged(&path, None);
    assert!(result.is_ok(), "get_diff_unstaged failed: {:?}", result.err());
}

#[test]
fn test_rename_branch() {
    let path = setup_test_repo("rename");
    let _ = git::branch::create_branch(&path, "rename-me", None);
    let result = git::branch::rename_branch(&path, "rename-me", "renamed-ok");
    assert!(result.is_ok(), "rename_branch failed: {:?}", result.err());
    let _ = git::branch::delete_branch(&path, "renamed-ok", false);
}

#[test]
fn test_checkout_branch() {
    let path = setup_test_repo("checkout");
    let result = git::branch::checkout_branch(&path, "feature/test");
    assert!(result.is_ok(), "checkout_branch failed: {:?}", result.err());
    let info = git::repository::open_repo(&path).unwrap();
    assert_eq!(info.branch.as_deref(), Some("feature/test"));
}

#[test]
fn test_stash_operations() {
    let path = setup_test_repo("stash_ops");
    // Remove untracked wip.txt to avoid conflict
    let _ = std::fs::remove_file(format!("{}/wip.txt", path));
    let stashes = git::stash::list_stash(&path).unwrap();
    assert!(stashes.len() >= 1);
    let result = git::stash::apply_stash(&path, 0);
    assert!(result.is_ok(), "apply_stash failed: {:?}", result.err());
}

#[test]
fn test_worktree_list() {
    let path = setup_test_repo("worktree");
    let result = git::worktree::list_worktrees(&path);
    assert!(result.is_ok(), "list_worktrees failed: {:?}", result.err());
    let trees = result.unwrap();
    assert!(!trees.is_empty());
    assert!(trees.iter().any(|w| w.is_main));
}

#[test]
fn test_archive() {
    let path = setup_test_repo("archive");
    let output = format!("{}/output.zip", path);
    let result = git::archive::create_archive(&path, &output, "HEAD", "zip");
    assert!(result.is_ok(), "create_archive failed: {:?}", result.err());
    assert!(std::path::Path::new(&output).exists(), "Archive file should exist");
}

#[test]
fn test_remote_operations() {
    let path = setup_test_repo("remote");
    let result = git::remote::add_remote(&path, "test-origin", "https://github.com/test/test.git");
    assert!(result.is_ok(), "add_remote failed: {:?}", result.err());
    let remotes = git::repository::get_remotes(&path).unwrap();
    assert!(remotes.iter().any(|r| r.name == "test-origin"));
    let result = git::remote::remove_remote(&path, "test-origin");
    assert!(result.is_ok(), "remove_remote failed: {:?}", result.err());
}

#[test]
fn test_init_repo() {
    let _lock = REPO_MUTEX.lock().unwrap();
    let path = "/tmp/gitnexus-test-init";
    let _ = std::fs::remove_dir_all(path);
    std::fs::create_dir_all(path).unwrap();
    let result = git::repository::init_repo(path, false);
    assert!(result.is_ok(), "init_repo failed: {:?}", result.err());
    // Empty repo has no HEAD, so open_repo may fail - that's expected
    // Just verify the .git directory exists
    assert!(std::path::Path::new(&format!("{}/.git", path)).exists());
}

#[test]
fn test_stage_all_unstage_all() {
    let path = setup_test_repo("stage_all");
    let result = git::commit::stage_all(&path);
    assert!(result.is_ok(), "stage_all failed: {:?}", result.err());
    let status = git::status::get_status(&path).unwrap();
    assert!(status.changes.iter().all(|c| c.staged), "All should be staged");
    let result = git::commit::unstage_all(&path);
    assert!(result.is_ok(), "unstage_all failed: {:?}", result.err());
}

#[test]
fn test_set_upstream() {
    let path = setup_test_repo("upstream");
    let _ = git::remote::add_remote(&path, "test-origin", "https://github.com/test/test.git");
    // set_upstream requires the upstream ref to exist; use a local branch as fake upstream
    let _ = git::branch::create_branch(&path, "upstream-track", None);
    let result = git::branch::set_upstream(&path, "master", "upstream-track");
    assert!(result.is_ok(), "set_upstream failed: {:?}", result.err());
}

#[test]
fn test_commit() {
    let path = setup_test_repo("commit");
    let _ = git::commit::stage(&path, &["untracked.txt".to_string()]);
    let result = git::commit::commit(&path, "Test commit message", false, false, false);
    assert!(result.is_ok(), "commit failed: {:?}", result.err());
}

#[test]
fn test_revert() {
    let path = setup_test_repo("revert");
    // First commit all changes so working tree is clean
    let _ = git::commit::stage_all(&path);
    let _ = git::commit::commit(&path, "Clean state", false, false, false);
    let commits = git::log::get_commits(&path, None, 10, 0).unwrap();
    assert!(commits.len() >= 1);
    let sha = commits[0].sha.clone();
    let result = git::revert::revert(&path, &sha);
    assert!(result.is_ok(), "revert failed: {:?}", result.err());
}

#[test]
fn test_reset_soft() {
    let path = setup_test_repo("reset");
    let commits = git::log::get_commits(&path, None, 10, 0).unwrap();
    if commits.len() >= 1 {
        let sha = commits[0].sha.clone();
        let result = git::reset::reset(&path, &sha, "soft");
        assert!(result.is_ok(), "reset failed: {:?}", result.err());
    }
}
