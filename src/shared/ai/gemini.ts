import { getApiKey, getSettings } from '../storage/settings.js';

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
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

export type CallGeminiOptions = {
  stream?: boolean;
  signal?: AbortSignal;
};

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function buildRequestBody(prompt: string): string {
  return JSON.stringify({
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  });
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

async function callGeminiNonStream(prompt: string, signal?: AbortSignal): Promise<string> {
  const { apiKey, model } = await resolveCredentials();
  const url = buildEndpoint(model, 'generateContent', apiKey);
  const response = await fetchWithRetry(
    url,
    buildGeminiRequestInit(buildRequestBody(prompt), signal),
    apiKey,
  );

  const payload = (await response.json()) as GenerateContentResponse;
  if (payload.error !== undefined) {
    const message = maskSecret(payload.error.message ?? 'Gemini API error', apiKey);
    throw classifyHttpError(payload.error.code ?? 500, message, apiKey);
  }

  return extractText(payload);
}

async function* streamGeminiChunks(
  prompt: string,
  signal?: AbortSignal,
): AsyncGenerator<string, void, undefined> {
  const { apiKey, model } = await resolveCredentials();
  const url = buildEndpoint(model, 'streamGenerateContent', apiKey);
  const response = await fetchWithRetry(
    url,
    buildGeminiRequestInit(buildRequestBody(prompt), signal),
    apiKey,
  );

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

        const chunk = extractText(payload);
        if (chunk !== '') {
          yield chunk;
        }
      }
    }

    const trailing = buffer.trim();
    if (trailing.startsWith('data: ') && trailing !== 'data: [DONE]') {
      const payload = JSON.parse(trailing.slice(6)) as GenerateContentResponse;
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
  if (opts?.stream === true) {
    return streamGeminiChunks(prompt, opts.signal);
  }
  return callGeminiNonStream(prompt, opts?.signal);
}

/** @internal テスト用: URL から API キーをマスク */
export function redactGeminiUrl(url: string): string {
  return redactKeyFromUrl(url);
}
