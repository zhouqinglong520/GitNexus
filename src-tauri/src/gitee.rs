use serde::{Deserialize, Serialize};

// ============================================================
// PR Config
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PRConfig {
    pub platform: String,
    pub api_url: String,
    pub token: String,
    pub owner: String,
    pub repo: String,
    pub title: String,
    pub body: String,
    pub head: String,
    pub base: String,
}

// ============================================================
// Platform detection
// ============================================================

/// Known platform host patterns.
struct PlatformPattern {
    host: &'static str,
    name: &'static str,
}

const PLATFORM_PATTERNS: &[PlatformPattern] = &[
    PlatformPattern {
        host: "github.com",
        name: "github",
    },
    PlatformPattern {
        host: "gitee.com",
        name: "gitee",
    },
    PlatformPattern {
        host: "gitlab.com",
        name: "gitlab",
    },
    PlatformPattern {
        host: "coding.net",
        name: "coding",
    },
    PlatformPattern {
        host: "gitcode.com",
        name: "gitcode",
    },
    PlatformPattern {
        host: "codehub.devcloud.huaweicloud.com",
        name: "codehub",
    },
];

/// Detect the hosting platform from a remote URL.
pub fn detect_platform(remote_url: &str) -> Result<String, String> {
    let url = remote_url.trim();

    // Try to extract the host from SSH or HTTPS URLs.
    let host = extract_host(url)?;

    for pattern in PLATFORM_PATTERNS {
        if host == pattern.host || host.ends_with(&format!(".{}", pattern.host)) {
            return Ok(pattern.name.to_string());
        }
    }

    // Check if it looks like a Gitea instance (common path pattern).
    if url.contains("/gitea/") || url.contains("gitea.") {
        return Ok("gitea".to_string());
    }

    Ok("custom".to_string())
}

/// Extract the host portion from a git remote URL.
fn extract_host(url: &str) -> Result<String, String> {
    // SSH URL: git@host:path  or  ssh://git@host/path
    if url.starts_with("git@") {
        let rest = &url[5..]; // after "git@"
        if let Some(idx) = rest.find(':') {
            return Ok(rest[..idx].to_string());
        }
        if let Some(idx) = rest.find('/') {
            return Ok(rest[..idx].to_string());
        }
        return Err(format!("Cannot parse SSH URL: {}", url));
    }

    // ssh:// or https:// or http://
    if url.starts_with("ssh://") || url.starts_with("https://") || url.starts_with("http://") {
        let rest = url
            .trim_start_matches("ssh://")
            .trim_start_matches("https://")
            .trim_start_matches("http://");
        // Remove user@ if present
        let rest = if let Some(at) = rest.find('@') {
            &rest[at + 1..]
        } else {
            rest
        };
        if let Some(idx) = rest.find('/') {
            return Ok(rest[..idx].to_string());
        }
        if let Some(idx) = rest.find(':') {
            return Ok(rest[..idx].to_string());
        }
        return Ok(rest.to_string());
    }

    Err(format!("Cannot detect host from URL: {}", url))
}

// ============================================================
// PR creation
// ============================================================

#[derive(Debug, Serialize)]
struct CreatePRBody {
    title: String,
    body: String,
    head: String,
    base: String,
}

#[derive(Debug, Deserialize)]
struct PRResponse {
    html_url: Option<String>,
    web_url: Option<String>,
    url: Option<String>,
}

/// Create a pull request on the specified platform.
pub async fn create_pull_request(config: &PRConfig) -> Result<String, String> {
    let client = reqwest::Client::new();

    let url = build_pr_api_url(config);
    let body = CreatePRBody {
        title: config.title.clone(),
        body: config.body.clone(),
        head: config.head.clone(),
        base: config.base.clone(),
    };

    let auth_header = match config.platform.as_str() {
        "gitee" => format!("Bearer {}", config.token),
        "gitlab" => format!("Bearer {}", config.token),
        _ => format!("Bearer {}", config.token),
    };

    let response = client
        .post(&url)
        .header("Authorization", auth_header)
        .header("Accept", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("PR creation request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let resp_body = response.text().await.unwrap_or_default();
        return Err(format!("PR creation failed ({}): {}", status, resp_body));
    }

    let pr: PRResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse PR response: {}", e))?;

    pr.html_url
        .or(pr.web_url)
        .or(pr.url)
        .ok_or_else(|| "PR created but no URL found in response".to_string())
}

/// Build the API endpoint URL for creating a PR based on the platform.
fn build_pr_api_url(config: &PRConfig) -> String {
    // If a custom api_url is provided, use it directly
    if !config.api_url.is_empty() {
        return format!(
            "{}/repos/{}/{}/pulls",
            config.api_url.trim_end_matches('/'),
            config.owner,
            config.repo
        );
    }

    match config.platform.as_str() {
        "github" => format!(
            "https://api.github.com/repos/{}/{}/pulls",
            config.owner, config.repo
        ),
        "gitee" => format!(
            "https://gitee.com/api/v5/repos/{}/{}/pulls",
            config.owner, config.repo
        ),
        "gitlab" => format!(
            "https://gitlab.com/api/v4/projects/{}%2F{}/merge_requests",
            config.owner, config.repo
        ),
        _ => format!(
            "https://api.github.com/repos/{}/{}/pulls",
            config.owner, config.repo
        ),
    }
}
