import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadSetExamConfig,
  saveSetExamConfig,
  clearSetExamConfig,
  getSetStorageKey,
} from '../../src/components/exam/ExamMode';

// Provide mock localStorage for Node test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
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
  } as Storage;
}

test('mock set config: loads official blueprint defaults when unset', () => {
  clearSetExamConfig('ASCP', 1);
  const cfg = loadSetExamConfig('ASCP', 1, 50, 0.25);
  assert.equal(cfg.durationMinutes, 50);
  assert.equal(cfg.negativeMarking, true);
  assert.equal(cfg.penaltyPerWrong, 0.25);
});

test('mock set config: saves and loads custom time duration and negative marking', () => {
  saveSetExamConfig('ASCP', 2, {
    durationMinutes: 90,
    negativeMarking: false,
    penaltyPerWrong: 0,
  });

  const cfg = loadSetExamConfig('ASCP', 2, 50, 0.25);
  assert.equal(cfg.durationMinutes, 90);
  assert.equal(cfg.negativeMarking, false);
  assert.equal(cfg.penaltyPerWrong, 0);
});

test('mock set config: custom penalty per wrong answer is preserved', () => {
  saveSetExamConfig('PSC', 3, {
    durationMinutes: 45,
    negativeMarking: true,
    penaltyPerWrong: 0.33,
  });

  const cfg = loadSetExamConfig('PSC', 3, 50, 0.25);
  assert.equal(cfg.durationMinutes, 45);
  assert.equal(cfg.negativeMarking, true);
  assert.equal(cfg.penaltyPerWrong, 0.33);
});

test('mock set config: clamps duration within safe bounds (5 to 300 minutes)', () => {
  // Directly write out-of-range values to localStorage to test robustness
  const key = getSetStorageKey('NHPC', 1);
  localStorage.setItem(
    key,
    JSON.stringify({ durationMinutes: 9999, negativeMarking: true, penaltyPerWrong: 0.25 })
  );

  // Out of bound duration should fall back to default
  const cfg = loadSetExamConfig('NHPC', 1, 50, 0.25);
  assert.equal(cfg.durationMinutes, 50);

  // Low duration below 5 should also fall back to default
  localStorage.setItem(
    key,
    JSON.stringify({ durationMinutes: 2, negativeMarking: true, penaltyPerWrong: 0.25 })
  );
  const cfgLow = loadSetExamConfig('NHPC', 1, 50, 0.25);
  assert.equal(cfgLow.durationMinutes, 50);
});

test('mock set config: clearSetExamConfig resets back to blueprint defaults', () => {
  saveSetExamConfig('CEE-UG', 1, {
    durationMinutes: 120,
    negativeMarking: false,
    penaltyPerWrong: 0,
  });

  // Verify saved
  const custom = loadSetExamConfig('CEE-UG', 1, 180, 0.25);
  assert.equal(custom.durationMinutes, 120);
  assert.equal(custom.negativeMarking, false);

  // Clear / reset
  clearSetExamConfig('CEE-UG', 1);

  // Should restore blueprint defaults
  const reset = loadSetExamConfig('CEE-UG', 1, 180, 0.25);
  assert.equal(reset.durationMinutes, 180);
  assert.equal(reset.negativeMarking, true);
  assert.equal(reset.penaltyPerWrong, 0.25);
});
