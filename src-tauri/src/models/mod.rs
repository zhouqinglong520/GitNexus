use serde::{Deserialize, Serialize};

// ============================================================
// Repository
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepositoryInfo {
    pub path: String,
    pub head: String,
    pub branch: Option<String>,
    pub is_bare: bool,
    pub worktree: String,
}

// ============================================================
// Commit
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Commit {
    pub sha: String,
    pub parents: Vec<String>,
    pub refs: String,
    pub author_name: String,
    pub author_email: String,
    pub author_time: i64,
    pub subject: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitDetail {
    pub sha: String,
    pub parents: Vec<String>,
    pub refs: String,
    pub author_name: String,
    pub author_email: String,
    pub author_time: i64,
    pub committer_name: String,
    pub committer_email: String,
    pub committer_time: i64,
    pub subject: String,
    pub body: String,
}

// ============================================================
// Branch
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Branch {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
    pub upstream: Option<String>,
    pub last_commit: Option<String>,
}

// ============================================================
// Tag
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub name: String,
    pub sha: String,
    pub is_annotated: bool,
    pub message: Option<String>,
    pub tagger_name: Option<String>,
    pub tagger_email: Option<String>,
    pub tagger_time: Option<i64>,
}

// ============================================================
// Remote
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Remote {
    pub name: String,
    pub url: String,
    pub push_url: Option<String>,
    pub head: Option<String>,
}

// ============================================================
// Stash
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stash {
    pub index: u32,
    pub sha: String,
    pub message: String,
    pub branch: Option<String>,
}

// ============================================================
// Status / Worktree
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorktreeStatus {
    pub branch: String,
    pub ahead: u32,
    pub behind: u32,
    pub changes: Vec<Change>,
    pub untracked_files: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Change {
    pub path: String,
    pub old_path: Option<String>,
    pub status: ChangeStatus,
    pub staged: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ChangeStatus {
    Added,
    Deleted,
    Modified,
    Renamed,
    Copied,
    Untracked,
    Ignored,
    Conflicted,
    Unmerged,
    Broken,
}

// ============================================================
// Diff
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffResult {
    pub diff: String,
    pub old_ref: Option<String>,
    pub new_ref: Option<String>,
    pub file_count: u32,
    pub insertions: u32,
    pub deletions: u32,
}

// ============================================================
// Blame
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlameLine {
    pub sha: String,
    pub author_name: String,
    pub author_email: String,
    pub author_time: i64,
    pub line_number: u32,
    pub content: String,
}

// ============================================================
// Submodule
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Submodule {
    pub name: String,
    pub path: String,
    pub url: String,
    pub branch: Option<String>,
    pub sha: String,
}

// ============================================================
// Merge / Rebase / Cherry-pick state
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MergeState {
    pub merging: bool,
    pub head: String,
    pub merge_head: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RebaseState {
    pub rebasing: bool,
    pub current_commit: Option<String>,
    pub onto: Option<String>,
    pub step: Option<u32>,
    pub total: Option<u32>,
}

// ============================================================
// Config
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigEntry {
    pub key: String,
    pub value: String,
}

// ============================================================
// Worktree
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Worktree {
    pub name: String,
    pub path: String,
    pub branch: Option<String>,
    pub is_main: bool,
    pub is_locked: bool,
}

// ============================================================
// Repository Statistics
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepositoryStats {
    pub total_commits: u64,
    pub total_authors: u64,
    pub total_branches: u64,
    pub total_tags: u64,
    pub total_files: u64,
    pub repo_size: u64,
}
