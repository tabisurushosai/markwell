import { SettingsSchema, type Settings } from '../types/settings.js';
import { kvGet, kvSet } from './kv.js';

const SETTINGS_KEY = 'markwell:settings';
const AES_KEY_STORAGE_KEY = 'markwell:crypto:aes-gcm-key';

const DEFAULT_SETTINGS: Settings = {
  default_color: 'yellow',
  font_scale: 1.0,
  density: 'normal',
  blocked_domains: [],
  blocked_url_patterns: [],
  ai: {
    provider: 'gemini',
    api_key_encrypted: '',
    model: 'gemini-2.0-flash',
  },
  shortcuts: {
    quick_highlight: 'Alt+H',
    open_synthesis: 'Alt+S',
  },
  onboarding_seen: false,
};

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  const stored = await chrome.storage.local.get(AES_KEY_STORAGE_KEY);
  const jwk = stored[AES_KEY_STORAGE_KEY] as JsonWebKey | undefined;

  if (jwk !== undefined) {
    return crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]);
  }

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const exported = await crypto.subtle.exportKey('jwk', key);
  await chrome.storage.local.set({ [AES_KEY_STORAGE_KEY]: exported });
  return key;
}

async function encryptPlaintext(plain: string): Promise<string> {
  const key = await getOrCreateEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain),
  );

  return JSON.stringify({
    iv: uint8ToBase64(iv),
    data: uint8ToBase64(new Uint8Array(cipher)),
  });
}

async function decryptCiphertext(encrypted: string): Promise<string> {
  if (encrypted === '') {
    return '';
  }

  const payload = JSON.parse(encrypted) as { iv: string; data: string };
  const key = await getOrCreateEncryptionKey();
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToUint8(payload.iv) },
    key,
    base64ToUint8(payload.data),
  );

  return new TextDecoder().decode(plain);
}

function mergeSettings(base: Settings, patch: Partial<Settings>): Settings {
  return {
    ...base,
    ...patch,
    ai: {
      ...base.ai,
      ...patch.ai,
    },
    shortcuts: {
      ...base.shortcuts,
      ...patch.shortcuts,
    },
  };
}

export async function getSettings(): Promise<Settings> {
  const stored = await kvGet(SETTINGS_KEY, SettingsSchema);
  if (stored === null) {
    return { ...DEFAULT_SETTINGS };
  }
  return mergeSettings(DEFAULT_SETTINGS, stored);
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = mergeSettings(current, patch);
  await kvSet(SETTINGS_KEY, next, SettingsSchema);
  return next;
}

export async function setApiKey(plain: string): Promise<void> {
  const apiKeyEncrypted = await encryptPlaintext(plain);
  await setSettings({
    ai: {
      provider: 'gemini',
      api_key_encrypted: apiKeyEncrypted,
      model: (await getSettings()).ai.model,
    },
  });
}

export async function getApiKey(): Promise<string | null> {
  const encrypted = (await getSettings()).ai.api_key_encrypted;
  if (encrypted === '') {
    return null;
  }

  const plain = await decryptCiphertext(encrypted);
  return plain === '' ? null : plain;
}
