import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeBookmarkMeta,
  updateBookmarkMeta,
  folderFor,
  collectFolders,
  UNFILED_FOLDER,
  MAX_NOTE_LENGTH,
} from './bookmarks';

test('normalization keeps only bookmarked questions and trims values', () => {
  const meta = normalizeBookmarkMeta(['q1', 'q2'], {
    q1: {
      note: '  remember the JAK2 rule  ',
      folder: '  Hematology ',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
    q2: { folder: 'Unfiled' },
    q3: { note: 'orphan' },
  });

  assert.deepEqual(Object.keys(meta).sort(), ['q1']);
  assert.equal(meta.q1.note, 'remember the JAK2 rule');
  assert.equal(meta.q1.folder, 'Hematology');
  assert.equal(meta.q1.updatedAt, '2026-11-01T00:00:00.000Z');
});

test('notes are capped at the maximum length', () => {
  const long = 'x'.repeat(MAX_NOTE_LENGTH + 50);
  const meta = normalizeBookmarkMeta(['q1'], { q1: { note: long } });
  assert.equal(meta.q1.note?.length, MAX_NOTE_LENGTH);
});

test('updating a note keeps the existing folder', () => {
  let meta = updateBookmarkMeta(undefined, 'q1', { folder: 'Microbiology' });
  meta = updateBookmarkMeta(meta, 'q1', { note: 'Gram stain pearl' });
  assert.equal(meta.q1.folder, 'Microbiology');
  assert.equal(meta.q1.note, 'Gram stain pearl');
});

test('clearing note and folder removes the metadata entry', () => {
  let meta = updateBookmarkMeta(undefined, 'q1', { note: 'note', folder: 'Folder' });
  meta = updateBookmarkMeta(meta, 'q1', { note: '', folder: '' });
  assert.equal(meta.q1, undefined);
});

test('folderFor falls back to Unfiled and collectFolders is sorted and unique', () => {
  const meta = {
    q1: { folder: 'Hematology' },
    q2: { folder: 'Microbiology' },
    q3: { folder: 'Hematology' },
    q4: { note: 'no folder' },
  };
  assert.equal(folderFor(meta, 'q4'), UNFILED_FOLDER);
  assert.equal(folderFor(meta, 'missing'), UNFILED_FOLDER);
  assert.deepEqual(collectFolders(meta, ['q1', 'q2', 'q3', 'q4']), ['Hematology', 'Microbiology']);
});
