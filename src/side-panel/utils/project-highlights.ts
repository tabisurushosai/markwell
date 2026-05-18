import type { Highlight } from '../../shared/types/highlight.js';
import type { Project } from '../../shared/types/project.js';

/** プロジェクトの highlight_order に従って並べる（未登録は末尾・作成日降順） */
export function orderHighlightsForProject(
  highlights: Highlight[],
  project: Project,
): Highlight[] {
  const byId = new Map(highlights.map((highlight) => [highlight.id, highlight]));
  const ordered: Highlight[] = [];

  for (const id of project.highlight_order) {
    const highlight = byId.get(id);
    if (highlight !== undefined) {
      ordered.push(highlight);
      byId.delete(id);
    }
  }

  const remainder = [...byId.values()].sort((a, b) => b.created_at - a.created_at);
  return [...ordered, ...remainder];
}
