mod commands;
pub mod git;
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
