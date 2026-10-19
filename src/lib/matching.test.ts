import { describe, it, expect } from 'vitest';
import { grade, normalize, levenshtein, acceptedAnswers, matchOtherSpecies } from '../lib/matching';
import { SPECIES, getSpecies } from '../lib/data';
import type { Species } from '../types';

function sp(id: string): Species {
  const s = getSpecies(id);
  if (!s) throw new Error(`no species ${id}`);
  return s;
}

describe('normalize/levenshtein', () => {
  it('공백 제거', () => {
    expect(normalize(' 메타 세쿼이아 ')).toBe('메타세쿼이아');
  });
  it('편집거리', () => {
    expect(levenshtein('소나무', '소나무')).toBe(0);
    expect(levenshtein('소나무', '솔나무')).toBe(1);
  });
});

describe('grade - 정답 매칭', () => {
  it('공식 명칭 정답', () => {
    expect(grade('소나무', sp('sonamu')).grade).toBe('correct');
  });

  it('별칭 인정 (곰솔=해송)', () => {
    expect(grade('해송', sp('gomsol')).grade).toBe('correct');
    expect(grade('흑송', sp('gomsol')).grade).toBe('correct');
  });

  it('띄어쓰기 무시', () => {
    expect(grade('메타 세쿼이아', sp('metasequoia')).grade).toBe('correct');
    expect(grade('메타세콰이어', sp('metasequoia')).grade).toBe('correct'); // 표기 변형 별칭
  });

  it('거의 맞음 (오타 1글자)', () => {
    const r = grade('은행나모', sp('eunhaengnamu'));
    expect(r.grade).toBe('almost');
    expect(r.suggestion).toBe('은행나무');
  });

  it('완전히 다른 답은 오답', () => {
    expect(grade('소나무', sp('eunhaengnamu')).grade).toBe('wrong');
  });

  it('빈 입력은 오답', () => {
    expect(grade('   ', sp('sonamu')).grade).toBe('wrong');
  });
});

describe('공식 오답 표기 제외', () => {
  it("'등나무'는 '등'의 정답에서 제외", () => {
    const deung = sp('deung');
    expect(acceptedAnswers(deung)).not.toContain('등나무');
    expect(grade('등', deung).grade).toBe('correct');
    // '등나무'는 정답 목록에서 빠지지만 편집거리상 almost로 떨어질 수 있음 → correct는 아님
    expect(grade('등나무', deung).grade).not.toBe('correct');
  });
});

describe('matchOtherSpecies - 혼동 추정', () => {
  it('다른 수종의 정답과 일치하면 그 id 반환', () => {
    const id = matchOtherSpecies('곰솔', SPECIES, 'sonamu');
    expect(id).toBe('gomsol');
  });
  it('어느 수종도 아니면 null', () => {
    expect(matchOtherSpecies('없는나무', SPECIES, 'sonamu')).toBeNull();
  });
});
