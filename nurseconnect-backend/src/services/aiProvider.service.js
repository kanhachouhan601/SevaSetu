const PROVIDERS = {
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: 'gemini-2.0-flash',
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.1-8b-instant',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
  },
};

const getProviderName = () => (process.env.AI_PROVIDER || 'gemini').toLowerCase();

const getModelName = () => {
  const provider = getProviderName();
  if (provider === 'groq') return process.env.GROQ_MODEL || PROVIDERS.groq.defaultModel;
  if (provider === 'openai') return process.env.OPENAI_MODEL || PROVIDERS.openai.defaultModel;
  return process.env.GEMINI_MODEL || PROVIDERS.gemini.defaultModel;
};

const getApiKey = () => {
  const provider = getProviderName();
  if (provider === 'groq') return process.env.GROQ_API_KEY;
  if (provider === 'openai') return process.env.OPENAI_API_KEY;
  return process.env.GEMINI_API_KEY;
};

const extractTextFromContents = (contents = []) => (
  contents
    .map(item => (item.parts || []).map(part => part.text || '').join('\n'))
    .filter(Boolean)
    .join('\n\n')
);

const buildMessages = ({ systemInstruction, contents }) => {
  const messages = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });

  contents.forEach(item => {
    const content = (item.parts || []).map(part => part.text || '').join('\n').trim();
    if (!content) return;
    messages.push({
      role: item.role === 'model' ? 'assistant' : 'user',
      content,
    });
  });

  return messages;
};

const normalizeProviderError = async (response, provider, model) => {
  const details = await response.text();
  console.error(`[AI Provider Error: ${provider}]`, details);

  let parsed = null;
  try {
    parsed = JSON.parse(details);
  } catch {
    parsed = null;
  }

  const retryDelay = parsed?.error?.details
    ?.find(item => item['@type'] === 'type.googleapis.com/google.rpc.RetryInfo')
    ?.retryDelay || response.headers.get('retry-after');

  const quotaLike = response.status === 429;
  const providerMessage = parsed?.error?.message || parsed?.message;
  const message = quotaLike
    ? `AI quota/rate limit exhausted for ${provider}:${model}. ${retryDelay ? `Please retry after ${retryDelay}. ` : ''}Check API quota, billing, or switch AI_PROVIDER/model.`
    : (providerMessage || 'AI service failed. Please try again.');

  const error = new Error(message);
  error.status = response.status;
  throw error;
};

const callGemini = async ({ apiKey, model, systemInstruction, contents, maxOutputTokens, temperature, responseMimeType }) => {
  const body = {
    contents,
    generationConfig: {
      temperature,
      topP: 0.9,
      maxOutputTokens,
      ...(responseMimeType ? { responseMimeType } : {}),
    },
    ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
  };

  const response = await fetch(
    `${PROVIDERS.gemini.baseUrl}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) await normalizeProviderError(response, 'gemini', model);

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim() || '';
};

const callOpenAICompatible = async ({ provider, apiKey, model, systemInstruction, contents, maxOutputTokens, temperature, responseMimeType }) => {
  const response = await fetch(PROVIDERS[provider].baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: buildMessages({ systemInstruction, contents }),
      temperature,
      max_tokens: maxOutputTokens,
      ...(responseMimeType === 'application/json' ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!response.ok) await normalizeProviderError(response, provider, model);

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
};

const callAI = async ({
  systemInstruction,
  contents,
  maxOutputTokens = 1000,
  temperature = 0.3,
  responseMimeType,
}) => {
  const provider = getProviderName();
  const config = PROVIDERS[provider];
  if (!config) {
    throw new Error(`Unsupported AI_PROVIDER "${provider}". Use gemini, groq, or openai.`);
  }

  const apiKey = getApiKey();
  const model = getModelName();
  if (!apiKey) {
    throw new Error(`AI service is not configured. Set ${provider.toUpperCase()}_API_KEY in .env`);
  }

  if (provider === 'gemini') {
    return callGemini({ apiKey, model, systemInstruction, contents, maxOutputTokens, temperature, responseMimeType });
  }

  return callOpenAICompatible({ provider, apiKey, model, systemInstruction, contents, maxOutputTokens, temperature, responseMimeType });
};

module.exports = { callAI, getProviderName, getModelName, extractTextFromContents };
