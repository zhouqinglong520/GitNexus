use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::Mutex;

/// Maximum number of log entries to retain.
const MAX_LOG_ENTRIES: usize = 1000;

/// Maximum length for stdout/stderr strings stored in each entry.
const MAX_OUTPUT_LEN: usize = 1000;

/// A single command log entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandLogEntry {
    pub id: u64,
    pub timestamp: f64,
    pub command: String,
    pub args: String,
    pub working_dir: String,
    pub exit_code: i32,
    pub duration_ms: u64,
    pub success: bool,
    pub output: String,
    pub error: String,
}

/// Global command log storage.
static COMMAND_LOGS: once_cell::sync::Lazy<Mutex<CommandLogStorage>> =
    once_cell::sync::Lazy::new(|| Mutex::new(CommandLogStorage::new()));

/// Internal storage wrapping a VecDeque with an auto-incrementing ID counter.
struct CommandLogStorage {
    entries: VecDeque<CommandLogEntry>,
    next_id: u64,
}

impl CommandLogStorage {
    fn new() -> Self {
        Self {
            entries: VecDeque::new(),
            next_id: 1,
        }
    }

    fn push(&mut self, entry: CommandLogEntry) {
        if self.entries.len() >= MAX_LOG_ENTRIES {
            self.entries.pop_front();
        }
        self.entries.push_back(entry);
    }

    fn get(&self, limit: u32, offset: u32) -> Vec<CommandLogEntry> {
        let start = offset as usize;
        let end = (start + limit as usize).min(self.entries.len());
        if start >= self.entries.len() {
            return Vec::new();
        }
        self.entries.range(start..end).cloned().collect()
    }

    fn count(&self) -> usize {
        self.entries.len()
    }

    fn clear(&mut self) {
        self.entries.clear();
    }
}

/// Truncate a string to at most `max_len` characters.
fn truncate_str(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        s.to_string()
    } else {
        format!("{}...(truncated)", &s[..max_len])
    }
}

/// Record a command execution in the global log.
pub fn log_command(entry: CommandLogEntry) {
    let mut logs = COMMAND_LOGS.lock().unwrap();
    logs.push(entry);
}

/// Retrieve log entries with pagination.
pub fn get_logs(limit: u32, offset: u32) -> Vec<CommandLogEntry> {
    let logs = COMMAND_LOGS.lock().unwrap();
    logs.get(limit, offset)
}

/// Clear all command log entries.
pub fn clear_logs() {
    let mut logs = COMMAND_LOGS.lock().unwrap();
    logs.clear();
}

/// Get the total number of log entries.
pub fn get_log_count() -> usize {
    let logs = COMMAND_LOGS.lock().unwrap();
    logs.count()
}

/// Create a `CommandLogEntry` from execution results.
///
/// This is a convenience helper intended to be called after running a git command.
pub fn create_log_entry(
    command: &str,
    args: &[&str],
    working_dir: &str,
    exit_code: i32,
    duration_ms: u64,
    output: &str,
    error: &str,
) -> CommandLogEntry {
    let id = {
        let mut logs = COMMAND_LOGS.lock().unwrap();
        let id = logs.next_id;
        logs.next_id += 1;
        id
    };

    CommandLogEntry {
        id,
        timestamp: chrono::Utc::now().timestamp_millis() as f64 / 1000.0,
        command: command.to_string(),
        args: args.join(" "),
        working_dir: working_dir.to_string(),
        exit_code,
        duration_ms,
        success: exit_code == 0,
        output: truncate_str(output, MAX_OUTPUT_LEN),
        error: truncate_str(error, MAX_OUTPUT_LEN),
    }
}
