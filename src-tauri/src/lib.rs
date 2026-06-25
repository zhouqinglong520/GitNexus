mod commands;
pub mod ai;
pub mod avatar;
pub mod git;
pub mod gitee;
pub mod mirror;
pub mod models;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            // Repository
            commands::git_open_repo,
            commands::git_init_repo,
            commands::git_clone_repo,
            commands::git_get_remotes,
            commands::git_get_config,
            commands::git_set_config,
            // Log
            commands::git_get_commits,
            commands::git_get_commit_detail,
            // Status
            commands::git_get_status,
            // Diff
            commands::git_get_diff,
            commands::git_diff_revisions,
            commands::git_get_diff_staged,
            commands::git_get_diff_unstaged,
            // Branch
            commands::git_list_branches,
            commands::git_create_branch,
            commands::git_delete_branch,
            commands::git_rename_branch,
            commands::git_checkout_branch,
            commands::git_set_upstream,
            // Commit
            commands::git_commit,
            commands::git_stage,
            commands::git_unstage,
            commands::git_stage_all,
            commands::git_unstage_all,
            // Hunk staging
            commands::git_stage_hunk,
            commands::git_unstage_hunk,
            // Push
            commands::git_push,
            // Pull
            commands::git_pull,
            // Fetch
            commands::git_fetch,
            // Merge
            commands::git_merge,
            commands::git_abort_merge,
            // Rebase
            commands::git_rebase,
            commands::git_rebase_continue,
            commands::git_rebase_skip,
            commands::git_rebase_abort,
            // Stash
            commands::git_list_stash,
            commands::git_push_stash,
            commands::git_pop_stash,
            commands::git_apply_stash,
            commands::git_drop_stash,
            commands::git_clear_stash,
            // Tag
            commands::git_list_tags,
            commands::git_create_tag,
            commands::git_delete_tag,
            commands::git_push_tag,
            // Remote
            commands::git_add_remote,
            commands::git_remove_remote,
            commands::git_prune_remote,
            // Cherry-pick
            commands::git_cherry_pick,
            commands::git_cherry_pick_continue,
            commands::git_cherry_pick_abort,
            // Reset
            commands::git_reset,
            // Revert
            commands::git_revert,
            // Blame
            commands::git_blame,
            // Submodule
            commands::git_list_submodules,
            commands::git_add_submodule,
            commands::git_update_submodule,
            // Worktree
            commands::git_list_worktrees,
            commands::git_add_worktree,
            commands::git_remove_worktree,
            commands::git_prune_worktrees,
            // Statistics
            commands::git_get_statistics,
            // Archive
            commands::git_create_archive,
            // Discard
            commands::git_discard_changes,
            // Stash show
            commands::git_show_stash,
            // Remote edit / delete remote tag
            commands::git_edit_remote,
            commands::git_delete_remote_tag,
            // Search
            commands::git_search_commits,
            // In-progress state
            commands::git_get_in_progress,
            // Conflict
            commands::git_get_merge_conflicts,
            // File operations
            commands::git_assume_unchanged,
            commands::git_skip_worktree,
            commands::git_add_to_gitignore,
            commands::git_delete_files,
            // Patch
            commands::git_save_patch,
            commands::git_apply_patch,
            // Interactive rebase
            commands::git_start_interactive_rebase,
            commands::git_start_interactive_rebase_with_todos,
            // File history / commit children
            commands::git_get_file_history,
            commands::git_get_commit_children,
            // Platform
            commands::git_get_git_version,
            commands::git_get_app_version,
            commands::git_open_in_file_manager,
            commands::git_open_in_terminal,
            commands::git_open_in_browser,
            // GitFlow
            commands::gitflow_is_available,
            commands::gitflow_init,
            commands::gitflow_start,
            commands::gitflow_finish,
            commands::gitflow_list,
            // Bisect
            commands::git_bisect_start,
            commands::git_bisect_mark,
            commands::git_bisect_reset,
            commands::git_bisect_log,
            commands::git_bisect_status,
            // LFS
            commands::git_lfs_is_available,
            commands::git_lfs_track,
            commands::git_lfs_untrack,
            commands::git_lfs_list_tracks,
            commands::git_lfs_fetch,
            commands::git_lfs_pull,
            commands::git_lfs_push,
            commands::git_lfs_prune,
            commands::git_lfs_lock,
            commands::git_lfs_unlock,
            commands::git_lfs_list_locks,
            // File Watcher
            commands::start_file_watcher,
            // Command Log
            commands::git_get_command_logs,
            commands::git_clear_command_logs,
            commands::git_get_command_log_count,
            // Custom Actions
            commands::git_execute_custom_action,
            // Repo Config
            commands::git_get_repo_config,
            commands::git_save_repo_config,
            // AI
            commands::ai_generate_commit_message,
            commands::ai_fetch_models,
            // PR / Platform
            commands::detect_platform,
            commands::create_pull_request,
            // Mirror
            commands::test_mirror_latency,
            commands::get_mirror_url,
            // GC
            commands::git_run_gc,
            // Scan repositories
            commands::git_scan_repositories,
            // Diff revision files / query file content
            commands::git_diff_revision_files,
            commands::git_query_file_content,
            // Submodule additional
            commands::git_deinit_submodule,
            commands::git_set_submodule_branch,
            commands::git_change_submodule_url,
            // Branch track status
            commands::git_query_track_status,
            // Rebase edit message
            commands::git_rebase_edit_message,
            // Platform additional
            commands::git_find_git_executable,
            commands::git_find_external_tools,
            // Avatar
            commands::get_avatar,
            commands::clear_avatar_cache,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
