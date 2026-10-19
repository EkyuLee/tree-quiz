// 문제 생성 — 사진 선택(최근 회피·부위 다양성), 모드별 문제 구성
import type { AnswerMode, Photo, Question, Species } from '../types';
import { buildChoices } from './distractors';
import { shuffle, shuffleNoConsecutive, type Rng } from './shuffle';

/** 제외되지 않은 사진 */
export function usablePhotos(sp: Species): Photo[] {
  return sp.photos.filter((p) => !p.excluded && p.file);
}

/**
 * 사진 한 장 선택: 최근 본 사진은 피하고, 가능하면 다양한 부위.
 * recentFiles: 최근 보여준 파일 경로
 */
export function pickPhoto(
  sp: Species,
  recentFiles: string[] = [],
  rng: Rng = Math.random,
): Photo | undefined {
  const photos = usablePhotos(sp);
  if (photos.length === 0) return undefined;
  const fresh = photos.filter((p) => !recentFiles.includes(p.file!));
  const pool = fresh.length > 0 ? fresh : photos;
  return shuffle(pool, rng)[0];
}

export interface BuildQuestionOpts {
  answerMode: AnswerMode;
  choiceCount?: number; // choice 모드일 때 보기 수
  recentFiles?: (id: string) => string[];
  rng?: Rng;
  allSpecies: Species[];
}

export function buildQuestion(sp: Species, opts: BuildQuestionOpts): Question {
  const rng = opts.rng ?? Math.random;
  const photo = pickPhoto(sp, opts.recentFiles?.(sp.id) ?? [], rng);
  const q: Question = {
    speciesId: sp.id,
    photo,
    answerMode: opts.answerMode,
  };
  if (opts.answerMode === 'choice') {
    q.choices = buildChoices(sp, opts.allSpecies, opts.choiceCount ?? 4, rng);
  }
  return q;
}

/**
 * 수종 목록으로 세션 문제들을 만든다.
 * 같은 수종이 연속으로 나오지 않도록 셔플(교차 학습).
 */
export function buildSession(
  speciesIds: string[],
  getSp: (id: string) => Species | undefined,
  opts: BuildQuestionOpts,
): Question[] {
  const rng = opts.rng ?? Math.random;
  const ordered = shuffleNoConsecutive(speciesIds, (id) => id, rng);
  const qs: Question[] = [];
  for (const id of ordered) {
    const sp = getSp(id);
    if (sp) qs.push(buildQuestion(sp, opts));
  }
  return qs;
}
