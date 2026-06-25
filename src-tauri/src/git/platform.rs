use crate::git::command::GitError;
use crate::models::ExternalTool;
use std::process::Command as StdCommand;

/// Get the installed git version string.
pub fn get_git_version() -> Result<String, GitError> {
    let output = StdCommand::new("git")
        .arg("--version")
        .output()
        .map_err(|e| GitError::ProcessError(e.to_string()))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(GitError::CommandError(
            String::from_utf8_lossy(&output.stderr).to_string(),
        ))
    }
}

/// Get the application version from the compile-time package version.
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Open a path in the system file manager.
pub fn open_in_file_manager(path: &str) -> Result<(), GitError> {
    let (cmd, arg) = if cfg!(target_os = "windows") {
        ("explorer", path)
    } else if cfg!(target_os = "macos") {
        ("open", path)
    } else {
        // Linux: try xdg-open first, then nautilus as fallback
        let output = StdCommand::new("xdg-open")
            .arg(path)
            .output()
            .map_err(|e| GitError::ProcessError(e.to_string()))?;

        if output.status.success() {
            return Ok(());
        }

        let output = StdCommand::new("nautilus")
            .arg(path)
            .output()
            .map_err(|e| GitError::ProcessError(e.to_string()))?;

        if output.status.success() {
            return Ok(());
        }

        return Err(GitError::CommandError(format!(
            "Failed to open file manager for path: {}",
            path
        )));
    };

    let output = StdCommand::new(cmd)
        .arg(arg)
        .output()
        .map_err(|e| GitError::ProcessError(e.to_string()))?;

    if output.status.success() {
        Ok(())
    } else {
        Err(GitError::CommandError(format!(
            "Failed to open file manager for path: {}",
            path
        )))
    }
}

/// Open a path in the system terminal.
pub fn open_in_terminal(path: &str) -> Result<(), GitError> {
    if cfg!(target_os = "windows") {
        // Windows: use cmd /c start
        let output = StdCommand::new("cmd")
            .args(["/c", "start", "cmd", "/k", &format!("cd /d {}", path)])
            .output()
            .map_err(|e| GitError::ProcessError(e.to_string()))?;

        if output.status.success() {
            Ok(())
        } else {
            Err(GitError::CommandError(format!(
                "Failed to open terminal at path: {}",
                path
            )))
        }
    } else if cfg!(target_os = "macos") {
        // macOS: use open -a Terminal
        let output = StdCommand::new("open")
            .args(["-a", "Terminal", path])
            .output()
            .map_err(|e| GitError::ProcessError(e.to_string()))?;

        if output.status.success() {
            Ok(())
        } else {
            Err(GitError::CommandError(format!(
                "Failed to open terminal at path: {}",
                path
            )))
        }
    } else {
        // Linux: try common terminal emulators
        let terminals = [
            ("gnome-terminal", vec!["--", bash_path()]),
            ("konsole", vec!["--workdir", path]),
            ("xfce4-terminal", vec!["--working-directory", path]),
            ("mate-terminal", vec!["--working-directory", path]),
        ];

        for (cmd, args) in &terminals {
            let mut full_args: Vec<String> = args.iter().map(|s| s.to_string()).collect();
            if *cmd == "gnome-terminal" {
                full_args.push(format!("cd {} && exec {}", path, bash_path()));
            }

            let result = StdCommand::new(cmd)
                .args(&full_args)
                .spawn()
                .map_err(|e| GitError::ProcessError(e.to_string()));

            if result.is_ok() {
                return Ok(());
            }
        }

        // Fallback: try xdg-open with a terminal URI scheme
        let output = StdCommand::new("xdg-open")
            .arg(path)
            .output()
            .map_err(|e| GitError::ProcessError(e.to_string()))?;

        if output.status.success() {
            Ok(())
        } else {
            Err(GitError::CommandError(format!(
                "Failed to open terminal at path: {}",
                path
            )))
        }
    }
}

/// Open a URL in the system default browser.
pub fn open_in_browser(url: &str) -> Result<(), GitError> {
    let (cmd, arg) = if cfg!(target_os = "windows") {
        ("cmd", url)
    } else if cfg!(target_os = "macos") {
        ("open", url)
    } else {
        ("xdg-open", url)
    };

    let mut command = StdCommand::new(cmd);
    if cfg!(target_os = "windows") {
        command.args(["/c", "start", "", arg]);
    } else {
        command.arg(arg);
    }

    let output = command
        .output()
        .map_err(|e| GitError::ProcessError(e.to_string()))?;

    if output.status.success() {
        Ok(())
    } else {
        Err(GitError::CommandError(format!(
            "Failed to open URL in browser: {}",
            url
        )))
    }
}

/// Get the path to the bash shell.
fn bash_path() -> &'static str {
    "/bin/bash"
}

/// Find the git executable path.
pub fn find_git_executable() -> Result<String, GitError> {
    // First try to find git via `which` or `where` depending on platform
    if cfg!(target_os = "windows") {
        // Try `where git` first
        if let Ok(output) = StdCommand::new("where").arg("git").output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout);
                let first_line = path.lines().next().map(|l| l.trim()).unwrap_or("");
                if !first_line.is_empty() {
                    return Ok(first_line.to_string());
                }
            }
        }

        // Check common Windows paths
        let common_paths = [
            r"C:\Program Files\Git\bin\git.exe",
            r"C:\Program Files (x86)\Git\bin\git.exe",
        ];
        for p in &common_paths {
            let path = std::path::Path::new(p);
            if path.exists() {
                return Ok(p.to_string());
            }
        }
    } else {
        // Try `which git` first
        if let Ok(output) = StdCommand::new("which").arg("git").output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout);
                let trimmed = path.trim();
                if !trimmed.is_empty() {
                    return Ok(trimmed.to_string());
                }
            }
        }

        // Check common Unix paths
        let common_paths = if cfg!(target_os = "macos") {
            vec!["/usr/bin/git", "/usr/local/bin/git", "/opt/homebrew/bin/git"]
        } else {
            vec!["/usr/bin/git", "/usr/local/bin/git"]
        };

        for p in &common_paths {
            let path = std::path::Path::new(p);
            if path.exists() {
                return Ok(p.to_string());
            }
        }
    }

    Err(GitError::CommandError(
        "Git executable not found".to_string(),
    ))
}

/// Detect commonly installed external tools (editors, terminals, diff tools).
pub fn find_external_tools() -> Result<Vec<ExternalTool>, GitError> {
    let mut tools = Vec::new();

    // Editors
    let editors: Vec<(&str, &str)> = if cfg!(target_os = "windows") {
        vec![
            ("code", "code"),
            ("cursor", "cursor"),
            ("subl", "subl"),
            ("vim", "vim"),
            ("nano", "nano"),
        ]
    } else {
        vec![
            ("code", "code"),
            ("cursor", "cursor"),
            ("subl", "sublime_text"),
            ("vim", "vim"),
            ("nano", "nano"),
        ]
    };

    for (name, cmd) in &editors {
        let is_available = is_command_available(cmd);
        tools.push(ExternalTool {
            name: name.to_string(),
            category: "editor".to_string(),
            path: if is_available {
                resolve_command_path(cmd).unwrap_or_else(|| cmd.to_string())
            } else {
                String::new()
            },
            is_available,
        });
    }

    // Terminals
    let terminals: Vec<(&str, &str)> = if cfg!(target_os = "windows") {
        vec![("Windows Terminal", "wt")]
    } else if cfg!(target_os = "macos") {
        vec![("iTerm2", "iterm2")]
    } else {
        vec![
            ("WezTerm", "wezterm"),
            ("GNOME Terminal", "gnome-terminal"),
            ("Konsole", "konsole"),
            ("xfce4-terminal", "xfce4-terminal"),
        ]
    };

    for (name, cmd) in &terminals {
        let is_available = is_command_available(cmd);
        tools.push(ExternalTool {
            name: name.to_string(),
            category: "terminal".to_string(),
            path: if is_available {
                resolve_command_path(cmd).unwrap_or_else(|| cmd.to_string())
            } else {
                String::new()
            },
            is_available,
        });
    }

    // Diff tools
    let diff_tools: Vec<(&str, &str)> = if cfg!(target_os = "windows") {
        vec![
            ("meld", "meld"),
            ("kdiff3", "kdiff3"),
            ("Beyond Compare", "bcompare"),
        ]
    } else {
        vec![
            ("meld", "meld"),
            ("kdiff3", "kdiff3"),
            ("Beyond Compare", "bcompare"),
        ]
    };

    for (name, cmd) in &diff_tools {
        let is_available = is_command_available(cmd);
        tools.push(ExternalTool {
            name: name.to_string(),
            category: "diff_tool".to_string(),
            path: if is_available {
                resolve_command_path(cmd).unwrap_or_else(|| cmd.to_string())
            } else {
                String::new()
            },
            is_available,
        });
    }

    Ok(tools)
}

/// Check if a command is available in PATH.
fn is_command_available(cmd: &str) -> bool {
    let result = if cfg!(target_os = "windows") {
        StdCommand::new("where").arg(cmd).output()
    } else {
        StdCommand::new("which").arg(cmd).output()
    };

    result.map(|o| o.status.success()).unwrap_or(false)
}

/// Resolve the full path of a command.
fn resolve_command_path(cmd: &str) -> Option<String> {
    let output = if cfg!(target_os = "windows") {
        StdCommand::new("where").arg(cmd).output().ok()?
    } else {
        StdCommand::new("which").arg(cmd).output().ok()?
    };

    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout);
        let first_line = path.lines().next().map(|l| l.trim()).unwrap_or("");
        if !first_line.is_empty() {
            return Some(first_line.to_string());
        }
    }

    None
}
