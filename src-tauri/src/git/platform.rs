use crate::git::command::GitError;
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
