import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildChatRequestBody,
  callGemini,
  callGeminiChat,
  extractUsageTokens,
  GeminiError,
  redactGeminiUrl,
} from '../src/shared/ai/gemini.js';

const API_KEY = 'test-gemini-key-secret';
const MODEL = 'gemini-2.0-flash';
const TEST_FEATURE = 'synthesis' as const;

vi.mock('../src/shared/storage/settings.js', () => ({
  getApiKey: vi.fn(),
  getSettings: vi.fn(),
}));

import { getApiKey, getSettings } from '../src/shared/storage/settings.js';
import * as usage from '../src/shared/ai/usage.js';

const mockedGetApiKey = vi.mocked(getApiKey);
const mockedGetSettings = vi.mocked(getSettings);
const mockedRecordUsage = vi.spyOn(usage, 'recordUsage').mockResolvedValue(undefined);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function sseResponse(chunks: string[]): Response {
  const body = chunks.map((chunk) => `data: ${chunk}\n\n`).join('');
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('gemini', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedRecordUsage.mockResolvedValue(undefined);
    mockedGetApiKey.mockResolvedValue(API_KEY);
    mockedGetSettings.mockResolvedValue({
      default_color: 'yellow',
      theme: 'dark',
      font_scale: 1,
      density: 'normal',
      blocked_domains: [],
      blocked_url_patterns: [],
      ai: { provider: 'gemini', api_key_encrypted: 'enc', model: MODEL },
      shortcuts: { quick_highlight: 'Alt+H', open_synthesis: 'Alt+S' },
      onboarding_seen: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('throws when feature is missing', () => {
    expect(() => callGemini('hello')).toThrow('feature is required');
  });

  it('throws when API key is not set', async () => {
    mockedGetApiKey.mockResolvedValue(null);
    await expect(callGemini('hello', { feature: TEST_FEATURE })).rejects.toThrow('API key not set');
  });

  it('calls generateContent with model and key query param', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        candidates: [{ content: { parts: [{ text: '応答テキスト' }] } }],
        usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 8 },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await callGemini('プロンプト', { feature: TEST_FEATURE });

    expect(result).toBe('応答テキスト');
    expect(mockedRecordUsage).toHaveBeenCalledWith({
      model: MODEL,
      feature: TEST_FEATURE,
      token_input: 12,
      token_output: 8,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(`/models/${MODEL}:generateContent`);
    expect(url).toContain('key=test-gemini-key-secret');
    expect(url).not.toContain('streamGenerateContent');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      contents: [{ parts: [{ text: 'プロンプト' }] }],
    });
  });

  it('uses model and apiKey overrides without reading storage', async () => {
    mockedGetApiKey.mockResolvedValue(null);
    const overrideModel = 'gemini-2.5-pro';
    const overrideKey = 'override-key-only';
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        candidates: [{ content: { parts: [{ text: 'ok' }] } }],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await callGemini('test', {
      feature: 'translation',
      model: overrideModel,
      apiKey: overrideKey,
    });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain(`/models/${overrideModel}:generateContent`);
    expect(url).toContain(`key=${overrideKey}`);
    expect(mockedGetApiKey).not.toHaveBeenCalled();
  });

  it('never exposes API key in GeminiError messages', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 403,
            message: `Invalid API key: ${API_KEY}`,
            status: 'PERMISSION_DENIED',
          },
        },
        403,
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    try {
      await callGemini('x', { feature: TEST_FEATURE });
      expect.fail('expected GeminiError');
    } catch (error) {
      expect(error).toBeInstanceOf(GeminiError);
      expect((error as GeminiError).kind).toBe('AUTH');
      expect((error as Error).message).not.toContain(API_KEY);
      expect((error as Error).message).toContain('***');
    }
  });

  it('retries on 429 then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: { code: 429, message: 'rate limited' } }, 429))
      .mockResolvedValueOnce(
        jsonResponse({
          candidates: [{ content: { parts: [{ text: 'ok' }] } }],
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const promise = callGemini('retry me', { feature: TEST_FEATURE });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws QUOTA after exhausting retries on 429', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: { code: 429, message: 'quota' } }, 429));
    vi.stubGlobal('fetch', fetchMock);

    const promise = callGemini('quota', { feature: TEST_FEATURE });
    const expectation = expect(promise).rejects.toMatchObject({ kind: 'QUOTA' });
    await vi.runAllTimersAsync();
    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('throws SERVER after retries on 503', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: { message: 'unavailable' } }, 503));
    vi.stubGlobal('fetch', fetchMock);

    const promise = callGemini('down', { feature: TEST_FEATURE });
    const expectation = expect(promise).rejects.toMatchObject({ kind: 'SERVER', status: 503 });
    await vi.runAllTimersAsync();
    await expectation;
  });

  it('throws NETWORK on fetch failure without leaking key', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError(`Failed: ${API_KEY}`));
    vi.stubGlobal('fetch', fetchMock);

    try {
      await callGemini('net', { feature: TEST_FEATURE });
      expect.fail('expected GeminiError');
    } catch (error) {
      expect(error).toMatchObject({ kind: 'NETWORK' });
      expect((error as Error).message).not.toContain(API_KEY);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('streams chunks via streamGenerateContent?alt=sse', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      sseResponse([
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Hello' }] } }] }),
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: ' world' }] } }],
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 },
        }),
      ]),
    );
    vi.stubGlobal('fetch', fetchMock);

    const chunks: string[] = [];
    for await (const chunk of callGemini('stream prompt', {
      stream: true,
      feature: TEST_FEATURE,
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello', ' world']);
    expect(mockedRecordUsage).toHaveBeenCalledWith({
      model: MODEL,
      feature: TEST_FEATURE,
      token_input: 5,
      token_output: 3,
    });
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain(':streamGenerateContent');
    expect(url).toContain('alt=sse');
  });

  it('redactGeminiUrl masks key query param', () => {
    expect(redactGeminiUrl(`https://example.com?key=${API_KEY}&alt=sse`)).toBe(
      'https://example.com?key=***&alt=sse',
    );
  });

  it('extractUsageTokens reads usageMetadata', () => {
    expect(
      extractUsageTokens({
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 4 },
      }),
    ).toEqual({ token_input: 10, token_output: 4 });
  });

  it('buildChatRequestBody includes systemInstruction and turns', () => {
    const body = JSON.parse(
      buildChatRequestBody('system', [
        { role: 'user', text: 'hi' },
        { role: 'model', text: 'hello' },
      ]),
    );

    expect(body.systemInstruction.parts[0].text).toBe('system');
    expect(body.contents).toEqual([
      { role: 'user', parts: [{ text: 'hi' }] },
      { role: 'model', parts: [{ text: 'hello' }] },
    ]);
  });

  it('streams chat via callGeminiChat', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      sseResponse([
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'A' }] } }] }),
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'B' }] } }] }),
      ]),
    );
    vi.stubGlobal('fetch', fetchMock);

    const chunks: string[] = [];
    for await (const chunk of callGeminiChat(
      'sys',
      [{ role: 'user', text: 'q' }],
      { stream: true, feature: 'project_qa' },
    )) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['A', 'B']);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = JSON.parse(init.body as string);
    expect(parsed.systemInstruction.parts[0].text).toBe('sys');
    expect(parsed.contents[0].role).toBe('user');
  });
});
