import { useMemo, useState } from 'react';
import type { StudyData } from '../types';
import { SPECIES, getSpecies, speciesWithPhotos } from '../lib/data';
import { buildSession } from '../lib/question';
import { SessionRunner } from '../components/SessionRunner';
import type { useStudyData } from '../hooks/useStudyData';

type Store = ReturnType<typeof useStudyData>;

export function WeaknessView({ store }: { store: Store }) {
  const data = store.data as StudyData;
  const [running, setRunning] = useState(false);
  const withPhotos = useMemo(() => new Set(speciesWithPhotos().map((s) => s.id)), []);

  // 약점 수종: 오답 많은 순 → 혼동쌍에 등장하는 수종 추가
  const weakIds = useMemo(() => {
    const scored = SPECIES.map((s) => {
      const c = data.cards[s.id];
      const wrongRate = c && c.seen > 0 ? c.wrong / c.seen : 0;
      return { id: s.id, wrong: c?.wrong ?? 0, wrongRate, seen: c?.seen ?? 0 };
    })
      .filter((x) => x.wrong > 0 && withPhotos.has(x.id))
      .sort((a, b) => b.wrong - a.wrong || b.wrongRate - a.wrongRate);

    const ids = new Set(scored.map((x) => x.id));
    // 혼동쌍 양쪽 포함
    for (const conf of data.confusions.slice().sort((a, b) => b.count - a.count)) {
      if (withPhotos.has(conf.speciesId)) ids.add(conf.speciesId);
      if (withPhotos.has(conf.confusedWith)) ids.add(conf.confusedWith);
    }
    return Array.from(ids);
  }, [data.cards, data.confusions, withPhotos]);

  const topConfusions = useMemo(
    () => data.confusions.slice().sort((a, b) => b.count - a.count).slice(0, 6),
    [data.confusions],
  );

  const questions = useMemo(() => {
    if (!running) return [];
    // 약점 수종 + 혼동쌍을 같은 세션에 섞어 교차 학습
    return buildSession(weakIds, getSpecies, {
      answerMode: 'choice',
      choiceCount: 4,
      allSpecies: SPECIES,
      recentFiles: (id) => data.cards[id]?.recentPhotos ?? [],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  if (running) {
    return (
      <SessionRunner
        title="약점 집중"
        questions={questions}
        onAnswer={(speciesId, result, userAnswer) => {
          const q = questions.find((x) => x.speciesId === speciesId);
          store.noteShownPhoto(speciesId, q?.photo?.file);
          store.recordAnswer(speciesId, result.grade, userAnswer);
        }}
        onFinish={() => setRunning(false)}
        onExit={() => setRunning(false)}
      />
    );
  }

  return (
    <div>
      <h2>약점 집중</h2>
      <p className="muted">
        많이 틀린 수종과 자주 헷갈린 쌍을 모아 한 세션에 섞어 출제합니다(교차 학습). 어려운 오답
        보기는 같은 속·혼동 그룹에서 먼저 나옵니다.
      </p>
      <div className="card">
        <b>약점 수종 {weakIds.length}종</b>
        {weakIds.length === 0 && (
          <p className="muted">아직 틀린 기록이 없습니다. 오늘의 학습·모의고사를 먼저 풀어 보세요.</p>
        )}
        {topConfusions.length > 0 && (
          <>
            <p style={{ marginBottom: 4 }}>자주 헷갈린 쌍:</p>
            <ul style={{ marginTop: 0 }}>
              {topConfusions.map((c, i) => {
                const a = getSpecies(c.speciesId)?.name ?? c.speciesId;
                const b = getSpecies(c.confusedWith)?.name ?? c.confusedWith;
                return (
                  <li key={i}>
                    {a} ↔ {b} <span className="muted">({c.count}회)</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
      <button
        className="btn"
        style={{ width: '100%' }}
        disabled={weakIds.length === 0}
        onClick={() => setRunning(true)}
      >
        약점 집중 시작
      </button>
    </div>
  );
}
