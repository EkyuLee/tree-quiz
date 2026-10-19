// 정답 매칭 — 별칭·띄어쓰기 무시, 오타 근접(거의 맞음) 판정
import type { Species, GradeResult } from '../types';

/** 공백 제거 + 소문자 + 앞뒤 공백 정리 (한글은 그대로) */
export function normalize(s: string): string {
  return s.replace(/\s+/g, '').trim().toLowerCase();
}

/** Levenshtein 편집 거리 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1, // 삭제
        dp[j - 1] + 1, // 삽입
        prev + (a[i - 1] === b[j - 1] ? 0 : 1), // 치환
      );
      prev = tmp;
    }
  }
  return dp[m];
}

/**
 * 어떤 수종의 "정답으로 인정되는 표기" 목록.
 * 공식 명칭(name)은 항상 정답. 별칭(aliases)도 정답으로 인정하되,
 * 공식적으로 오답 처리되는 표기는 rejectAliases로 제외한다.
 */
export function acceptedAnswers(sp: Species): string[] {
  const reject = REJECTED_ALIASES[sp.id] ?? [];
  const list = [sp.name, ...sp.aliases].filter((x) => !reject.includes(x));
  return list;
}

/**
 * 공식 시험에서 오답 처리되는 별칭(목록에는 참고로 두되 정답에서 제외).
 * 예) 등(○) / 등나무(×), 복자기(○) / 복자기나무(×)
 */
export const REJECTED_ALIASES: Record<string, string[]> = {
  deung: ['등나무'],
  // 복자기는 aliases가 비어있지만 안전하게 명시
  bokjagi: ['복자기나무'],
};

/**
 * 사용자 입력을 채점한다.
 * - 정확/별칭/띄어쓰기 무시 일치 → correct
 * - 편집거리 1 이내(짧은 단어는 보수적) → almost (거의 맞음)
 * - 그 외 → wrong
 */
export function grade(input: string, sp: Species): GradeResult {
  const u = normalize(input);
  if (!u) return { grade: 'wrong' };

  const accepted = acceptedAnswers(sp).map(normalize);
  if (accepted.includes(u)) {
    return { grade: 'correct', matched: sp.name };
  }

  // 거의 맞음: 편집거리 기준. 길이에 따라 허용 거리 조정.
  for (const ans of accepted) {
    const dist = levenshtein(u, ans);
    const allow = ans.length <= 2 ? 0 : ans.length <= 4 ? 1 : 2;
    if (dist <= allow) {
      return { grade: 'almost', suggestion: sp.name };
    }
  }
  return { grade: 'wrong' };
}

/**
 * 입력이 "다른 수종의 정답"과 일치하는지 찾아, 혼동 통계에 쓸 수종 id를 돌려준다.
 * (오답일 때 어떤 수종으로 착각했는지 추정)
 */
export function matchOtherSpecies(
  input: string,
  all: Species[],
  exceptId: string,
): string | null {
  const u = normalize(input);
  if (!u) return null;
  for (const sp of all) {
    if (sp.id === exceptId) continue;
    if (acceptedAnswers(sp).map(normalize).includes(u)) return sp.id;
  }
  return null;
}
