import { describe, it, expect } from 'vitest';
import {
  shuffle,
  shuffleNoConsecutive,
  sample,
  countConsecutive,
  type Rng,
} from '../lib/shuffle';

// 결정적 RNG (선형 합동) — 재현 가능한 테스트
function seeded(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

describe('shuffle', () => {
  it('원본을 변경하지 않고 같은 원소집합을 반환', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const out = shuffle(arr, seeded(1));
    expect(out).toHaveLength(arr.length);
    expect([...out].sort((a, b) => a - b)).toEqual(arr);
    expect(arr).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); // 불변
  });

  it('서로 다른 시드는 (대개) 다른 순서를 만든다', () => {
    const arr = Array.from({ length: 30 }, (_, i) => i);
    const a = shuffle(arr, seeded(1));
    const b = shuffle(arr, seeded(2));
    expect(a).not.toEqual(b);
  });

  it('sample은 n개를 비복원 추출', () => {
    const arr = Array.from({ length: 20 }, (_, i) => i);
    const s = sample(arr, 5, seeded(3));
    expect(s).toHaveLength(5);
    expect(new Set(s).size).toBe(5);
  });
});

describe('shuffleNoConsecutive', () => {
  it('같은 key가 연속하지 않게 배치 (분산 가능한 경우 0쌍)', () => {
    // 각 수종이 2번씩 10종 = 20문항, 과반 없음 → 완전 분리 가능
    const items: { id: string }[] = [];
    for (let k = 0; k < 10; k++) {
      items.push({ id: `sp${k}` }, { id: `sp${k}` });
    }
    for (let seed = 1; seed <= 20; seed++) {
      const out = shuffleNoConsecutive(items, (x) => x.id, seeded(seed));
      expect(countConsecutive(out, (x) => x.id)).toBe(0);
    }
  });

  it('원소 수가 보존된다', () => {
    const items = Array.from({ length: 15 }, (_, i) => ({ id: `s${i % 5}` }));
    const out = shuffleNoConsecutive(items, (x) => x.id, seeded(7));
    expect(out).toHaveLength(items.length);
  });
});
