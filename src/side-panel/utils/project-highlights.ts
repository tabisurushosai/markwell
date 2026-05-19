import type { Highlight } from '../../shared/types/highlight.js';
import type { Project } from '../../shared/types/project.js';

/** Sort by project highlight_order (unknown ids last, then created_at desc) */
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
