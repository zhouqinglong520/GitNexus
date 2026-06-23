use crate::git;
use crate::models::*;
use tauri::Emitter;

// ============================================================
// Repository commands
// ============================================================

#[tauri::command]
pub fn git_open_repo(path: String) -> Result<RepositoryInfo, String> {
    git::repository::open_repo(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_init_repo(path: String, is_bare: bool) -> Result<String, String> {
    git::repository::init_repo(&path, is_bare).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_clone_repo(
    url: String,
    path: String,
    depth: Option<u32>,
    branch: Option<String>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let app = app_handle.clone();
    git::repository::clone_repo(
        &url,
        &path,
        depth,
        branch.as_deref(),
        move |line| {
            let _ = app.emit("git-clone-progress", line);
        },
    )
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_get_remotes(path: String) -> Result<Vec<Remote>, String> {
    git::repository::get_remotes(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_get_config(path: String, key: String) -> Result<String, String> {
    git::repository::get_config(&path, &key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_set_config(path: String, key: String, value: String) -> Result<(), String> {
    git::repository::set_config(&path, &key, &value).map_err(|e| e.to_string())
}

// ============================================================
// Log commands
// ============================================================

#[tauri::command]
pub fn git_get_commits(
    path: String,
    branch: Option<String>,
    limit: u32,
    offset: u32,
) -> Result<Vec<Commit>, String> {
    git::log::get_commits(&path, branch.as_deref(), limit, offset).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_get_commit_detail(path: String, sha: String) -> Result<CommitDetail, String> {
    git::log::get_commit_detail(&path, &sha).map_err(|e| e.to_string())
}

// ============================================================
// Status commands
// ============================================================

#[tauri::command]
pub fn git_get_status(path: String) -> Result<WorktreeStatus, String> {
    git::status::get_status(&path).map_err(|e| e.to_string())
}

// ============================================================
// Diff commands
// ============================================================

#[tauri::command]
pub fn git_get_diff(
    path: String,
    old_ref: Option<String>,
    new_ref: Option<String>,
    path_filter: Option<String>,
) -> Result<String, String> {
    git::diff::get_diff(&path, old_ref.as_deref(), new_ref.as_deref(), path_filter.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_get_diff_staged(path: String, file: Option<String>) -> Result<String, String> {
    git::diff::get_diff_staged(&path, file.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_get_diff_unstaged(path: String, file: Option<String>) -> Result<String, String> {
    git::diff::get_diff_unstaged(&path, file.as_deref()).map_err(|e| e.to_string())
}

// ============================================================
// Branch commands
// ============================================================

#[tauri::command]
pub fn git_list_branches(path: String) -> Result<Vec<Branch>, String> {
    git::branch::list_branches(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_create_branch(path: String, name: String, ref_name: Option<String>) -> Result<(), String> {
    git::branch::create_branch(&path, &name, ref_name.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_delete_branch(path: String, name: String, force: bool) -> Result<(), String> {
    git::branch::delete_branch(&path, &name, force).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_rename_branch(path: String, old_name: String, new_name: String) -> Result<(), String> {
    git::branch::rename_branch(&path, &old_name, &new_name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_checkout_branch(path: String, name: String) -> Result<(), String> {
    git::branch::checkout_branch(&path, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_set_upstream(path: String, branch: String, remote_branch: String) -> Result<(), String> {
    git::branch::set_upstream(&path, &branch, &remote_branch).map_err(|e| e.to_string())
}

// ============================================================
// Commit commands
// ============================================================

#[tauri::command]
pub fn git_commit(
    path: String,
    message: String,
    amend: bool,
    signoff: bool,
    no_verify: bool,
) -> Result<String, String> {
    git::commit::commit(&path, &message, amend, signoff, no_verify).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_stage(path: String, files: Vec<String>) -> Result<(), String> {
    git::commit::stage(&path, &files).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_unstage(path: String, files: Vec<String>) -> Result<(), String> {
    git::commit::unstage(&path, &files).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_stage_all(path: String) -> Result<(), String> {
    git::commit::stage_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_unstage_all(path: String) -> Result<(), String> {
    git::commit::unstage_all(&path).map_err(|e| e.to_string())
}

// ============================================================
// Push commands
// ============================================================

#[tauri::command]
pub async fn git_push(
    path: String,
    remote: Option<String>,
    branch: Option<String>,
    force: bool,
    force_with_lease: bool,
    set_upstream: bool,
    tags: bool,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let app = app_handle.clone();
    git::push::push(
        &path,
        remote.as_deref(),
        branch.as_deref(),
        force,
        force_with_lease,
        set_upstream,
        tags,
        move |line| {
            let _ = app.emit("git-push-progress", line);
        },
    )
    .await
    .map_err(|e| e.to_string())
}

// ============================================================
// Pull commands
// ============================================================

#[tauri::command]
pub async fn git_pull(
    path: String,
    remote: Option<String>,
    branch: Option<String>,
    rebase: bool,
    ff_only: bool,
    autostash: bool,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let app = app_handle.clone();
    git::pull::pull(
        &path,
        remote.as_deref(),
        branch.as_deref(),
        rebase,
        ff_only,
        autostash,
        move |line| {
            let _ = app.emit("git-pull-progress", line);
        },
    )
    .await
    .map_err(|e| e.to_string())
}

// ============================================================
// Fetch commands
// ============================================================

#[tauri::command]
pub async fn git_fetch(
    path: String,
    remote: Option<String>,
    prune: bool,
    tags: bool,
    depth: Option<u32>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let app = app_handle.clone();
    git::fetch::fetch(
        &path,
        remote.as_deref(),
        prune,
        tags,
        depth,
        move |line| {
            let _ = app.emit("git-fetch-progress", line);
        },
    )
    .await
    .map_err(|e| e.to_string())
}

// ============================================================
// Merge commands
// ============================================================

#[tauri::command]
pub async fn git_merge(
    path: String,
    branch: String,
    strategy: Option<String>,
    ff_mode: Option<String>,
) -> Result<(), String> {
    git::merge::merge(&path, &branch, strategy.as_deref(), ff_mode.as_deref()).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_abort_merge(path: String) -> Result<(), String> {
    git::merge::abort_merge(&path).map_err(|e| e.to_string())
}

// ============================================================
// Rebase commands
// ============================================================

#[tauri::command]
pub async fn git_rebase(
    path: String,
    onto: Option<String>,
    branch: Option<String>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let app = app_handle.clone();
    git::rebase::rebase(
        &path,
        onto.as_deref(),
        branch.as_deref(),
        move |line| {
            let _ = app.emit("git-rebase-progress", line);
        },
    )
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_rebase_continue(path: String) -> Result<(), String> {
    git::rebase::rebase_continue(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_rebase_skip(path: String) -> Result<(), String> {
    git::rebase::rebase_skip(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_rebase_abort(path: String) -> Result<(), String> {
    git::rebase::rebase_abort(&path).map_err(|e| e.to_string())
}

// ============================================================
// Stash commands
// ============================================================

#[tauri::command]
pub fn git_list_stash(path: String) -> Result<Vec<Stash>, String> {
    git::stash::list_stash(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_push_stash(path: String, message: Option<String>, keep_index: bool) -> Result<(), String> {
    git::stash::push_stash(&path, message.as_deref(), keep_index).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_pop_stash(path: String, index: u32) -> Result<(), String> {
    git::stash::pop_stash(&path, index).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_apply_stash(path: String, index: u32) -> Result<(), String> {
    git::stash::apply_stash(&path, index).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_drop_stash(path: String, index: u32) -> Result<(), String> {
    git::stash::drop_stash(&path, index).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_clear_stash(path: String) -> Result<(), String> {
    git::stash::clear_stash(&path).map_err(|e| e.to_string())
}

// ============================================================
// Tag commands
// ============================================================

#[tauri::command]
pub fn git_list_tags(path: String) -> Result<Vec<Tag>, String> {
    git::tag::list_tags(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_create_tag(
    path: String,
    name: String,
    message: Option<String>,
    ref_name: Option<String>,
) -> Result<(), String> {
    git::tag::create_tag(&path, &name, message.as_deref(), ref_name.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_delete_tag(path: String, name: String) -> Result<(), String> {
    git::tag::delete_tag(&path, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_push_tag(path: String, name: String, remote: String) -> Result<(), String> {
    git::tag::push_tag(&path, &name, &remote).map_err(|e| e.to_string())
}

// ============================================================
// Remote commands
// ============================================================

#[tauri::command]
pub fn git_add_remote(path: String, name: String, url: String) -> Result<(), String> {
    git::remote::add_remote(&path, &name, &url).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_remove_remote(path: String, name: String) -> Result<(), String> {
    git::remote::remove_remote(&path, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_prune_remote(path: String, name: String) -> Result<(), String> {
    git::remote::prune_remote(&path, &name).map_err(|e| e.to_string())
}

// ============================================================
// Cherry-pick commands
// ============================================================

#[tauri::command]
pub fn git_cherry_pick(path: String, sha: String) -> Result<(), String> {
    git::cherry_pick::cherry_pick(&path, &sha).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_cherry_pick_continue(path: String) -> Result<(), String> {
    git::cherry_pick::cherry_pick_continue(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_cherry_pick_abort(path: String) -> Result<(), String> {
    git::cherry_pick::cherry_pick_abort(&path).map_err(|e| e.to_string())
}

// ============================================================
// Reset commands
// ============================================================

#[tauri::command]
pub fn git_reset(path: String, sha: String, mode: String) -> Result<(), String> {
    git::reset::reset(&path, &sha, &mode).map_err(|e| e.to_string())
}

// ============================================================
// Revert commands
// ============================================================

#[tauri::command]
pub fn git_revert(path: String, sha: String) -> Result<(), String> {
    git::revert::revert(&path, &sha).map_err(|e| e.to_string())
}

// ============================================================
// Blame commands
// ============================================================

#[tauri::command]
pub fn git_blame(
    path: String,
    file: String,
    line_start: Option<u32>,
    line_end: Option<u32>,
) -> Result<Vec<BlameLine>, String> {
    git::blame::blame(&path, &file, line_start, line_end).map_err(|e| e.to_string())
}

// ============================================================
// Submodule commands
// ============================================================

#[tauri::command]
pub fn git_list_submodules(path: String) -> Result<Vec<Submodule>, String> {
    git::submodule::list_submodules(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_add_submodule(
    path: String,
    url: String,
    name: Option<String>,
    branch: Option<String>,
) -> Result<(), String> {
    git::submodule::add_submodule(&path, &url, name.as_deref(), branch.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_update_submodule(
    path: String,
    name: Option<String>,
    init: bool,
    recursive: bool,
) -> Result<(), String> {
    git::submodule::update_submodule(&path, name.as_deref(), init, recursive).map_err(|e| e.to_string())
}

// ============================================================
// Worktree commands
// ============================================================

#[tauri::command]
pub fn git_list_worktrees(path: String) -> Result<Vec<Worktree>, String> {
    git::worktree::list_worktrees(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_add_worktree(
    path: String,
    worktree_path: String,
    branch: Option<String>,
    create_branch: bool,
) -> Result<(), String> {
    git::worktree::add_worktree(&path, &worktree_path, branch.as_deref(), create_branch)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_remove_worktree(path: String, worktree_path: String, force: bool) -> Result<(), String> {
    git::worktree::remove_worktree(&path, &worktree_path, force).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_prune_worktrees(path: String) -> Result<(), String> {
    git::worktree::prune_worktrees(&path).map_err(|e| e.to_string())
}

// ============================================================
// Statistics commands
// ============================================================

#[tauri::command]
pub fn git_get_statistics(path: String) -> Result<RepositoryStats, String> {
    git::statistics::get_statistics(&path).map_err(|e| e.to_string())
}

// ============================================================
// Archive commands
// ============================================================

#[tauri::command]
pub fn git_create_archive(
    path: String,
    output: String,
    ref_name: String,
    format: String,
) -> Result<(), String> {
    git::archive::create_archive(&path, &output, &ref_name, &format).map_err(|e| e.to_string())
}

// ============================================================
// Discard commands
// ============================================================

#[tauri::command]
pub fn git_discard_changes(path: String, files: Vec<String>) -> Result<(), String> {
    git::discard::discard_changes(&path, &files).map_err(|e| e.to_string())
}
