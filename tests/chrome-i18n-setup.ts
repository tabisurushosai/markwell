import en from '../public/_locales/en/messages.json';

type LocaleMessage = {
  message: string;
  placeholders?: Record<string, { content: string }>;
};

const messages = en as Record<string, LocaleMessage>;

function formatMessage(entry: LocaleMessage, substitutions?: string[]): string {
  let text = entry.message;
  if (!substitutions?.length) {
    return text;
  }
  const placeholders = entry.placeholders;
  if (placeholders) {
    let index = 0;
    for (const [name, spec] of Object.entries(placeholders)) {
      const value = substitutions[index] ?? '';
      text = text.replaceAll(`$${name}$`, value);
      if (spec.content.startsWith('$')) {
        text = text.replaceAll(spec.content, value);
      }
      index += 1;
    }
    return text;
  }
  for (const sub of substitutions) {
    text = text.replace(/\$\d+|\$[A-Za-z_]+\$/, sub);
  }
  return text;
}

if (typeof globalThis.chrome === 'undefined') {
  (globalThis as { chrome: typeof chrome }).chrome = {
    i18n: {
      getMessage(key: string, substitutions?: string | string[]) {
        const entry = messages[key];
        if (!entry) {
          return '';
        }
        const subs =
          substitutions === undefined
            ? undefined
            : Array.isArray(substitutions)
              ? substitutions
              : [substitutions];
        return formatMessage(entry, subs);
      },
    },
  } as typeof chrome;
}
