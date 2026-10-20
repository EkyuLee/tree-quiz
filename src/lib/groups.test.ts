import { describe, it, expect } from 'vitest';
import {
  orderedGroups,
  shuffledGroups,
  validGroups,
  GROUP_SIZE,
  GROUP_COUNT,
} from '../lib/groups';
import { pickPhotos } from '../lib/question';
import { SPECIES, getSpecies } from '../lib/data';
import type { Rng } from '../lib/shuffle';
import type { Species } from '../types';

function seeded(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

describe('감별 연습 그룹 분할', () => {
  it('기본 분할은 6그룹 × 20종 = 120종, 순번 순서', () => {
    const g = orderedGroups();
    expect(g).toHaveLength(GROUP_COUNT);
    expect(g.every((grp) => grp.length === GROUP_SIZE)).toBe(true);
    expect(g.flat()).toHaveLength(120);
    // 1그룹 첫 수종은 순번 1(가막살나무)
    expect(getSpecies(g[0][0])?.order).toBe(1);
    expect(validGroups(g)).toBe(true);
  });

  it('섞기: 120종이 중복·누락 없이 20×6으로 재편성', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const g = shuffledGroups(seeded(seed));
      expect(g).toHaveLength(GROUP_COUNT);
      expect(g.every((grp) => grp.length === GROUP_SIZE)).toBe(true);
      const flat = g.flat();
      expect(flat).toHaveLength(120);
      expect(new Set(flat).size).toBe(120); // 중복 없음
      expect(validGroups(g)).toBe(true); // 누락 없음
    }
  });

  it('서로 다른 시드는 (대개) 다른 편성을 만든다', () => {
    const a = shuffledGroups(seeded(1)).flat();
    const b = shuffledGroups(seeded(99)).flat();
    expect(a).not.toEqual(b);
  });

  it('validGroups: 120종 모두 포함해야 true, 누락/중복이면 false', () => {
    const good = orderedGroups();
    expect(validGroups(good)).toBe(true);
    const missing = good.map((g) => g.slice());
    missing[0] = missing[0].slice(1); // 한 종 제거 → 119
    expect(validGroups(missing)).toBe(false);
    const dup = orderedGroups();
    dup[1][0] = dup[0][0]; // 중복 삽입
    expect(validGroups(dup)).toBe(false);
  });
});

describe('pickPhotos (감별 그리드용)', () => {
  function sp(id: string): Species {
    const s = getSpecies(id);
    if (!s) throw new Error(id);
    return s;
  }

  it('사진이 충분하면 정확히 n장, 모두 서로 다른 파일', () => {
    const photos = pickPhotos(sp('sonamu'), 4, seeded(3));
    expect(photos.length).toBe(4);
    expect(new Set(photos.map((p) => p.file)).size).toBe(4);
  });

  it('사진이 n장 미만이면 있는 만큼만 (히어리=1장)', () => {
    const photos = pickPhotos(sp('hieori'), 4, seeded(3));
    expect(photos.length).toBeLessThanOrEqual(4);
    expect(photos.length).toBeGreaterThanOrEqual(1);
  });

  it('모든 수종에서 최소 1장 이상 뽑힌다(데이터 무결성)', () => {
    for (const s of SPECIES) {
      const photos = pickPhotos(s, 4, seeded(1));
      expect(photos.length).toBeGreaterThanOrEqual(1);
    }
  });
});
