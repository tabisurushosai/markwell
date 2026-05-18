export const GEMINI_MODEL_OPTIONS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-pro',
] as const;

export type GeminiModelOption = (typeof GEMINI_MODEL_OPTIONS)[number];

export const GEMINI_API_KEY_URL = 'https://aistudio.google.com/apikey';
