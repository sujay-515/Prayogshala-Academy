import test from 'node:test';
import assert from 'node:assert/strict';
import { clearUserScopedStorage, USER_SCOPED_STORAGE_KEYS, PUBLIC_CACHE_KEYS } from './storage';

function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

test('clearUserScopedStorage tests', async (t) => {
  await t.test('removes all user- and admin-scoped keys', () => {
    const storage = createMockStorage();

    // Populate all user- and admin-scoped keys
    for (const key of USER_SCOPED_STORAGE_KEYS) {
      storage.setItem(key, `data-for-${key}`);
    }

    // Populate public caches
    storage.setItem(PUBLIC_CACHE_KEYS.CATEGORIES, JSON.stringify([{ id: 'cat-1', name: 'Hematology' }]));
    const cleanPublicQuestions = [
      {
        id: 'q-clean-1',
        code: 'LAB-001',
        questionText: 'Clean question?',
        options: [
          { id: 'A', text: 'Opt 1' },
          { id: 'B', text: 'Opt 2' },
        ],
        unit: 'Hematology',
        subject: 'RBCs',
        difficulty: 'Easy',
        examCategories: ['ASCP'],
      },
    ];
    storage.setItem(PUBLIC_CACHE_KEYS.QUESTIONS, JSON.stringify(cleanPublicQuestions));

    clearUserScopedStorage(storage);

    // Verify all user- and admin-scoped keys are removed
    for (const key of USER_SCOPED_STORAGE_KEYS) {
      assert.equal(storage.getItem(key), null, `Key ${key} should have been removed`);
    }

    // Verify public categories and clean questions are preserved
    assert.notEqual(storage.getItem(PUBLIC_CACHE_KEYS.CATEGORIES), null);
    assert.notEqual(storage.getItem(PUBLIC_CACHE_KEYS.QUESTIONS), null);
  });

  await t.test('discards public questions cache if it contains reveal-only fields', () => {
    const storage = createMockStorage();

    const leakedQuestions = [
      {
        id: 'q-leaked-1',
        code: 'LAB-002',
        questionText: 'Leaked question?',
        options: [{ id: 'A', text: 'Opt 1' }],
        correctAnswer: 'A',
        explanation: 'Secret explanation',
      },
    ];
    storage.setItem(PUBLIC_CACHE_KEYS.QUESTIONS, JSON.stringify(leakedQuestions));
    storage.setItem(PUBLIC_CACHE_KEYS.CATEGORIES, JSON.stringify([{ id: 'cat-1' }]));

    clearUserScopedStorage(storage);

    // Question cache with reveal-only fields MUST be discarded
    assert.equal(storage.getItem(PUBLIC_CACHE_KEYS.QUESTIONS), null);
    // Categories should remain
    assert.notEqual(storage.getItem(PUBLIC_CACHE_KEYS.CATEGORIES), null);
  });

  await t.test('discards public questions cache if per-option rationale is present', () => {
    const storage = createMockStorage();

    const rationaleQuestions = [
      {
        id: 'q-rationale-1',
        questionText: 'Rationale question?',
        options: [{ id: 'A', text: 'Opt 1', rationale: 'Distractor rationale' }],
      },
    ];
    storage.setItem(PUBLIC_CACHE_KEYS.QUESTIONS, JSON.stringify(rationaleQuestions));

    clearUserScopedStorage(storage);

    assert.equal(storage.getItem(PUBLIC_CACHE_KEYS.QUESTIONS), null);
  });
});
