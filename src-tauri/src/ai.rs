use serde::{Deserialize, Serialize};

// ============================================================
// AI Service Config
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIServiceConfig {
    pub provider: String,
    pub api_url: String,
    pub api_key: String,
    pub model: String,
    pub extra_prompt: String,
}

impl AIServiceConfig {
    /// Create a config with the given provider and optional overrides.
    pub fn new(provider: &str, api_key: &str, model: &str, extra_prompt: &str) -> Self {
        let api_url = Self::default_url(provider).to_string();
        Self {
            provider: provider.to_string(),
            api_url,
            api_key: api_key.to_string(),
            model: model.to_string(),
            extra_prompt: extra_prompt.to_string(),
        }
    }

    /// Return the default API base URL for a known provider.
    pub fn default_url(provider: &str) -> &'static str {
        match provider {
            "deepseek" => "https://api.deepseek.com/v1",
            "qwen" => "https://dashscope.aliyuncs.com/compatible-mode/v1",
            "wenxin" => "https://aip.baidubce.com/rpc/2.0/ai_custom/v1",
            "openai" => "https://api.openai.com/v1",
            "ollama" => "http://localhost:11434/v1",
            _ => "",
        }
    }
}

// ============================================================
// OpenAI-compatible request / response types
// ============================================================

#[derive(Debug, Serialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct ChatCompletionRequest {
    model: String,
    messages: Vec<ChatMessage>,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionChoice {
    message: ChatCompletionMessage,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionMessage {
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatCompletionChoice>,
}

#[derive(Debug, Deserialize)]
struct ModelData {
    id: String,
}

#[derive(Debug, Deserialize)]
struct ModelsResponse {
    data: Vec<ModelData>,
}

// ============================================================
// Public functions
// ============================================================

const SYSTEM_PROMPT: &str =
    "你是一个 Git 提交消息生成助手。请根据以下 git diff 内容，生成简洁规范的提交消息。只返回提交消息本身，不要解释。";

/// Call an AI service to generate a commit message from the given diff text.
pub async fn generate_commit_message(
    _repo_path: &str,
    diff_text: &str,
    config: &AIServiceConfig,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    let user_content = if config.extra_prompt.is_empty() {
        diff_text.to_string()
    } else {
        format!("{}\n\n{}", config.extra_prompt, diff_text)
    };

    let request_body = ChatCompletionRequest {
        model: config.model.clone(),
        messages: vec![
            ChatMessage {
                role: "system".to_string(),
                content: SYSTEM_PROMPT.to_string(),
            },
            ChatMessage {
                role: "user".to_string(),
                content: user_content,
            },
        ],
    };

    let url = format!("{}/chat/completions", config.api_url.trim_end_matches('/'));

    let mut req_builder = client.post(&url).json(&request_body);

    // Ollama typically does not require an API key; skip the header when empty.
    if !config.api_key.is_empty() {
        req_builder = req_builder.header("Authorization", format!("Bearer {}", config.api_key));
    }

    let response = req_builder
        .send()
        .await
        .map_err(|e| format!("AI request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("AI service returned {}: {}", status, body));
    }

    let completion: ChatCompletionResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse AI response: {}", e))?;

    completion
        .choices
        .first()
        .and_then(|c| c.message.content.clone())
        .ok_or_else(|| "AI returned an empty response".to_string())
}

/// Fetch the list of available models from an OpenAI-compatible API.
pub async fn fetch_models(config: &AIServiceConfig) -> Result<Vec<String>, String> {
    let client = reqwest::Client::new();

    let url = format!("{}/models", config.api_url.trim_end_matches('/'));

    let mut req_builder = client.get(&url);

    if !config.api_key.is_empty() {
        req_builder = req_builder.header("Authorization", format!("Bearer {}", config.api_key));
    }

    let response = req_builder
        .send()
        .await
        .map_err(|e| format!("Failed to fetch models: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Failed to fetch models, status {}: {}", status, body));
    }

    let models: ModelsResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse models response: {}", e))?;

    Ok(models.data.into_iter().map(|m| m.id).collect())
}
