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
pub async fn git_get_commits(
    path: String,
    branch: Option<String>,
    limit: u32,
    offset: u32,
) -> Result<Vec<Commit>, String> {
    let result = tokio::task::spawn_blocking(move || {
        git::log::get_commits(&path, branch.as_deref(), limit, offset)
    }).await.map_err(|e| e.to_string())?;
    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_get_commit_detail(path: String, sha: String) -> Result<CommitDetail, String> {
    let result = tokio::task::spawn_blocking(move || {
        git::log::get_commit_detail(&path, &sha)
    }).await.map_err(|e| e.to_string())?;
    result.map_err(|e| e.to_string())
}

// ============================================================
// Status commands
// ============================================================

#[tauri::command]
pub async fn git_get_status(path: String) -> Result<WorktreeStatus, String> {
    let result = tokio::task::spawn_blocking(move || {
        git::status::get_status(&path)
    }).await.map_err(|e| e.to_string())?;
    result.map_err(|e| e.to_string())
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
    ignore_whitespace: Option<bool>,
    context_lines: Option<u32>,
) -> Result<String, String> {
    git::diff::get_diff(&path, old_ref.as_deref(), new_ref.as_deref(), path_filter.as_deref(), ignore_whitespace, context_lines)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_diff_revisions(
    path: String,
    old_ref: String,
    new_ref: String,
    path_filter: Option<String>,
) -> Result<String, String> {
    git::diff::get_diff(&path, Some(&old_ref), Some(&new_ref), path_filter.as_deref(), None, None)
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

#[tauri::command]
pub fn git_stage_hunk(path: String, file: String, patch_text: String) -> Result<(), String> {
    git::commit::stage_hunk(&path, &file, &patch_text).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_unstage_hunk(path: String, file: String, patch_text: String) -> Result<(), String> {
    git::commit::unstage_hunk(&path, &file, &patch_text).map_err(|e| e.to_string())
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
pub async fn git_list_stash(path: String) -> Result<Vec<Stash>, String> {
    let result = tokio::task::spawn_blocking(move || {
        git::stash::list_stash(&path)
    }).await.map_err(|e| e.to_string())?;
    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_push_stash(path: String, message: Option<String>, keep_index: bool, include_untracked: bool) -> Result<(), String> {
    git::stash::push_stash(&path, message.as_deref(), keep_index, include_untracked).map_err(|e| e.to_string())
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
pub async fn git_blame(
    path: String,
    file: String,
    line_start: Option<u32>,
    line_end: Option<u32>,
) -> Result<Vec<BlameLine>, String> {
    let result = tokio::task::spawn_blocking(move || {
        git::blame::blame(&path, &file, line_start, line_end)
    }).await.map_err(|e| e.to_string())?;
    result.map_err(|e| e.to_string())
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
pub async fn git_get_statistics(path: String, since: Option<String>) -> Result<RepositoryStats, String> {
    git::statistics::get_statistics(&path, since.as_deref()).await.map_err(|e| e.to_string())
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

// ============================================================
// Stash show command
// ============================================================

#[tauri::command]
pub fn git_show_stash(path: String, index: u32) -> Result<String, String> {
    git::stash::show_stash(&path, index).map_err(|e| e.to_string())
}

// ============================================================
// Remote edit / delete remote tag commands
// ============================================================

#[tauri::command]
pub fn git_edit_remote(path: String, name: String, new_url: String) -> Result<(), String> {
    git::remote::edit_remote(&path, &name, &new_url).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_delete_remote_tag(path: String, name: String, remote: String) -> Result<(), String> {
    git::remote::delete_remote_tag(&path, &name, &remote).map_err(|e| e.to_string())
}

// ============================================================
// Search commands
// ============================================================

#[tauri::command]
pub async fn git_search_commits(
    path: String,
    query: String,
    author: Option<String>,
    since: Option<String>,
    until: Option<String>,
    limit: u32,
) -> Result<Vec<Commit>, String> {
    let result = tokio::task::spawn_blocking(move || {
        git::search::search_commits(
            &path,
            &query,
            author.as_deref(),
            since.as_deref(),
            until.as_deref(),
            limit,
        )
    }).await.map_err(|e| e.to_string())?;
    result.map_err(|e| e.to_string())
}

// ============================================================
// In-progress state commands
// ============================================================

#[tauri::command]
pub fn git_get_in_progress(path: String) -> Result<InProgressState, String> {
    git::in_progress::get_in_progress(&path).map_err(|e| e.to_string())
}

// ============================================================
// Conflict commands
// ============================================================

#[tauri::command]
pub fn git_get_merge_conflicts(path: String) -> Result<Vec<ConflictFile>, String> {
    git::conflict::get_merge_conflicts(&path).map_err(|e| e.to_string())
}

// ============================================================
// File operations commands
// ============================================================

#[tauri::command]
pub fn git_assume_unchanged(path: String, files: Vec<String>, enable: bool) -> Result<(), String> {
    git::file_ops::assume_unchanged(&path, &files, enable).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_skip_worktree(path: String, files: Vec<String>, enable: bool) -> Result<(), String> {
    git::file_ops::skip_worktree(&path, &files, enable).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_add_to_gitignore(path: String, patterns: Vec<String>) -> Result<(), String> {
    git::file_ops::add_to_gitignore(&path, &patterns).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_delete_files(path: String, files: Vec<String>) -> Result<(), String> {
    git::file_ops::delete_files(&path, &files).map_err(|e| e.to_string())
}

// ============================================================
// Patch commands
// ============================================================

#[tauri::command]
pub fn git_save_patch(path: String, output_dir: String, sha: String) -> Result<String, String> {
    git::patch::save_patch(&path, &output_dir, &sha).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_apply_patch(path: String, patch_file: String) -> Result<(), String> {
    git::patch::apply_patch(&path, &patch_file).map_err(|e| e.to_string())
}

// ============================================================
// Interactive rebase command
// ============================================================

#[tauri::command]
pub async fn git_start_interactive_rebase(
    path: String,
    onto: Option<String>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let app = app_handle.clone();
    git::rebase::start_interactive_rebase(&path, onto.as_deref(), move |line| {
        let _ = app.emit("git-rebase-progress", line);
    })
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_start_interactive_rebase_with_todos(
    path: String,
    onto: String,
    todo_text: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let app = app_handle.clone();
    git::rebase::start_interactive_rebase_with_todos(&path, &onto, &todo_text, move |line| {
        let _ = app.emit("git-rebase-progress", line);
    })
    .await
    .map_err(|e| e.to_string())
}

// ============================================================
// File history / commit children commands
// ============================================================

#[tauri::command]
pub async fn git_get_file_history(path: String, file: String, limit: u32) -> Result<Vec<Commit>, String> {
    let result = tokio::task::spawn_blocking(move || {
        git::log::get_file_history(&path, &file, limit)
    }).await.map_err(|e| e.to_string())?;
    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_get_commit_children(path: String, sha: String) -> Result<Vec<Commit>, String> {
    git::log::get_commit_children(&path, &sha).map_err(|e| e.to_string())
}

// ============================================================
// Platform commands
// ============================================================

#[tauri::command]
pub fn git_get_git_version() -> Result<String, String> {
    git::platform::get_git_version().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_get_app_version() -> String {
    git::platform::get_app_version()
}

#[tauri::command]
pub fn git_open_in_file_manager(path: String) -> Result<(), String> {
    git::platform::open_in_file_manager(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_open_in_terminal(path: String) -> Result<(), String> {
    git::platform::open_in_terminal(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_open_in_browser(url: String) -> Result<(), String> {
    git::platform::open_in_browser(&url).map_err(|e| e.to_string())
}

// ============================================================
// GitFlow commands
// ============================================================

#[tauri::command]
pub fn gitflow_is_available() -> bool {
    git::gitflow::is_gitflow_available()
}

#[tauri::command]
pub fn gitflow_init(
    path: String,
    branches: Option<GitFlowBranches>,
) -> Result<(), String> {
    git::gitflow::gitflow_init(&path, branches).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn gitflow_start(
    path: String,
    branch_type: String,
    name: String,
    base: Option<String>,
) -> Result<(), String> {
    git::gitflow::gitflow_start(&path, &branch_type, &name, base.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn gitflow_finish(
    path: String,
    branch_type: String,
    name: String,
    options: GitFlowFinishOptions,
) -> Result<(), String> {
    git::gitflow::gitflow_finish(&path, &branch_type, &name, options).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn gitflow_list(path: String) -> Result<GitFlowStatus, String> {
    git::gitflow::gitflow_list(&path).map_err(|e| e.to_string())
}

// ============================================================
// Bisect commands
// ============================================================

#[tauri::command]
pub fn git_bisect_start(
    path: String,
    bad: Option<String>,
    good: Option<String>,
) -> Result<(), String> {
    git::bisect::bisect_start(&path, bad.as_deref(), good.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_bisect_mark(
    path: String,
    state: String,
    revision: Option<String>,
) -> Result<BisectResult, String> {
    git::bisect::bisect_mark(&path, &state, revision.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_bisect_reset(path: String) -> Result<(), String> {
    git::bisect::bisect_reset(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_bisect_log(path: String) -> Result<String, String> {
    git::bisect::bisect_log(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_bisect_status(path: String) -> Result<Option<BisectState>, String> {
    git::bisect::bisect_status(&path).map_err(|e| e.to_string())
}

// ============================================================
// LFS commands
// ============================================================

#[tauri::command]
pub fn git_lfs_is_available() -> bool {
    git::lfs::is_lfs_available()
}

#[tauri::command]
pub fn git_lfs_track(path: String, pattern: String) -> Result<(), String> {
    git::lfs::track(&path, &pattern).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_lfs_untrack(path: String, pattern: String) -> Result<(), String> {
    git::lfs::untrack(&path, &pattern).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_lfs_list_tracks(path: String) -> Result<Vec<String>, String> {
    git::lfs::list_tracks(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_lfs_fetch(
    path: String,
    remote: Option<String>,
    include: Option<String>,
    exclude: Option<String>,
) -> Result<(), String> {
    git::lfs::lfs_fetch(&path, remote.as_deref(), include.as_deref(), exclude.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_lfs_pull(
    path: String,
    remote: Option<String>,
    include: Option<String>,
    exclude: Option<String>,
) -> Result<(), String> {
    git::lfs::lfs_pull(&path, remote.as_deref(), include.as_deref(), exclude.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_lfs_push(
    path: String,
    remote: Option<String>,
    include: Option<String>,
    exclude: Option<String>,
    all: bool,
) -> Result<(), String> {
    git::lfs::lfs_push(&path, remote.as_deref(), include.as_deref(), exclude.as_deref(), all)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_lfs_prune(path: String, dry_run: bool) -> Result<String, String> {
    git::lfs::lfs_prune(&path, dry_run).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_lfs_lock(path: String, file: String) -> Result<(), String> {
    git::lfs::lfs_lock(&path, &file).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_lfs_unlock(path: String, file: String, force: bool) -> Result<(), String> {
    git::lfs::lfs_unlock(&path, &file, force).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_lfs_list_locks(path: String) -> Result<Vec<LfsLock>, String> {
    git::lfs::list_locks(&path).map_err(|e| e.to_string())
}

// ============================================================
// File Watcher commands
// ============================================================

#[tauri::command]
pub fn start_file_watcher(app_handle: tauri::AppHandle, path: String) -> Result<(), String> {
    git::watcher::start_watcher(app_handle, path).map_err(|e| e.to_string())
}

// ============================================================
// Command Log commands
// ============================================================

#[tauri::command]
pub fn git_get_command_logs(limit: u32, offset: u32) -> Vec<crate::git::command_log::CommandLogEntry> {
    crate::git::command_log::get_logs(limit, offset)
}

#[tauri::command]
pub fn git_clear_command_logs() {
    crate::git::command_log::clear_logs();
}

#[tauri::command]
pub fn git_get_command_log_count() -> usize {
    crate::git::command_log::get_log_count()
}

// ============================================================
// Custom Action commands
// ============================================================

#[tauri::command]
pub fn git_execute_custom_action(
    path: String,
    action: crate::git::custom_action::CustomAction,
    variable_values: std::collections::HashMap<String, String>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let app = app_handle.clone();
    crate::git::custom_action::execute_custom_action(
        &path,
        &action,
        variable_values,
        move |line| {
            let _ = app.emit("custom-action-output", line);
        },
    )
    .map_err(|e| e.to_string())
}

// ============================================================
// Repo Config commands
// ============================================================

#[tauri::command]
pub fn git_get_repo_config(
    path: String,
) -> Result<crate::git::custom_action::RepoConfig, String> {
    crate::git::custom_action::get_repo_config(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_save_repo_config(
    path: String,
    config: crate::git::custom_action::RepoConfig,
) -> Result<(), String> {
    crate::git::custom_action::save_repo_config(&path, &config).map_err(|e| e.to_string())
}

// ============================================================
// GC commands
// ============================================================

#[tauri::command]
pub async fn git_run_gc(path: String, aggressive: bool, prune: bool) -> Result<String, String> {
    let result = tokio::task::spawn_blocking(move || {
        git::gc::run_gc(&path, aggressive, prune)
    }).await.map_err(|e| e.to_string())?;
    result.map_err(|e| e.to_string())
}

// ============================================================
// Scan repositories command
// ============================================================

#[tauri::command]
pub fn git_scan_repositories(directory: String, max_depth: u32) -> Result<Vec<ScannedRepo>, String> {
    git::repository::scan_repositories(&directory, max_depth).map_err(|e| e.to_string())
}

// ============================================================
// Diff revision files / query file content commands
// ============================================================

#[tauri::command]
pub async fn git_diff_revision_files(
    path: String,
    old_ref: String,
    new_ref: String,
) -> Result<Vec<DiffFile>, String> {
    let result = tokio::task::spawn_blocking(move || {
        git::diff::diff_revision_files(&path, &old_ref, &new_ref)
    }).await.map_err(|e| e.to_string())?;
    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_query_file_content(
    path: String,
    ref_name: String,
    file_path: String,
) -> Result<String, String> {
    let result = tokio::task::spawn_blocking(move || {
        git::diff::query_file_content(&path, &ref_name, &file_path)
    }).await.map_err(|e| e.to_string())?;
    result.map_err(|e| e.to_string())
}

// ============================================================
// Submodule additional commands
// ============================================================

#[tauri::command]
pub fn git_deinit_submodule(path: String, name: String) -> Result<(), String> {
    git::submodule::deinit_submodule(&path, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_set_submodule_branch(path: String, name: String, branch: String) -> Result<(), String> {
    git::submodule::set_submodule_branch(&path, &name, &branch).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_change_submodule_url(path: String, name: String, url: String) -> Result<(), String> {
    git::submodule::change_submodule_url(&path, &name, &url).map_err(|e| e.to_string())
}

// ============================================================
// Branch track status command
// ============================================================

#[tauri::command]
pub fn git_query_track_status(path: String, branch: String) -> Result<TrackStatus, String> {
    git::branch::query_track_status(&path, &branch).map_err(|e| e.to_string())
}

// ============================================================
// Rebase edit message command
// ============================================================

#[tauri::command]
pub fn git_rebase_edit_message(path: String, message: String) -> Result<(), String> {
    git::rebase::rebase_edit_message(&path, message).map_err(|e| e.to_string())
}

// ============================================================
// Platform additional commands
// ============================================================

#[tauri::command]
pub fn git_find_git_executable() -> Result<String, String> {
    git::platform::find_git_executable().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn git_find_external_tools() -> Result<Vec<ExternalTool>, String> {
    git::platform::find_external_tools().map_err(|e| e.to_string())
}

// ============================================================
// AI commands
// ============================================================

#[tauri::command]
pub async fn ai_generate_commit_message(
    repo_path: String,
    diff_text: String,
    provider: String,
    api_url: String,
    api_key: String,
    model: String,
    extra_prompt: String,
) -> Result<String, String> {
    let config = crate::ai::AIServiceConfig {
        provider,
        api_url,
        api_key,
        model,
        extra_prompt,
    };
    crate::ai::generate_commit_message(&repo_path, &diff_text, &config).await
}

#[tauri::command]
pub async fn ai_fetch_models(
    provider: String,
    api_url: String,
    api_key: String,
) -> Result<Vec<String>, String> {
    let config = crate::ai::AIServiceConfig {
        provider,
        api_url,
        api_key,
        model: String::new(),
        extra_prompt: String::new(),
    };
    crate::ai::fetch_models(&config).await
}

// ============================================================
// PR commands
// ============================================================

#[tauri::command]
pub fn detect_platform(remote_url: String) -> Result<String, String> {
    crate::gitee::detect_platform(&remote_url)
}

#[tauri::command]
pub async fn create_pull_request(
    platform: String,
    api_url: String,
    token: String,
    owner: String,
    repo: String,
    title: String,
    body: String,
    head: String,
    base: String,
) -> Result<String, String> {
    let config = crate::gitee::PRConfig {
        platform,
        api_url,
        token,
        owner,
        repo,
        title,
        body,
        head,
        base,
    };
    crate::gitee::create_pull_request(&config).await
}

// ============================================================
// Mirror commands
// ============================================================

#[tauri::command]
pub async fn test_mirror_latency(url: String) -> Result<u64, String> {
    crate::mirror::test_mirror_latency(&url).await
}

#[tauri::command]
pub fn get_mirror_url(original_url: String, mirror_type: String) -> Result<String, String> {
    crate::mirror::get_mirror_url(&original_url, &mirror_type)
}

// ============================================================
// Avatar commands
// ============================================================

#[tauri::command]
pub fn get_avatar(email: String, name: String) -> Result<Option<String>, String> {
    Ok(crate::avatar::get_avatar_url(&email, &name))
}

#[tauri::command]
pub fn clear_avatar_cache() -> Result<(), String> {
    // 简化方案：头像通过 URL 直接获取，无需本地缓存清理
    Ok(())
}
