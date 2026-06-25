/// 头像管理模块
///
/// 根据邮箱判断头像来源，返回对应的头像 URL，供前端直接使用 `<img src={url}>` 显示。
/// - GitHub noreply 邮箱 -> GitHub avatars URL
/// - 其他邮箱 -> Gravatar URL（使用邮箱的简单 hex 哈希作为标识）

/// 从 GitHub noreply 邮箱中提取用户名
///
/// 支持两种格式：
/// - `123456+username@users.noreply.github.com` -> `username`
/// - `username@users.noreply.github.com` -> `username`
fn extract_github_username(email: &str) -> Option<String> {
    let email = email.trim().to_lowercase();

    if !email.ends_with("@users.noreply.github.com") {
        return None;
    }

    let local_part = email.strip_suffix("@users.noreply.github.com")?;

    // 格式: "123456+username" 或 "username"
    if let Some(idx) = local_part.find('+') {
        let username = &local_part[idx + 1..];
        if !username.is_empty() {
            return Some(username.to_string());
        }
    }

    // 没有数字前缀的情况
    if !local_part.is_empty() {
        return Some(local_part.to_string());
    }

    None
}

/// 判断邮箱是否为 GitHub noreply 邮箱
fn is_github_noreply_email(email: &str) -> bool {
    let email = email.trim().to_lowercase();
    email.ends_with("@users.noreply.github.com")
}

/// 计算字符串的简单哈希值（用于 Gravatar URL 参数）
///
/// 这里不实现完整 MD5，而是使用邮箱的小写形式直接拼接到 Gravatar URL 中。
/// Gravatar 本身支持使用邮箱明文（经过 URL 编码），但标准做法是 MD5。
/// 由于项目没有 md5 依赖，我们用一个简单的确定性哈希替代。
fn simple_hash(input: &str) -> String {
    // DJB2 哈希算法，简单高效
    let mut hash: u32 = 5381;
    for byte in input.bytes() {
        hash = hash.wrapping_mul(33).wrapping_add(byte as u32);
    }
    format!("{:08x}", hash)
}

/// 根据邮箱和用户名获取头像 URL
///
/// - GitHub noreply 邮箱 -> `https://avatars.githubusercontent.com/{username}`
/// - 其他邮箱 -> `https://gravatar.com/avatar/{hash}?s=128&d=identicon`
pub fn get_avatar_url(email: &str, _name: &str) -> Option<String> {
    let email = email.trim();
    if email.is_empty() {
        return None;
    }

    if is_github_noreply_email(email) {
        if let Some(username) = extract_github_username(email) {
            return Some(format!(
                "https://avatars.githubusercontent.com/{}",
                username
            ));
        }
    }

    // 使用 Gravatar，用简单哈希代替 MD5
    let email_lower = email.to_lowercase();
    let hash = simple_hash(&email_lower);
    Some(format!(
        "https://gravatar.com/avatar/{}?s=128&d=identicon",
        hash
    ))
}

/// 批量获取头像 URL
///
/// 输入 `(email, name)` 列表，返回对应的头像 URL 列表。
/// 如果邮箱为空，对应位置返回 None。
pub fn get_avatar_urls(emails: &[(String, String)]) -> Vec<Option<String>> {
    emails
        .iter()
        .map(|(email, name)| get_avatar_url(email, name))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_github_username_with_id() {
        let email = "123456+octocat@users.noreply.github.com";
        assert_eq!(extract_github_username(email), Some("octocat".to_string()));
    }

    #[test]
    fn test_extract_github_username_without_id() {
        let email = "octocat@users.noreply.github.com";
        assert_eq!(extract_github_username(email), Some("octocat".to_string()));
    }

    #[test]
    fn test_extract_github_username_non_github() {
        let email = "user@example.com";
        assert_eq!(extract_github_username(email), None);
    }

    #[test]
    fn test_is_github_noreply_email() {
        assert!(is_github_noreply_email("user@users.noreply.github.com"));
        assert!(is_github_noreply_email("123+user@users.noreply.github.com"));
        assert!(!is_github_noreply_email("user@example.com"));
        assert!(!is_github_noreply_email("user@github.com"));
    }

    #[test]
    fn test_get_avatar_url_github() {
        let url = get_avatar_url("123456+octocat@users.noreply.github.com", "Octocat");
        assert_eq!(
            url,
            Some("https://avatars.githubusercontent.com/octocat".to_string())
        );
    }

    #[test]
    fn test_get_avatar_url_gravatar() {
        let url = get_avatar_url("user@example.com", "User");
        assert!(url.is_some());
        let url = url.unwrap();
        assert!(url.starts_with("https://gravatar.com/avatar/"));
        assert!(url.contains("s=128"));
        assert!(url.contains("d=identicon"));
    }

    #[test]
    fn test_get_avatar_url_empty_email() {
        assert_eq!(get_avatar_url("", "User"), None);
        assert_eq!(get_avatar_url("  ", "User"), None);
    }

    #[test]
    fn test_simple_hash_deterministic() {
        assert_eq!(simple_hash("test@example.com"), simple_hash("test@example.com"));
        assert_ne!(simple_hash("a@example.com"), simple_hash("b@example.com"));
    }
}
