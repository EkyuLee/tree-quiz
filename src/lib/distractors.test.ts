import { describe, it, expect } from 'vitest';
import { pickDistractors, buildChoices } from '../lib/distractors';
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
function sp(id: string): Species {
  const s = getSpecies(id);
  if (!s) throw new Error(id);
  return s;
}

describe('pickDistractors', () => {
  it('요청한 개수만큼, 정답과 겹치지 않게 반환', () => {
    const ans = sp('sonamu');
    const ds = pickDistractors(ans, SPECIES, 3, seeded(1));
    expect(ds).toHaveLength(3);
    expect(ds.every((d) => d.id !== ans.id)).toBe(true);
    expect(new Set(ds.map((d) => d.id)).size).toBe(3);
  });

  it('같은 혼동그룹 수종을 우선으로 포함 (소나무 → 곰솔/반송 등 2침엽 그룹)', () => {
    const ans = sp('sonamu'); // confusionGroup: pinus-2needle (곰솔, 반송)
    const ds = pickDistractors(ans, SPECIES, 2, seeded(5));
    const groupMates = ds.filter((d) => d.confusionGroup === 'pinus-2needle');
    expect(groupMates.length).toBeGreaterThanOrEqual(1);
  });
});

describe('buildChoices', () => {
  it('정답을 반드시 포함하고 길이가 맞다', () => {
    const ans = sp('danpungnamu');
    const choices = buildChoices(ans, SPECIES, 4, seeded(2));
    expect(choices).toHaveLength(4);
    expect(choices).toContain(ans.id);
    expect(new Set(choices).size).toBe(4);
  });
});
