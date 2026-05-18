import { deleteTag, updateTagColor } from '../../shared/storage/tags.js';

export async function bulkDeleteTags(tagIds: string[]): Promise<number> {
  let deleted = 0;
  for (const tagId of tagIds) {
    await deleteTag(tagId);
    deleted += 1;
  }
  return deleted;
}

export async function bulkUpdateTagColors(tagIds: string[], color: string): Promise<number> {
  let updated = 0;
  for (const tagId of tagIds) {
    const tag = await updateTagColor(tagId, color);
    if (tag.color.toLowerCase() === color.toLowerCase()) {
      updated += 1;
    }
  }
  return updated;
}
