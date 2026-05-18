import { getApiKey, getSettings } from '../storage/settings.js';
import {
  estimateTokensForUsage,
  recordUsage,
  type AiUsageFeature,
} from './usage.js';

const GEMINI_API_ORIGIN = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

export type GeminiErrorKind = 'NETWORK' | 'AUTH' | 'QUOTA' | 'SERVER';

export class GeminiError extends Error {
  readonly kind: GeminiErrorKind;

  readonly status: number | undefined;

  constructor(message: string, kind: GeminiErrorKind, status?: number) {
    super(message);
    this.name = 'GeminiError';
    this.kind = kind;
    this.status = status;
  }
}

type GenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    groundingMetadata?: GeminiGroundingMetadata;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

export type GeminiUsageTokens = {
  token_input: number;
  token_output: number;
};

export type GeminiGroundingChunk = {
  web?: {
    uri?: string;
    title?: string;
  };
};

export type GeminiGroundingMetadata = {
  groundingChunks?: GeminiGroundingChunk[];
  webSearchQueries?: string[];
};

export type GeminiGroundedSource = {
  title: string;
  uri: string;
};

export type GeminiGroundedResult = {
  text: string;
  sources: GeminiGroundedSource[];
  webSearchQueries: string[];
};

export type CallGeminiOptions = {
  stream?: boolean;
  signal?: AbortSignal;
  feature: AiUsageFeature;
};

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export type GeminiChatTurn = {
  role: 'user' | 'model';
  text: string;
};

function buildRequestBody(prompt: string): string {
  return JSON.stringify({
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  });
}

export function buildChatRequestBody(
  systemInstruction: string,
  turns: GeminiChatTurn[],
): string {
  return JSON.stringify({
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: turns.map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
  });
}

/** REST API: Grounding with Google Search (`google_search` in JSON body). */
export function buildGoogleSearchRequestBody(prompt: string): string {
  return JSON.stringify({
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    tools: [{ google_search: {} }],
  });
}

export function extractGroundingSources(
  metadata: GeminiGroundingMetadata | undefined,
): GeminiGroundedSource[] {
  if (metadata?.groundingChunks === undefined) {
    return [];
  }

  const sources: GeminiGroundedSource[] = [];
  const seen = new Set<string>();

  for (const chunk of metadata.groundingChunks) {
    const uri = chunk.web?.uri?.trim();
    if (uri === undefined || uri === '' || seen.has(uri)) {
      continue;
    }
    seen.add(uri);
    const title = chunk.web?.title?.trim() ?? uri;
    sources.push({ title, uri });
  }

  return sources;
}

function maskSecret(text: string, secret: string): string {
  if (secret === '') {
    return text;
  }
  return text.split(secret).join('***');
}

function redactKeyFromUrl(url: string): string {
  return url.replace(/([?&]key=)[^&]+/i, '$1***');
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function backoffMs(attempt: number): number {
  return INITIAL_BACKOFF_MS * 2 ** attempt;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      globalThis.clearTimeout(timer);
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function classifyHttpError(status: number, bodyText: string, apiKey: string): GeminiError {
  const message = maskSecret(bodyText, apiKey).slice(0, 500) || `HTTP ${status}`;

  if (status === 401 || status === 403) {
    return new GeminiError(message, 'AUTH', status);
  }
  if (status === 429) {
    return new GeminiError(message, 'QUOTA', status);
  }
  if (status >= 500) {
    return new GeminiError(message, 'SERVER', status);
  }
  return new GeminiError(message, 'SERVER', status);
}

function extractText(payload: GenerateContentResponse): string {
  const parts = payload.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return '';
  }
  return parts.map((part) => part.text ?? '').join('');
}

export function extractUsageTokens(
  payload: GenerateContentResponse,
): GeminiUsageTokens | undefined {
  const metadata = payload.usageMetadata;
  if (metadata === undefined) {
    return undefined;
  }

  const tokenInput = metadata.promptTokenCount ?? 0;
  const tokenOutput = metadata.candidatesTokenCount ?? 0;
  if (tokenInput === 0 && tokenOutput === 0) {
    return undefined;
  }

  return {
    token_input: tokenInput,
    token_output: tokenOutput,
  };
}

function resolveTokenCounts(
  payload: GenerateContentResponse | undefined,
  inputText: string,
  outputText: string,
): { token_input: number; token_output: number } {
  const meta = payload?.usageMetadata;
  if (meta?.promptTokenCount !== undefined) {
    const token_input = meta.promptTokenCount;
    const token_output =
      meta.candidatesTokenCount ??
      (meta.totalTokenCount !== undefined
        ? Math.max(meta.totalTokenCount - token_input, 0)
        : estimateTokensForUsage(outputText));
    return { token_input, token_output };
  }

  return {
    token_input: estimateTokensForUsage(inputText),
    token_output: estimateTokensForUsage(outputText),
  };
}

async function trackGeminiUsage(
  feature: AiUsageFeature,
  model: string,
  payload: GenerateContentResponse | undefined,
  inputText: string,
  outputText: string,
): Promise<void> {
  try {
    const { token_input, token_output } = resolveTokenCounts(payload, inputText, outputText);
    await recordUsage({ model, token_input, token_output, feature });
  } catch {
    // 使用量記録の失敗で AI 呼び出し自体は失敗させない
  }
}

function buildChatInputText(systemInstruction: string, turns: GeminiChatTurn[]): string {
  return [systemInstruction, ...turns.map((turn) => turn.text)].join('\n');
}

async function readErrorBody(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as GenerateContentResponse;
    if (json.error?.message !== undefined && json.error.message !== '') {
      return json.error.message;
    }
    return JSON.stringify(json);
  } catch {
    try {
      return await response.text();
    } catch {
      return '';
    }
  }
}

async function resolveCredentials(): Promise<{ apiKey: string; model: string }> {
  const apiKey = await getApiKey();
  if (apiKey === null) {
    throw new Error('API key not set');
  }
  const settings = await getSettings();
  return { apiKey, model: settings.ai.model };
}

function buildEndpoint(model: string, action: 'generateContent' | 'streamGenerateContent', apiKey: string): string {
  const base = `${GEMINI_API_ORIGIN}/${encodeURIComponent(model)}:${action}`;
  const query = new URLSearchParams({ key: apiKey });
  if (action === 'streamGenerateContent') {
    query.set('alt', 'sse');
  }
  return `${base}?${query.toString()}`;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  apiKey: string,
): Promise<Response> {
  const signal = init.signal ?? undefined;
  let lastError: GeminiError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    throwIfAborted(signal);
    try {
      const response = await fetch(url, init);

      if (response.ok) {
        return response;
      }

      const bodyText = await readErrorBody(response);
      const error = classifyHttpError(response.status, bodyText, apiKey);

      if (!isRetryableStatus(response.status) || attempt === MAX_RETRIES) {
        throw error;
      }

      lastError = error;
      await sleep(backoffMs(attempt), signal);
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      if (error instanceof GeminiError) {
        if (!isRetryableStatus(error.status ?? 0) || attempt === MAX_RETRIES) {
          throw error;
        }
        lastError = error;
        await sleep(backoffMs(attempt), signal);
        continue;
      }

      const detail =
        error instanceof Error ? maskSecret(error.message, apiKey) : 'fetch failed';
      throw new GeminiError(
        `Network error (${redactKeyFromUrl(url)}): ${detail}`,
        'NETWORK',
      );
    }
  }

  throw lastError ?? new GeminiError('Request failed after retries', 'SERVER');
}

function buildGeminiRequestInit(body: string, signal?: AbortSignal): RequestInit {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  };
  if (signal !== undefined) {
    init.signal = signal;
  }
  return init;
}

async function parseGenerateContentResponse(
  response: Response,
  apiKey: string,
): Promise<{ text: string; payload: GenerateContentResponse }> {
  const payload = (await response.json()) as GenerateContentResponse;
  if (payload.error !== undefined) {
    const message = maskSecret(payload.error.message ?? 'Gemini API error', apiKey);
    throw classifyHttpError(payload.error.code ?? 500, message, apiKey);
  }

  return { text: extractText(payload), payload };
}

async function parseGroundedGenerateContentResponse(
  response: Response,
  apiKey: string,
): Promise<{ result: GeminiGroundedResult; payload: GenerateContentResponse }> {
  const payload = (await response.json()) as GenerateContentResponse;
  if (payload.error !== undefined) {
    const message = maskSecret(payload.error.message ?? 'Gemini API error', apiKey);
    throw classifyHttpError(payload.error.code ?? 500, message, apiKey);
  }

  const candidate = payload.candidates?.[0];
  const metadata = candidate?.groundingMetadata;

  return {
    result: {
      text: extractText(payload),
      sources: extractGroundingSources(metadata),
      webSearchQueries: metadata?.webSearchQueries ?? [],
    },
    payload,
  };
}

async function callGeminiNonStream(
  prompt: string,
  feature: AiUsageFeature,
  signal?: AbortSignal,
): Promise<string> {
  const { apiKey, model } = await resolveCredentials();
  const url = buildEndpoint(model, 'generateContent', apiKey);
  const response = await fetchWithRetry(
    url,
    buildGeminiRequestInit(buildRequestBody(prompt), signal),
    apiKey,
  );

  const { text, payload } = await parseGenerateContentResponse(response, apiKey);
  await trackGeminiUsage(feature, model, payload, prompt, text);
  return text;
}

async function callGeminiChatNonStream(
  systemInstruction: string,
  turns: GeminiChatTurn[],
  feature: AiUsageFeature,
  signal?: AbortSignal,
): Promise<string> {
  const { apiKey, model } = await resolveCredentials();
  const url = buildEndpoint(model, 'generateContent', apiKey);
  const body = buildChatRequestBody(systemInstruction, turns);
  const response = await fetchWithRetry(
    url,
    buildGeminiRequestInit(body, signal),
    apiKey,
  );

  const { text, payload } = await parseGenerateContentResponse(response, apiKey);
  const inputText = buildChatInputText(systemInstruction, turns);
  await trackGeminiUsage(feature, model, payload, inputText, text);
  return text;
}

export type CallGeminiWithGoogleSearchOptions = {
  signal?: AbortSignal;
  feature?: AiUsageFeature;
};

export async function callGeminiWithGoogleSearch(
  prompt: string,
  opts?: CallGeminiWithGoogleSearchOptions,
): Promise<GeminiGroundedResult> {
  const feature = opts?.feature ?? 'fact_check';
  const { apiKey, model } = await resolveCredentials();
  const url = buildEndpoint(model, 'generateContent', apiKey);
  const body = buildGoogleSearchRequestBody(prompt);
  const response = await fetchWithRetry(
    url,
    buildGeminiRequestInit(body, opts?.signal),
    apiKey,
  );

  const { result, payload } = await parseGroundedGenerateContentResponse(response, apiKey);
  await trackGeminiUsage(feature, model, payload, prompt, result.text);
  return result;
}

async function* streamGeminiResponseBody(
  signal: AbortSignal | undefined,
  apiKey: string,
  response: Response,
  usageOut: { payload?: GenerateContentResponse },
): AsyncGenerator<string, void, undefined> {
  if (response.body === null) {
    throw new GeminiError('Empty stream body', 'SERVER', response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      throwIfAborted(signal);
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed === 'data: [DONE]') {
          continue;
        }
        const jsonText = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed;
        if (jsonText === '') {
          continue;
        }

        let payload: GenerateContentResponse;
        try {
          payload = JSON.parse(jsonText) as GenerateContentResponse;
        } catch {
          continue;
        }

        if (payload.error !== undefined) {
          const message = maskSecret(payload.error.message ?? 'Gemini API error', apiKey);
          throw classifyHttpError(payload.error.code ?? 500, message, apiKey);
        }

        usageOut.payload = payload;

        const chunk = extractText(payload);
        if (chunk !== '') {
          yield chunk;
        }
      }
    }

    const trailing = buffer.trim();
    if (trailing.startsWith('data: ') && trailing !== 'data: [DONE]') {
      const payload = JSON.parse(trailing.slice(6)) as GenerateContentResponse;
      usageOut.payload = payload;
      const chunk = extractText(payload);
      if (chunk !== '') {
        yield chunk;
      }
    }
  } catch (error) {
    if (isAbortError(error)) {
      await reader.cancel().catch(() => undefined);
      throw error;
    }
    if (error instanceof GeminiError) {
      throw error;
    }
    if (error instanceof TypeError) {
      throw new GeminiError(maskSecret(error.message, apiKey), 'NETWORK');
    }
    throw error;
  } finally {
    reader.releaseLock();
  }
}

async function* streamGeminiChunks(
  prompt: string,
  feature: AiUsageFeature,
  signal?: AbortSignal,
): AsyncGenerator<string, void, undefined> {
  const { apiKey, model } = await resolveCredentials();
  const url = buildEndpoint(model, 'streamGenerateContent', apiKey);
  const response = await fetchWithRetry(
    url,
    buildGeminiRequestInit(buildRequestBody(prompt), signal),
    apiKey,
  );
  const usageOut: { payload?: GenerateContentResponse } = {};
  let output = '';
  try {
    for await (const chunk of streamGeminiResponseBody(signal, apiKey, response, usageOut)) {
      output += chunk;
      yield chunk;
    }
  } finally {
    await trackGeminiUsage(feature, model, usageOut.payload, prompt, output);
  }
}

async function* streamGeminiChatChunks(
  systemInstruction: string,
  turns: GeminiChatTurn[],
  feature: AiUsageFeature,
  signal?: AbortSignal,
): AsyncGenerator<string, void, undefined> {
  const { apiKey, model } = await resolveCredentials();
  const url = buildEndpoint(model, 'streamGenerateContent', apiKey);
  const body = buildChatRequestBody(systemInstruction, turns);
  const response = await fetchWithRetry(
    url,
    buildGeminiRequestInit(body, signal),
    apiKey,
  );
  const usageOut: { payload?: GenerateContentResponse } = {};
  const inputText = buildChatInputText(systemInstruction, turns);
  let output = '';
  try {
    for await (const chunk of streamGeminiResponseBody(signal, apiKey, response, usageOut)) {
      output += chunk;
      yield chunk;
    }
  } finally {
    await trackGeminiUsage(feature, model, usageOut.payload, inputText, output);
  }
}

export async function callGemini(
  prompt: string,
  opts?: CallGeminiOptions & { stream?: false },
): Promise<string>;
export function callGemini(
  prompt: string,
  opts: CallGeminiOptions & { stream: true },
): AsyncGenerator<string, void, undefined>;
export function callGemini(
  prompt: string,
  opts?: CallGeminiOptions,
): Promise<string> | AsyncGenerator<string, void, undefined> {
  if (opts?.feature === undefined) {
    throw new Error('feature is required');
  }
  if (opts.stream === true) {
    return streamGeminiChunks(prompt, opts.feature, opts.signal);
  }
  return callGeminiNonStream(prompt, opts.feature, opts.signal);
}

export function callGeminiChat(
  systemInstruction: string,
  turns: GeminiChatTurn[],
  opts: CallGeminiOptions & { stream: true },
): AsyncGenerator<string, void, undefined>;
export function callGeminiChat(
  systemInstruction: string,
  turns: GeminiChatTurn[],
  opts?: CallGeminiOptions & { stream?: false },
): Promise<string>;
export function callGeminiChat(
  systemInstruction: string,
  turns: GeminiChatTurn[],
  opts?: CallGeminiOptions,
): Promise<string> | AsyncGenerator<string, void, undefined> {
  if (opts?.feature === undefined) {
    throw new Error('feature is required');
  }
  if (opts.stream === true) {
    return streamGeminiChatChunks(systemInstruction, turns, opts.feature, opts.signal);
  }
  return callGeminiChatNonStream(systemInstruction, turns, opts.feature, opts?.signal);
}

/** @internal テスト用: URL から API キーをマスク */
export function redactGeminiUrl(url: string): string {
  return redactKeyFromUrl(url);
}
