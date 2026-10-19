// 객관식 오답 보기(distractor) 선택 — 같은 혼동그룹/속에서 우선
import type { Species } from '../types';
import { shuffle, type Rng } from './shuffle';

/**
 * 정답 수종에 대해 어려운 오답 보기 n개를 고른다.
 * 1순위: 같은 confusionGroup, 2순위: 같은 속(genus), 3순위: 같은 과(family), 4순위: 나머지
 * 각 순위 내에서는 무작위.
 */
export function pickDistractors(
  answer: Species,
  all: Species[],
  n: number,
  rng: Rng = Math.random,
): Species[] {
  const others = all.filter((s) => s.id !== answer.id);

  const sameGroup = answer.confusionGroup
    ? others.filter((s) => s.confusionGroup === answer.confusionGroup)
    : [];
  const sameGenus = others.filter(
    (s) => s.genusScientific === answer.genusScientific && !sameGroup.includes(s),
  );
  const sameFamily = others.filter(
    (s) =>
      s.familyScientific === answer.familyScientific &&
      !sameGroup.includes(s) &&
      !sameGenus.includes(s),
  );
  const chosen = new Set<string>();
  const result: Species[] = [];

  const tiers = [shuffle(sameGroup, rng), shuffle(sameGenus, rng), shuffle(sameFamily, rng)];
  for (const tier of tiers) {
    for (const s of tier) {
      if (result.length >= n) break;
      if (!chosen.has(s.id)) {
        chosen.add(s.id);
        result.push(s);
      }
    }
    if (result.length >= n) break;
  }

  if (result.length < n) {
    const rest = shuffle(
      others.filter((s) => !chosen.has(s.id)),
      rng,
    );
    for (const s of rest) {
      if (result.length >= n) break;
      chosen.add(s.id);
      result.push(s);
    }
  }
  return result.slice(0, n);
}

/** 정답 + 오답 보기들을 섞어 최종 보기 id 배열 생성 */
export function buildChoices(
  answer: Species,
  all: Species[],
  totalChoices: number,
  rng: Rng = Math.random,
): string[] {
  const distractors = pickDistractors(answer, all, totalChoices - 1, rng);
  return shuffle([answer, ...distractors], rng).map((s) => s.id);
}
