import { useMemo, useState } from 'react';
import type { StudyData } from '../types';
import { SPECIES, getSpecies, speciesWithPhotos } from '../lib/data';
import { buildTodaySession } from '../lib/fsrs';
import { buildSession } from '../lib/question';
import { SessionRunner } from '../components/SessionRunner';
import type { useStudyData } from '../hooks/useStudyData';

type Store = ReturnType<typeof useStudyData>;

const NEW_PER_DAY = 10;

export function TodayView({ store }: { store: Store }) {
  const data = store.data as StudyData;
  const [running, setRunning] = useState(false);

  const withPhotos = useMemo(() => new Set(speciesWithPhotos().map((s) => s.id)), []);

  const session = useMemo(() => {
    const { review, fresh } = buildTodaySession(SPECIES, data.cards, NEW_PER_DAY);
    // 사진 있는 수종만 퀴즈 대상
    const ids = [...review, ...fresh].filter((id) => withPhotos.has(id));
    return { review, fresh, ids };
  }, [data.cards, withPhotos]);

  const questions = useMemo(() => {
    if (!running) return [];
    return buildSession(session.ids, getSpecies, {
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
        title="오늘의 학습"
        questions={questions}
        onAnswer={(speciesId, result, userAnswer, pickedId) => {
          const q = questions.find((x) => x.speciesId === speciesId);
          store.noteShownPhoto(speciesId, q?.photo?.file);
          store.recordAnswer(speciesId, result.grade, userAnswer);
          void pickedId;
        }}
        onFinish={() => setRunning(false)}
        onExit={() => setRunning(false)}
      />
    );
  }

  const reviewCount = session.review.filter((id) => withPhotos.has(id)).length;
  const freshCount = session.fresh.filter((id) => withPhotos.has(id)).length;

  return (
    <div>
      <h2>오늘의 학습</h2>
      <p className="muted">
        간격 반복(FSRS)으로 복습할 카드와 새 카드를 배정합니다. 인출 연습을 위해 먼저 사진을 보고
        수종을 맞혀 보세요.
      </p>
      <div className="card">
        <div className="row spread">
          <div className="stat">
            <div className="num">{reviewCount}</div>
            <div className="lbl">복습 카드</div>
          </div>
          <div className="stat">
            <div className="num">{freshCount}</div>
            <div className="lbl">새 카드</div>
          </div>
          <div className="stat">
            <div className="num">{reviewCount + freshCount}</div>
            <div className="lbl">오늘 총</div>
          </div>
        </div>
      </div>
      <button
        className="btn"
        style={{ width: '100%' }}
        disabled={reviewCount + freshCount === 0}
        onClick={() => setRunning(true)}
      >
        {reviewCount + freshCount === 0 ? '오늘 학습 완료 🎉' : '학습 시작'}
      </button>
    </div>
  );
}
