import { describe, it, expect } from 'vitest';
import {
  newCardRecord,
  reviewCard,
  buildTodaySession,
  passProbability,
  binomialTailGE,
  retrievability,
  State,
} from '../lib/fsrs';
import { SPECIES } from '../lib/data';
import type { CardRecord, Species } from '../types';

const SUB: Species[] = SPECIES.slice(0, 10);

describe('FSRS 카드', () => {
  it('새 카드는 New 상태, reps 0', () => {
    const c = newCardRecord('sonamu');
    expect(c.state).toBe(State.New);
    expect(c.reps).toBe(0);
    expect(c.seen).toBe(0);
  });

  it('정답 복습 후 due가 미래로, reps 증가', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const c0 = newCardRecord('sonamu', now);
    const c1 = reviewCard(c0, 'correct', now);
    expect(c1.reps).toBe(1);
    expect(c1.seen).toBe(1);
    expect(c1.correct).toBe(1);
    expect(new Date(c1.due).getTime()).toBeGreaterThan(now.getTime());
  });

  it('오답은 wrong 카운트 증가', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const c1 = reviewCard(newCardRecord('x', now), 'wrong', now);
    expect(c1.wrong).toBe(1);
  });
});

describe('buildTodaySession', () => {
  it('안 본 카드는 fresh, newLimit로 제한', () => {
    const cards: Record<string, CardRecord> = {};
    const { review, fresh } = buildTodaySession(SUB, cards, 3);
    expect(review).toHaveLength(0);
    expect(fresh).toHaveLength(3);
  });

  it('due 지난 복습 카드는 review에 포함', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    const past = newCardRecord(SUB[0].id, new Date('2026-01-01'));
    const reviewed = reviewCard(past, 'correct', new Date('2026-01-01'));
    // due를 과거로 강제 → 복습 대상
    reviewed.due = new Date('2026-05-01').toISOString();
    const cards: Record<string, CardRecord> = { [SUB[0].id]: reviewed };
    const { review } = buildTodaySession(SUB, cards, 5, now);
    expect(review).toContain(SUB[0].id);
  });
});

describe('합격 가능성', () => {
  it('이항분포 꼬리확률: 경계값', () => {
    expect(binomialTailGE(20, 0, 0.5)).toBe(1);
    expect(binomialTailGE(20, 21, 0.5)).toBe(0);
    expect(binomialTailGE(20, 12, 1)).toBe(1);
    // p=0.5, 20문항, 12개 이상 → 0과 1 사이
    const mid = binomialTailGE(20, 12, 0.5);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });

  it('학습 안 한 상태는 합격확률 낮음', () => {
    const { probability, meanRetrievability } = passProbability(SPECIES, {}, {});
    expect(meanRetrievability).toBe(0);
    expect(probability).toBe(0);
  });

  it('모두 숙달하면 합격확률이 매우 높음', () => {
    // 인위적으로 높은 안정성 카드 구성
    const now = new Date();
    const cards: Record<string, CardRecord> = {};
    for (const s of SPECIES) {
      const c = newCardRecord(s.id, now);
      c.state = State.Review;
      c.reps = 10;
      c.stability = 1000;
      c.difficulty = 2;
      c.last_review = now.toISOString();
      c.due = new Date(now.getTime() + 1000 * 86400000).toISOString();
      cards[s.id] = c;
    }
    const r = retrievability(cards[SPECIES[0].id], now);
    expect(r).toBeGreaterThan(0.9);
    const { probability } = passProbability(SPECIES, cards, { now });
    expect(probability).toBeGreaterThan(0.95);
  });
});
