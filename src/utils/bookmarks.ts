/**
 * Bookmark notes and free-text folders.
 *
 * Membership stays in `bookmarkedIds` (used by every bookmark toggle); the
 * optional `bookmarkMeta` map carries the note, folder and last-edit timestamp.
 */
import type { BookmarkMeta } from '../types';

export const UNFILED_FOLDER = 'Unfiled';
export const MAX_NOTE_LENGTH = 2000;
export const MAX_FOLDER_LENGTH = 60;

function cleanFolder(folder: unknown): string | undefined {
  if (typeof folder !== 'string') return undefined;
  const trimmed = folder.trim().slice(0, MAX_FOLDER_LENGTH);
  if (!trimmed) return undefined;
  if (trimmed.toLowerCase() === UNFILED_FOLDER.toLowerCase()) return undefined;
  return trimmed;
}

function cleanNote(note: unknown): string | undefined {
  if (typeof note !== 'string') return undefined;
  const trimmed = note.trim().slice(0, MAX_NOTE_LENGTH);
  return trimmed ? trimmed : undefined;
}

/** Drops metadata for questions that are no longer bookmarked and clamps values. */
export function normalizeBookmarkMeta(
  bookmarkedIds: string[] | undefined,
  meta: Record<string, BookmarkMeta> | undefined
): Record<string, BookmarkMeta> {
  const ids = new Set(Array.isArray(bookmarkedIds) ? bookmarkedIds : []);
  const normalized: Record<string, BookmarkMeta> = {};
  if (!meta || typeof meta !== 'object') return normalized;

  for (const [id, value] of Object.entries(meta)) {
    if (!ids.has(id) || !value || typeof value !== 'object') continue;
    const note = cleanNote(value.note);
    const folder = cleanFolder(value.folder);
    const updatedAt =
      typeof value.updatedAt === 'string' && value.updatedAt.length <= 40 ? value.updatedAt : undefined;
    if (note || folder || updatedAt) {
      normalized[id] = {
        ...(note ? { note } : {}),
        ...(folder ? { folder } : {}),
        ...(updatedAt ? { updatedAt } : {}),
      };
    }
  }
  return normalized;
}

/** Applies a partial patch, deleting the entry when both note and folder are empty. */
export function updateBookmarkMeta(
  meta: Record<string, BookmarkMeta> | undefined,
  id: string,
  patch: Partial<BookmarkMeta>
): Record<string, BookmarkMeta> {
  const next = { ...(meta || {}) };
  const current = next[id] || {};

  const note = patch.note !== undefined ? cleanNote(patch.note) : cleanNote(current.note);
  const folder = patch.folder !== undefined ? cleanFolder(patch.folder) : cleanFolder(current.folder);

  if (!note && !folder) {
    delete next[id];
    return next;
  }

  next[id] = {
    ...(note ? { note } : {}),
    ...(folder ? { folder } : {}),
    updatedAt: new Date().toISOString(),
  };
  return next;
}

export function folderFor(meta: Record<string, BookmarkMeta> | undefined, id: string): string {
  return meta?.[id]?.folder || UNFILED_FOLDER;
}

/** Existing folder names, excluding the implicit Unfiled bucket. */
export function collectFolders(
  meta: Record<string, BookmarkMeta> | undefined,
  bookmarkedIds: string[] | undefined
): string[] {
  const ids = new Set(Array.isArray(bookmarkedIds) ? bookmarkedIds : []);
  const folders = new Set<string>();
  for (const [id, value] of Object.entries(meta || {})) {
    if (!ids.has(id)) continue;
    const folder = cleanFolder(value?.folder);
    if (folder) folders.add(folder);
  }
  return Array.from(folders).sort((a, b) => a.localeCompare(b));
}
