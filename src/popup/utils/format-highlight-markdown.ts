import type { Highlight } from '../../shared/types/highlight.js';

function formatYmd(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function escapeMarkdownLinkLabel(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\[/g, '\\[');
}

function toBlockquoteLines(text: string): string[] {
  if (text === '') {
    return ['>'];
  }
  return text.split(/\r?\n/).map((line) => `> ${line}`);
}

/** §9: Available on Free — format highlight as Markdown blockquote */
export function formatHighlightAsMarkdown(highlight: Highlight): string {
  const date = formatYmd(highlight.created_at);
  const title = escapeMarkdownLinkLabel(highlight.page_title);
  const lines: string[] = [
    ...toBlockquoteLines(highlight.selected_text),
    '>',
    `> — [${title}](${highlight.url}) (${highlight.domain}, ${date})`,
  ];

  const note = highlight.note.trim();
  if (note !== '') {
    lines.push('>', ...toBlockquoteLines(note));
  }

  return lines.join('\n');
}
