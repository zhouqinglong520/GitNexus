use app_lib::git::{self};
use app_lib::git::command_log;
use app_lib::git::custom_action::RepoConfig;
use std::sync::Mutex;

// Use a mutex to prevent parallel test repo conflicts
static REPO_MUTEX: Mutex<()> = Mutex::new(());

/// Helper: create a test repo with known state. Returns repo path.
fn setup_test_repo(name: &str) -> String {
    let _lock = REPO_MUTEX.lock().unwrap();
    let path = format!("/tmp/gitnexus-test-{}", name);
    let _ = std::fs::remove_dir_all(&path);
    std::fs::create_dir_all(&path).unwrap();

    let git = git::command::GitCommand::new(path.as_str());
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

// ============================================================
// 1. stash::show_stash
// ============================================================

#[test]
fn test_stash_show() {
    let path = setup_test_repo("stash_show");
    let result = git::stash::show_stash(&path, 0);
    assert!(result.is_ok(), "show_stash failed: {:?}", result.err());
    let diff = result.unwrap();
    assert!(!diff.is_empty(), "Stash diff should not be empty");
}

// ============================================================
// 2. remote::edit_remote
// ============================================================

#[test]
fn test_edit_remote() {
    let path = setup_test_repo("edit_remote");
    // Add a remote first
    let result = git::remote::add_remote(&path, "test-origin", "https://github.com/test/test.git");
    assert!(result.is_ok(), "add_remote failed: {:?}", result.err());

    // Edit the remote URL
    let result = git::remote::edit_remote(&path, "test-origin", "https://github.com/new/url.git");
    assert!(result.is_ok(), "edit_remote failed: {:?}", result.err());

    // Verify the URL was updated by reading the config
    let url = git::repository::get_config(&path, "remote.test-origin.url").unwrap();
    assert_eq!(url, "https://github.com/new/url.git", "Remote URL should be updated");
}

// ============================================================
// 3. remote::delete_remote_tag
// ============================================================

#[test]
fn test_delete_remote_tag() {
    let path = setup_test_repo("delete_remote_tag");
    // Add a fake remote (no actual remote repo exists)
    let _ = git::remote::add_remote(&path, "fake-remote", "https://github.com/nonexistent/repo.git");

    // delete_remote_tag should fail because there is no real remote
    let result = git::remote::delete_remote_tag(&path, "v0.1.0", "fake-remote");
    assert!(result.is_err(), "delete_remote_tag should fail with no real remote");
}

// ============================================================
// 4. search::search_commits
// ============================================================

#[test]
fn test_search_commits() {
    let _lock = REPO_MUTEX.lock().unwrap();
    let path = "/tmp/gitnexus-test-search_commits";
    let _ = std::fs::remove_dir_all(path);
    std::fs::create_dir_all(path).unwrap();

    let git = git::command::GitCommand::new(path);
    git.read_to_end(&["init"]).unwrap();
    git.read_to_end(&["config", "user.email", "test@gitnexus.dev"]).unwrap();
    git.read_to_end(&["config", "user.name", "GitNexus Test"]).unwrap();

    std::fs::write(format!("{}/README.md", path), "Hello\n").unwrap();
    git.read_to_end(&["add", "-A"]).unwrap();
    git.read_to_end(&["commit", "-m", "Initial commit"]).unwrap();

    std::fs::write(format!("{}/README.md", path), "Hello\nWorld\n").unwrap();
    git.read_to_end(&["add", "-A"]).unwrap();
    git.read_to_end(&["commit", "-m", "Add feature: world support"]).unwrap();

    std::fs::write(format!("{}/README.md", path), "Hello\nWorld\nFoo\n").unwrap();
    git.read_to_end(&["add", "-A"]).unwrap();
    git.read_to_end(&["commit", "-m", "Fix unrelated issue"]).unwrap();

    // Search for "feature"
    let result = git::search::search_commits(path, "feature", None, None, None, 10);
    assert!(result.is_ok(), "search_commits failed: {:?}", result.err());
    let commits = result.unwrap();
    assert!(
        commits.iter().any(|c| c.subject.contains("feature")),
        "Should find a commit with 'feature' in subject"
    );
    assert!(
        !commits.iter().any(|c| c.subject.contains("unrelated")),
        "Should not find the unrelated commit"
    );
}

// ============================================================
// 5. in_progress::get_in_progress
// ============================================================

#[test]
fn test_get_in_progress_no_operation() {
    let path = setup_test_repo("in_progress");
    let result = git::in_progress::get_in_progress(&path);
    assert!(result.is_ok(), "get_in_progress failed: {:?}", result.err());
    let state = result.unwrap();
    assert!(
        state.operation.is_empty(),
        "Expected no in-progress operation, got '{}'",
        state.operation
    );
    assert!(state.detail.is_none(), "Expected no detail");
}

// ============================================================
// 6. conflict::get_merge_conflicts
// ============================================================

#[test]
fn test_get_merge_conflicts_no_conflicts() {
    let path = setup_test_repo("no_conflicts");
    let result = git::conflict::get_merge_conflicts(&path);
    assert!(result.is_ok(), "get_merge_conflicts failed: {:?}", result.err());
    let conflicts = result.unwrap();
    assert!(
        conflicts.is_empty(),
        "Expected no conflicts in a clean repo, got {}",
        conflicts.len()
    );
}

// ============================================================
// 7. file_ops::assume_unchanged
// ============================================================

#[test]
fn test_assume_unchanged() {
    let path = setup_test_repo("assume_unchanged");
    // README.md is already modified by setup_test_repo

    // Enable assume-unchanged on README.md
    let result = git::file_ops::assume_unchanged(&path, &["README.md".to_string()], true);
    assert!(result.is_ok(), "assume_unchanged (enable) failed: {:?}", result.err());

    // Verify README.md no longer appears as modified in git status
    let status = git::status::get_status(&path).unwrap();
    let readme_modified = status.changes.iter().any(|c| c.path == "README.md");
    assert!(
        !readme_modified,
        "README.md should not appear as modified after assume-unchanged"
    );

    // Restore assume-unchanged
    let result = git::file_ops::assume_unchanged(&path, &["README.md".to_string()], false);
    assert!(result.is_ok(), "assume_unchanged (disable) failed: {:?}", result.err());

    // README.md should show as modified again
    let status = git::status::get_status(&path).unwrap();
    let readme_modified = status.changes.iter().any(|c| c.path == "README.md");
    assert!(
        readme_modified,
        "README.md should appear as modified after disabling assume-unchanged"
    );
}

// ============================================================
// 8. file_ops::skip_worktree
// ============================================================

#[test]
fn test_skip_worktree() {
    let path = setup_test_repo("skip_worktree");
    // README.md is already modified by setup_test_repo

    // Enable skip-worktree on README.md
    let result = git::file_ops::skip_worktree(&path, &["README.md".to_string()], true);
    assert!(result.is_ok(), "skip_worktree (enable) failed: {:?}", result.err());

    // Verify README.md no longer appears as modified in git status
    let status = git::status::get_status(&path).unwrap();
    let readme_modified = status.changes.iter().any(|c| c.path == "README.md");
    assert!(
        !readme_modified,
        "README.md should not appear as modified after skip-worktree"
    );

    // Restore skip-worktree
    let result = git::file_ops::skip_worktree(&path, &["README.md".to_string()], false);
    assert!(result.is_ok(), "skip_worktree (disable) failed: {:?}", result.err());

    // README.md should show as modified again
    let status = git::status::get_status(&path).unwrap();
    let readme_modified = status.changes.iter().any(|c| c.path == "README.md");
    assert!(
        readme_modified,
        "README.md should appear as modified after disabling skip-worktree"
    );
}

// ============================================================
// 9. file_ops::add_to_gitignore
// ============================================================

#[test]
fn test_add_to_gitignore() {
    let path = setup_test_repo("gitignore");
    let result = git::file_ops::add_to_gitignore(&path, &["*.log".to_string()]);
    assert!(result.is_ok(), "add_to_gitignore failed: {:?}", result.err());

    let gitignore_path = format!("{}/.gitignore", path);
    let content = std::fs::read_to_string(&gitignore_path).unwrap();
    assert!(
        content.contains("*.log"),
        ".gitignore should contain '*.log', got: {}",
        content
    );
}

// ============================================================
// 10. file_ops::delete_files
// ============================================================

#[test]
fn test_delete_files() {
    let path = setup_test_repo("delete_files");
    // untracked.txt exists but is not tracked; stage it first so it becomes tracked
    let _ = git::commit::stage(&path, &["untracked.txt".to_string()]);
    let _ = git::commit::commit(&path, "Add untracked.txt", false, false, false);

    // Verify the file exists before deletion
    assert!(
        std::path::Path::new(&format!("{}/untracked.txt", path)).exists(),
        "untracked.txt should exist before deletion"
    );

    // Delete the file via git rm
    let result = git::file_ops::delete_files(&path, &["untracked.txt".to_string()]);
    assert!(result.is_ok(), "delete_files failed: {:?}", result.err());

    // Verify the file no longer exists
    assert!(
        !std::path::Path::new(&format!("{}/untracked.txt", path)).exists(),
        "untracked.txt should be deleted"
    );
}

// ============================================================
// 11. patch::save_patch
// ============================================================

#[test]
fn test_save_patch() {
    let path = setup_test_repo("save_patch");
    let output_dir = format!("{}/patches", path);
    std::fs::create_dir_all(&output_dir).unwrap();

    let commits = git::log::get_commits(&path, None, 1, 0).unwrap();
    assert!(!commits.is_empty());
    let sha = &commits[0].sha;

    let result = git::patch::save_patch(&path, &output_dir, sha);
    assert!(result.is_ok(), "save_patch failed: {:?}", result.err());
    let patch_file = result.unwrap();

    assert!(
        std::path::Path::new(&patch_file).exists(),
        "Patch file should exist at {}",
        patch_file
    );
    let content = std::fs::read_to_string(&patch_file).unwrap();
    assert!(!content.is_empty(), "Patch file content should not be empty");
}

// ============================================================
// 12. patch::apply_patch
// ============================================================

#[test]
fn test_apply_patch() {
    let _lock = REPO_MUTEX.lock().unwrap();
    let path = "/tmp/gitnexus-test-apply_patch";
    let _ = std::fs::remove_dir_all(path);
    std::fs::create_dir_all(path).unwrap();

    let git = git::command::GitCommand::new(path);
    git.read_to_end(&["init"]).unwrap();
    git.read_to_end(&["config", "user.email", "test@gitnexus.dev"]).unwrap();
    git.read_to_end(&["config", "user.name", "GitNexus Test"]).unwrap();

    // Create a file and commit
    std::fs::write(format!("{}/data.txt", path), "line1\nline2\nline3\n").unwrap();
    git.read_to_end(&["add", "-A"]).unwrap();
    git.read_to_end(&["commit", "-m", "Add data.txt"]).unwrap();

    // Modify the file and commit
    std::fs::write(format!("{}/data.txt", path), "line1\nmodified\nline3\n").unwrap();
    git.read_to_end(&["add", "-A"]).unwrap();
    git.read_to_end(&["commit", "-m", "Modify data.txt"]).unwrap();

    // Get the second commit SHA
    let commits = git::log::get_commits(path, None, 2, 0).unwrap();
    assert!(commits.len() >= 2);
    let modify_sha = &commits[0].sha;

    // Save patch for the modification commit
    let output_dir = format!("{}/patches", path);
    std::fs::create_dir_all(&output_dir).unwrap();
    let patch_file = git::patch::save_patch(path, &output_dir, modify_sha).unwrap();
    assert!(std::path::Path::new(&patch_file).exists());

    // Reset to the first commit (restore original file)
    let first_sha = &commits[1].sha;
    git::reset::reset(path, first_sha, "hard").unwrap();

    // Verify file is back to original
    let content = std::fs::read_to_string(format!("{}/data.txt", path)).unwrap();
    assert_eq!(content, "line1\nline2\nline3\n");

    // Apply the patch
    let result = git::patch::apply_patch(path, &patch_file);
    assert!(result.is_ok(), "apply_patch failed: {:?}", result.err());

    // Verify file content is modified
    let content = std::fs::read_to_string(format!("{}/data.txt", path)).unwrap();
    assert_eq!(content, "line1\nmodified\nline3\n", "File should be modified after applying patch");
}

// ============================================================
// 13. log::get_file_history
// ============================================================

#[test]
fn test_get_file_history() {
    let _lock = REPO_MUTEX.lock().unwrap();
    let path = "/tmp/gitnexus-test-file_history";
    let _ = std::fs::remove_dir_all(path);
    std::fs::create_dir_all(path).unwrap();

    let git = git::command::GitCommand::new(path);
    git.read_to_end(&["init"]).unwrap();
    git.read_to_end(&["config", "user.email", "test@gitnexus.dev"]).unwrap();
    git.read_to_end(&["config", "user.name", "GitNexus Test"]).unwrap();

    std::fs::write(format!("{}/README.md", path), "v1\n").unwrap();
    git.read_to_end(&["add", "-A"]).unwrap();
    git.read_to_end(&["commit", "-m", "First version"]).unwrap();

    std::fs::write(format!("{}/README.md", path), "v1\nv2\n").unwrap();
    git.read_to_end(&["add", "-A"]).unwrap();
    git.read_to_end(&["commit", "-m", "Second version"]).unwrap();

    std::fs::write(format!("{}/README.md", path), "v1\nv2\nv3\n").unwrap();
    git.read_to_end(&["add", "-A"]).unwrap();
    git.read_to_end(&["commit", "-m", "Third version"]).unwrap();

    let result = git::log::get_file_history(path, "README.md", 10);
    assert!(result.is_ok(), "get_file_history failed: {:?}", result.err());
    let commits = result.unwrap();
    assert!(
        commits.len() >= 3,
        "Expected at least 3 commits for README.md, got {}",
        commits.len()
    );
    assert!(
        commits.iter().any(|c| c.subject.contains("First version")),
        "Should find 'First version' commit"
    );
}

// ============================================================
// 14. log::get_commit_children
// ============================================================

#[test]
fn test_get_commit_children() {
    let _lock = REPO_MUTEX.lock().unwrap();
    let path = "/tmp/gitnexus-test-commit_children";
    let _ = std::fs::remove_dir_all(path);
    std::fs::create_dir_all(path).unwrap();

    let git = git::command::GitCommand::new(path);
    git.read_to_end(&["init"]).unwrap();
    git.read_to_end(&["config", "user.email", "test@gitnexus.dev"]).unwrap();
    git.read_to_end(&["config", "user.name", "GitNexus Test"]).unwrap();

    std::fs::write(format!("{}/README.md", path), "init\n").unwrap();
    git.read_to_end(&["add", "-A"]).unwrap();
    git.read_to_end(&["commit", "-m", "Initial commit"]).unwrap();

    // Get the initial commit SHA
    let commits = git::log::get_commits(path, None, 1, 0).unwrap();
    let initial_sha = &commits[0].sha;

    // Create a feature branch from the initial commit
    git.read_to_end(&["checkout", "-b", "feature", initial_sha]).unwrap();
    std::fs::write(format!("{}/feature.txt", path), "feature\n").unwrap();
    git.read_to_end(&["add", "-A"]).unwrap();
    git.read_to_end(&["commit", "-m", "Feature commit"]).unwrap();

    // Go back to master and add another commit
    git.read_to_end(&["checkout", "master"]).unwrap();
    std::fs::write(format!("{}/master.txt", path), "master\n").unwrap();
    git.read_to_end(&["add", "-A"]).unwrap();
    git.read_to_end(&["commit", "-m", "Master commit"]).unwrap();

    // Get children of the initial commit
    let result = git::log::get_commit_children(path, initial_sha);
    assert!(result.is_ok(), "get_commit_children failed: {:?}", result.err());
    let children = result.unwrap();
    assert!(
        children.len() >= 2,
        "Expected at least 2 children for initial commit, got {}",
        children.len()
    );
}

// ============================================================
// 15. platform::get_git_version
// ============================================================

#[test]
fn test_get_git_version() {
    let result = git::platform::get_git_version();
    assert!(result.is_ok(), "get_git_version failed: {:?}", result.err());
    let version = result.unwrap();
    assert!(
        version.contains("git version"),
        "Version string should contain 'git version', got: '{}'",
        version
    );
}

// ============================================================
// 16. platform::get_app_version
// ============================================================

#[test]
fn test_get_app_version() {
    let version = git::platform::get_app_version();
    assert!(
        !version.is_empty(),
        "App version should not be empty"
    );
}

// ============================================================
// 17. gitflow::gitflow_list (not initialized)
// ============================================================

#[test]
fn test_gitflow_list_not_initialized() {
    let _lock = REPO_MUTEX.lock().unwrap();
    let path = "/tmp/gitnexus-test-gitflow_list";
    let _ = std::fs::remove_dir_all(&path);
    std::fs::create_dir_all(&path).unwrap();

    let git = git::command::GitCommand::new(path);
    git.read_to_end(&["init"]).unwrap();
    git.read_to_end(&["config", "user.email", "test@gitnexus.dev"]).unwrap();
    git.read_to_end(&["config", "user.name", "GitNexus Test"]).unwrap();

    std::fs::write(format!("{}/README.md", path), "Hello\n").unwrap();
    git.read_to_end(&["add", "-A"]).unwrap();
    git.read_to_end(&["commit", "-m", "Initial commit"]).unwrap();
    // Do NOT create any feature/ release/ hotfix/ branches

    let result = git::gitflow::gitflow_list(&path);
    assert!(result.is_ok(), "gitflow_list failed: {:?}", result.err());
    let status = result.unwrap();
    assert!(
        !status.is_initialized,
        "GitFlow should not be initialized in a normal repo"
    );
    assert_eq!(status.features.len(), 0, "Should have no features");
    assert_eq!(status.releases.len(), 0, "Should have no releases");
    assert_eq!(status.hotfixes.len(), 0, "Should have no hotfixes");
}

// ============================================================
// 18. bisect::bisect_status
// ============================================================

#[test]
fn test_bisect_status_no_bisect() {
    let path = setup_test_repo("bisect_status");
    let result = git::bisect::bisect_status(&path);
    assert!(result.is_ok(), "bisect_status failed: {:?}", result.err());
    let status = result.unwrap();
    assert!(
        status.is_none(),
        "bisect_status should return None when no bisect is active"
    );
}

// ============================================================
// 19. command_log module
// ============================================================

#[test]
fn test_command_log() {
    // Clear any existing logs first
    command_log::clear_logs();

    // Perform some git operations to generate logs
    let path = setup_test_repo("command_log");
    let _ = git::log::get_commits(&path, None, 5, 0);
    let _ = git::status::get_status(&path);

    // Get logs
    let logs = command_log::get_logs(100, 0);
    // There should be logs from the git operations performed during setup_test_repo
    // and the operations above
    assert!(
        logs.len() >= 2,
        "Expected at least 2 log entries, got {}",
        logs.len()
    );

    // Verify log entries have expected fields
    for entry in &logs {
        assert!(!entry.command.is_empty(), "Log entry command should not be empty");
        assert!(entry.id > 0, "Log entry id should be positive");
    }

    // Clear logs
    command_log::clear_logs();

    // Verify logs are cleared
    let logs = command_log::get_logs(100, 0);
    assert!(logs.is_empty(), "Logs should be empty after clear");
}

// ============================================================
// 20. custom_action::get_repo_config / save_repo_config
// ============================================================

#[test]
fn test_repo_config() {
    let path = setup_test_repo("repo_config");

    // Ensure the .git directory exists (it should, since this is a normal repo)
    let git_dir = std::path::Path::new(&path).join(".git");
    assert!(git_dir.exists(), ".git directory should exist");

    // Create a config with some values
    let config = RepoConfig {
        default_remote: Some("origin".to_string()),
        merge_mode: Some("merge".to_string()),
        submodule_auto_update: Some(true),
        commit_types: Some(vec![
            app_lib::git::custom_action::CommitType {
                name: "feat".to_string(),
                description: "A new feature".to_string(),
                emoji: Some("sparkles".to_string()),
            },
        ]),
        commit_template: Some("feat: {{message}}".to_string()),
        ai_service: Some("openai".to_string()),
        custom_actions: None,
        issue_tracking_rules: None,
    };

    // Save config
    let result = git::custom_action::save_repo_config(&path, &config);
    assert!(result.is_ok(), "save_repo_config failed: {:?}", result.err());

    // Verify the settings file was created
    let settings_path = git_dir.join("gitui.settings");
    assert!(settings_path.exists(), "gitui.settings file should exist");

    // Read config back
    let result = git::custom_action::get_repo_config(&path);
    assert!(result.is_ok(), "get_repo_config failed: {:?}", result.err());
    let loaded = result.unwrap();

    // Verify content matches
    assert_eq!(loaded.default_remote, Some("origin".to_string()));
    assert_eq!(loaded.merge_mode, Some("merge".to_string()));
    assert_eq!(loaded.submodule_auto_update, Some(true));
    assert_eq!(loaded.commit_template, Some("feat: {{message}}".to_string()));
    assert_eq!(loaded.ai_service, Some("openai".to_string()));

    // Verify commit_types
    let commit_types = loaded.commit_types.unwrap();
    assert_eq!(commit_types.len(), 1);
    assert_eq!(commit_types[0].name, "feat");
    assert_eq!(commit_types[0].description, "A new feature");
    assert_eq!(commit_types[0].emoji, Some("sparkles".to_string()));
}
