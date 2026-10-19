// FSRS 스케줄링 래퍼 (ts-fsrs) + 세션 구성 + 합격 가능성 추정
import {
  createEmptyCard,
  FSRS,
  generatorParameters,
  Rating,
  State,
  type Card,
  type Grade as FsrsGrade,
} from 'ts-fsrs';
import type { CardRecord, Grade, Species } from '../types';

const params = generatorParameters({ enable_fuzz: true });
const fsrs = new FSRS(params);

/** 새 카드 레코드 생성 */
export function newCardRecord(speciesId: string, now = new Date()): CardRecord {
  const c = createEmptyCard(now);
  return {
    speciesId,
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review ? c.last_review.toISOString() : undefined,
    learning_steps: c.learning_steps ?? 0,
    seen: 0,
    correct: 0,
    wrong: 0,
    recentPhotos: [],
  };
}

function toCard(r: CardRecord): Card {
  return {
    due: new Date(r.due),
    stability: r.stability,
    difficulty: r.difficulty,
    elapsed_days: r.elapsed_days,
    scheduled_days: r.scheduled_days,
    reps: r.reps,
    lapses: r.lapses,
    state: r.state as State,
    last_review: r.last_review ? new Date(r.last_review) : undefined,
    learning_steps: r.learning_steps,
  };
}

/** 퀴즈 채점(correct/almost/wrong)을 FSRS Rating으로 변환 */
export function gradeToRating(grade: Grade): FsrsGrade {
  switch (grade) {
    case 'correct':
      return Rating.Good;
    case 'almost':
      return Rating.Hard;
    case 'wrong':
      return Rating.Again;
  }
}

/** 채점 결과로 카드 레코드를 갱신(복습 반영) */
export function reviewCard(r: CardRecord, grade: Grade, now = new Date()): CardRecord {
  const card = toCard(r);
  const rating = gradeToRating(grade);
  const scheduled = fsrs.next(card, now, rating);
  const c = scheduled.card;
  return {
    ...r,
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review ? c.last_review.toISOString() : now.toISOString(),
    learning_steps: c.learning_steps ?? 0,
    seen: r.seen + 1,
    correct: r.correct + (grade === 'correct' ? 1 : 0),
    wrong: r.wrong + (grade === 'wrong' ? 1 : 0),
  };
}

/** 현재 시점의 회상 확률(retrievability) 0~1 */
export function retrievability(r: CardRecord, now = new Date()): number {
  if (r.state === State.New || r.reps === 0) return 0;
  return fsrs.get_retrievability(toCard(r), now, false) as number;
}

/**
 * 오늘의 학습 세션 구성:
 * - due가 지난 복습 카드 전부 + 아직 안 본 새 카드 newLimit개
 * 반환: 학습할 speciesId 목록
 */
export function buildTodaySession(
  allSpecies: Species[],
  cards: Record<string, CardRecord>,
  newLimit: number,
  now = new Date(),
): { review: string[]; fresh: string[] } {
  const review: string[] = [];
  const fresh: string[] = [];
  for (const sp of allSpecies) {
    const r = cards[sp.id];
    if (!r || r.state === State.New || r.reps === 0) {
      fresh.push(sp.id);
    } else if (new Date(r.due) <= now) {
      review.push(sp.id);
    }
  }
  return { review, fresh: fresh.slice(0, newLimit) };
}

/**
 * 합격 가능성 추정.
 * 시험은 120종 중 20종 영상 감별. 각 수종의 retrievability 평균을 숙달도로 보고,
 * 20문항에서 60%(12문항) 이상 맞출 확률을 이항분포로 추정한다.
 * 아직 안 본 카드는 0으로 계산(보수적).
 */
export function passProbability(
  allSpecies: Species[],
  cards: Record<string, CardRecord>,
  opts: { questions?: number; passRatio?: number; now?: Date } = {},
): { meanRetrievability: number; probability: number } {
  const questions = opts.questions ?? 20;
  const passRatio = opts.passRatio ?? 0.6;
  const now = opts.now ?? new Date();

  const rs = allSpecies.map((sp) => {
    const r = cards[sp.id];
    return r ? retrievability(r, now) : 0;
  });
  const mean = rs.reduce((a, b) => a + b, 0) / (rs.length || 1);

  // 각 문항 정답 확률 p = mean 으로 근사한 이항분포에서 P(X >= needed)
  const needed = Math.ceil(questions * passRatio);
  const p = Math.min(Math.max(mean, 0), 1);
  const probability = binomialTailGE(questions, needed, p);
  return { meanRetrievability: mean, probability };
}

/** 이항분포 P(X >= k), n시행 성공확률 p */
export function binomialTailGE(n: number, k: number, p: number): number {
  if (k <= 0) return 1;
  if (k > n) return 0;
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let sum = 0;
  for (let i = k; i <= n; i++) {
    sum += binomPmf(n, i, p);
  }
  return Math.min(Math.max(sum, 0), 1);
}

function binomPmf(n: number, i: number, p: number): number {
  return Math.exp(logChoose(n, i) + i * Math.log(p) + (n - i) * Math.log(1 - p));
}

function logChoose(n: number, k: number): number {
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

const logFactCache: number[] = [0, 0];
function logFactorial(n: number): number {
  if (n < logFactCache.length) return logFactCache[n];
  let v = logFactCache[logFactCache.length - 1];
  for (let i = logFactCache.length; i <= n; i++) {
    v += Math.log(i);
    logFactCache[i] = v;
  }
  return logFactCache[n];
}

export { State, Rating };
