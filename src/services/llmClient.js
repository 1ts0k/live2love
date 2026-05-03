export const DEFAULT_API_SETTINGS = {
  provider: 'OpenAI Compatible',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.8,
  maxTokens: 1200,
  stream: true,
};

const TEST_PROMPT = '请只回复 OK。';

export class ChatRequestError extends Error {
  constructor(message, code = 'unknown') {
    super(message);
    this.name = 'ChatRequestError';
    this.code = code;
  }
}

function getChatEndpoint(baseUrl) {
  const normalized = baseUrl.trim().replace(/\/+$/, '');
  if (normalized.endsWith('/chat/completions')) return normalized;
  return `${normalized}/chat/completions`;
}

function validateSettings(settings) {
  if (!settings?.baseUrl?.trim()) {
    throw new ChatRequestError('Base URL 还没有填写。请到设置里填入服务商地址。', 'missing_base_url');
  }

  if (!settings?.apiKey?.trim()) {
    throw new ChatRequestError('API Key 还没有填写。请到设置里保存密钥后再试。', 'missing_key');
  }

  if (!settings?.model?.trim()) {
    throw new ChatRequestError('Model 还没有填写。请到设置里选择或输入模型名。', 'missing_model');
  }
}

function normalizeChatMessages(messages, systemPrompt = '') {
  const normalized = [];
  const prompt = systemPrompt.trim();

  if (prompt) {
    normalized.push({ role: 'system', content: prompt });
  }

  messages.forEach((message) => {
    if (!message?.text?.trim() || message.status === 'failed') return;
    normalized.push({
      role: message.from === 'user' ? 'user' : 'assistant',
      content: message.text.trim(),
    });
  });

  return normalized;
}

function coerceNumber(value, fallback, min = Number.NEGATIVE_INFINITY) {
  const next = Number(value);
  return Number.isFinite(next) && next >= min ? next : fallback;
}

function buildPayload({ settings, messages, systemPrompt, stream }) {
  return {
    model: settings.model.trim(),
    messages: normalizeChatMessages(messages, systemPrompt),
    temperature: coerceNumber(settings.temperature, DEFAULT_API_SETTINGS.temperature, 0),
    max_tokens: coerceNumber(settings.maxTokens, DEFAULT_API_SETTINGS.maxTokens, 1),
    stream,
  };
}

async function readProviderMessage(response) {
  const rawText = await response.text().catch(() => '');
  if (!rawText) return '';

  try {
    const parsed = JSON.parse(rawText);
    return parsed?.error?.message || parsed?.message || rawText;
  } catch {
    return rawText;
  }
}

function classifyHttpError(status, providerMessage) {
  const suffix = providerMessage ? ` 服务商返回：${providerMessage}` : '';

  if (status === 401 || status === 403) {
    return new ChatRequestError(`认证失败，请检查 API Key 或权限。${suffix}`, 'auth_failed');
  }

  if (status === 404) {
    return new ChatRequestError(`模型或接口不存在，请检查 Base URL 和 Model。${suffix}`, 'model_not_found');
  }

  if (status === 402 || status === 429) {
    return new ChatRequestError(`额度、余额或频率限制不足。${suffix}`, 'quota_or_rate_limit');
  }

  return new ChatRequestError(`请求失败，HTTP ${status}。${suffix}`, 'provider_error');
}

async function fetchChatCompletion({ settings, messages, systemPrompt = '', stream, signal }) {
  validateSettings(settings);

  const response = await fetch(getChatEndpoint(settings.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey.trim()}`,
    },
    body: JSON.stringify(buildPayload({ settings, messages, systemPrompt, stream })),
    signal,
  }).catch((error) => {
    if (error?.name === 'AbortError') {
      throw new ChatRequestError('已停止生成。', 'aborted');
    }

    throw new ChatRequestError('网络连接失败。请检查 Base URL、网络或服务商是否允许浏览器直连。', 'network_failed');
  });

  if (!response.ok) {
    throw classifyHttpError(response.status, await readProviderMessage(response));
  }

  return response;
}

async function readJsonCompletion(response) {
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new ChatRequestError('服务商响应里没有可用文本。请检查模型是否兼容 OpenAI Chat Completions 格式。', 'bad_response');
  }

  return content;
}

async function readStreamCompletion(response, onDelta) {
  if (!response.body) {
    return readJsonCompletion(response);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;

      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;

      try {
        const parsed = JSON.parse(payload);
        const delta = parsed?.choices?.[0]?.delta?.content ?? parsed?.choices?.[0]?.message?.content ?? '';
        if (!delta) continue;

        fullText += delta;
        onDelta?.(delta);
      } catch {
        throw new ChatRequestError('流式响应格式无法解析。请检查服务商是否兼容 OpenAI SSE。', 'bad_stream');
      }
    }
  }

  if (!fullText.trim()) {
    throw new ChatRequestError('服务商没有返回文本内容。', 'empty_response');
  }

  return fullText;
}

export async function completeChat({ settings, messages, systemPrompt = '', signal, onDelta }) {
  const shouldStream = Boolean(settings.stream);
  const response = await fetchChatCompletion({
    settings,
    messages,
    systemPrompt,
    stream: shouldStream,
    signal,
  });
  const contentType = response.headers.get('content-type') ?? '';

  if (!shouldStream || !contentType.includes('text/event-stream')) {
    const content = await readJsonCompletion(response);
    onDelta?.(content);
    return content;
  }

  return readStreamCompletion(response, onDelta);
}

export async function testApiConnection(settings) {
  const response = await fetchChatCompletion({
    settings: {
      ...settings,
      maxTokens: Math.min(Number(settings.maxTokens) || 16, 16),
    },
    messages: [{ from: 'user', text: TEST_PROMPT }],
    stream: false,
  });

  await readJsonCompletion(response);

  return {
    ok: true,
    message: '连接成功，模型返回了兼容响应。',
  };
}
