import { callGemini } from './gemini.js';
import { assertAiAccess } from '../license/ai-access.js';
import { getCurrentTier } from '../storage/license.js';

export function streamProjectSynthesis(
  prompt: string,
  opts: { signal?: AbortSignal },
): AsyncGenerator<string, void, undefined> {
  return (async function* () {
    const tier = await getCurrentTier();
    assertAiAccess(tier, 'synthesis');
    yield* callGemini(prompt, {
      stream: true,
      feature: 'synthesis',
      ...(opts.signal !== undefined ? { signal: opts.signal } : {}),
    });
  })();
}
