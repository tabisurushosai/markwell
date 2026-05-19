import type { ImportResult } from '../../shared/storage/io.js';
import { t } from '../../shared/utils/i18n.js';

export function buildMarkwellExportFilename(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `markwell-export-${year}-${month}-${day}.json`;
}

export function downloadJsonFile(data: unknown, filename: string): void {
  const content = JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function formatImportResultMessage(result: ImportResult): string {
  const { highlights, tags, projects, syntheses } = result.imported;
  return t('options_data_import_result', [
    String(highlights),
    String(tags),
    String(projects),
    String(syntheses),
  ]);
}
