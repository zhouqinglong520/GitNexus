use std::time::Instant;

// ============================================================
// Mirror URL replacement
// ============================================================

/// Return the mirror-replaced URL for the given original URL and mirror type.
pub fn get_mirror_url(original_url: &str, mirror_type: &str) -> Result<String, String> {
    match mirror_type {
        "gitee" => {
            // Gitee itself does not need mirroring; return the original URL.
            Ok(original_url.to_string())
        }
        "fastgit" => {
            // Replace https://github.com with https://hub.fastgit.xyz
            Ok(original_url.replace(
                "https://github.com",
                "https://hub.fastgit.xyz",
            ))
        }
        "ghproxy" => {
            // Prepend https://ghproxy.com/ before the original URL
            if original_url.starts_with("https://") || original_url.starts_with("http://") {
                Ok(format!("https://ghproxy.com/{}", original_url))
            } else {
                Ok(format!("https://ghproxy.com/https://{}", original_url))
            }
        }
        "kkgithub" => {
            // Replace https://github.com with https://kkgithub.com
            Ok(original_url.replace(
                "https://github.com",
                "https://kkgithub.com",
            ))
        }
        "custom" => {
            // For custom mirrors, the caller should provide the full URL via
            // the original_url parameter already containing the mirror address.
            Ok(original_url.to_string())
        }
        _ => Err(format!("Unknown mirror type: {}", mirror_type)),
    }
}

// ============================================================
// Mirror latency test
// ============================================================

/// Test the latency of a mirror URL by sending a HEAD request.
/// Returns the round-trip time in milliseconds.
pub async fn test_mirror_latency(url: &str) -> Result<u64, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let start = Instant::now();

    let response = client
        .head(url)
        .send()
        .await
        .map_err(|e| format!("Mirror latency test failed for {}: {}", url, e))?;

    let elapsed = start.elapsed().as_millis() as u64;

    if !response.status().is_success() {
        // Some servers may not support HEAD; return latency anyway as a
        // connectivity indicator, but log the non-success status.
        let _ = response.error_for_status_ref();
    }

    Ok(elapsed)
}
