import { describe, expect, it } from 'vitest';
import type { Highlight } from '../src/shared/types/highlight.js';
import type { Project } from '../src/shared/types/project.js';
import { orderHighlightsForProject } from '../src/side-panel/utils/project-highlights.js';

const baseHighlight = (id: string, created_at: number): Highlight =>
  ({
    id,
    created_at,
    updated_at: created_at,
  }) as Highlight;

const project: Project = {
  id: 'p1',
  name: 'Test',
  description: '',
  cover_emoji: '📌',
  highlight_order: ['b', 'a'],
  created_at: 0,
  updated_at: 0,
};

describe('orderHighlightsForProject', () => {
  it('orders by highlight_order then remainder by date', () => {
    const highlights = [
      baseHighlight('a', 100),
      baseHighlight('b', 200),
      baseHighlight('c', 300),
    ];
    const ordered = orderHighlightsForProject(highlights, project);
    expect(ordered.map((h) => h.id)).toEqual(['b', 'a', 'c']);
  });
});
