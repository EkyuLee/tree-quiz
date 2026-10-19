import { useEffect, useRef, useState } from 'react';
import type { GradeResult, Question, Species } from '../types';
import { getSpecies, assetUrl } from '../lib/data';
import { grade as gradeAnswer } from '../lib/matching';
import { SpeciesPhoto } from './SpeciesPhoto';
import { partLabel } from '../lib/labels';
import { usablePhotos } from '../lib/question';

interface Props {
  question: Question;
  /** 전체 문항 수 / 현재 번호 */
  index: number;
  total: number;
  /** 채점 결과를 상위로 전달(통계 반영). choice 모드는 pickedId로 혼동 집계 */
  onGraded: (result: GradeResult, userAnswer: string, pickedId?: string) => void;
  onNext: () => void;
  /** 즉시 피드백 표시 여부 (모의고사는 끝에 몰아보기 가능하므로 false 가능) */
  showFeedback?: boolean;
  /** true로 바뀌면 현재 입력값으로 즉시 채점(시간 초과용) */
  autoSubmit?: boolean;
}

export function QuizCard({
  question,
  index,
  total,
  onGraded,
  onNext,
  showFeedback = true,
  autoSubmit = false,
}: Props) {
  const sp = getSpecies(question.speciesId)!;
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<GradeResult | null>(null);
  const [pickedId, setPickedId] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 새 문제로 바뀌면 상태 초기화 + 입력 포커스
    setTyped('');
    setResult(null);
    setPickedId(undefined);
    if (question.answerMode === 'typing') inputRef.current?.focus();
  }, [question]);

  // 시간 초과 시 현재 입력값으로 강제 채점
  useEffect(() => {
    if (autoSubmit && !result) {
      const r = gradeAnswer(typed, sp);
      setResult(r);
      onGraded(r, typed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmit]);

  function submitTyping() {
    if (result) return;
    const r = gradeAnswer(typed, sp);
    setResult(r);
    onGraded(r, typed);
  }

  function pickChoice(id: string) {
    if (result) return;
    const chosen = getSpecies(id)!;
    const correct = id === sp.id;
    const r: GradeResult = correct
      ? { grade: 'correct', matched: sp.name }
      : { grade: 'wrong' };
    setPickedId(id);
    setResult(r);
    onGraded(r, chosen.name, correct ? undefined : id);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      if (!result) submitTyping();
      else onNext();
    }
  }

  return (
    <section aria-label={`문제 ${index + 1}`}>
      <div className="row spread">
        <small className="note">
          {index + 1} / {total}
        </small>
        <div className="progress" style={{ width: 120 }}>
          <span style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
      </div>

      <h2 className="visually-hidden">이 사진의 수종 이름은?</h2>
      <SpeciesPhoto photo={question.photo} speciesName={sp.name} showCredit={!!result} />
      {!result && <p className="center muted">이 수종의 이름은 무엇일까요?</p>}

      {question.answerMode === 'choice' && question.choices && (
        <div className="choices" role="group" aria-label="보기">
          {question.choices.map((id) => {
            const opt = getSpecies(id)!;
            let cls = 'choice';
            if (result) {
              if (id === sp.id) cls += ' correct';
              else if (id === pickedId) cls += ' wrong';
            }
            return (
              <button
                key={id}
                className={cls}
                onClick={() => pickChoice(id)}
                disabled={!!result}
                aria-pressed={pickedId === id}
              >
                {opt.name}
              </button>
            );
          })}
        </div>
      )}

      {question.answerMode === 'typing' && (
        <div style={{ marginTop: 16 }}>
          <label htmlFor="answer-input" className="visually-hidden">
            수종 이름 입력
          </label>
          <input
            id="answer-input"
            ref={inputRef}
            className="answer"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={handleKey}
            disabled={!!result}
            placeholder="수종 이름을 입력하세요"
            autoComplete="off"
            autoCapitalize="off"
            enterKeyHint="done"
          />
          {!result && (
            <button className="btn" style={{ marginTop: 10 }} onClick={submitTyping}>
              제출
            </button>
          )}
        </div>
      )}

      {result && showFeedback && <Feedback sp={sp} result={result} pickedId={pickedId} />}

      {result && (
        <button className="btn" style={{ marginTop: 16, width: '100%' }} onClick={onNext} autoFocus>
          다음 (Enter)
        </button>
      )}
    </section>
  );
}

function Feedback({
  sp,
  result,
  pickedId,
}: {
  sp: Species;
  result: GradeResult;
  pickedId?: string;
}) {
  const picked = pickedId ? getSpecies(pickedId) : undefined;
  const pickedPhoto = picked ? usablePhotos(picked)[0] : undefined;
  const myPhoto = usablePhotos(sp)[0];
  const title =
    result.grade === 'correct' ? '정답' : result.grade === 'almost' ? '거의 맞음' : '오답';

  return (
    <div className={`feedback ${result.grade}`} role="status" aria-live="polite">
      <h3>
        {title} — 정답: {sp.name} <span className="sci">{sp.scientificName}</span>
      </h3>
      {result.grade === 'almost' && (
        <p>입력이 정답과 거의 같습니다. 정확한 표기는 <b>{sp.name}</b> 입니다.</p>
      )}
      <p>
        <span className="badge">{sp.family}</span>
        <span className="badge">{sp.leafPersistence}</span>
        <span className="badge">{sp.habit.join('·')}</span>
      </p>
      <p>
        <b>구분 포인트:</b> {sp.distinguishing}
      </p>
      {sp.aliases.length > 0 && (
        <p className="note">인정 별칭: {sp.aliases.join(', ')}</p>
      )}
      {picked && picked.id !== sp.id && (
        <div className="compare">
          <figure>
            {pickedPhoto ? (
              <img
                src={assetUrl(pickedPhoto.file)}
                alt={`${picked.name} ${partLabel(pickedPhoto.part)}`}
              />
            ) : (
              <div className="noimg" style={{ aspectRatio: 1 }}>
                사진 없음
              </div>
            )}
            <figcaption>고른 답: {picked.name}</figcaption>
          </figure>
          <figure>
            {myPhoto ? (
              <img src={assetUrl(myPhoto.file)} alt={`${sp.name} ${partLabel(myPhoto.part)}`} />
            ) : (
              <div className="noimg" style={{ aspectRatio: 1 }}>
                사진 없음
              </div>
            )}
            <figcaption>정답: {sp.name}</figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
