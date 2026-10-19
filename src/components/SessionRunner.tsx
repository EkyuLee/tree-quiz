import { useMemo, useState } from 'react';
import type { GradeResult, Question } from '../types';
import { QuizCard } from './QuizCard';

interface Props {
  questions: Question[];
  title: string;
  showFeedback?: boolean;
  onAnswer: (speciesId: string, result: GradeResult, userAnswer: string, pickedId?: string) => void;
  onFinish: (results: { correct: number; total: number }) => void;
  onExit: () => void;
}

export function SessionRunner({
  questions,
  title,
  showFeedback = true,
  onAnswer,
  onFinish,
  onExit,
}: Props) {
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const total = questions.length;
  const current = questions[i];

  const summary = useMemo(() => ({ correct, total }), [correct, total]);

  if (total === 0) {
    return (
      <div className="card center">
        <p>지금 풀 문제가 없습니다.</p>
        <button className="btn" onClick={onExit}>
          돌아가기
        </button>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((correct / total) * 100);
    return (
      <div className="card center">
        <h2>{title} 완료</h2>
        <p className="stat">
          <span className="num">
            {correct} / {total}
          </span>
          <br />
          <span className="lbl">정답 ({pct}%)</span>
        </p>
        <button className="btn" onClick={() => onFinish(summary)}>
          결과 저장하고 돌아가기
        </button>
      </div>
    );
  }

  function handleGraded(result: GradeResult, userAnswer: string, pickedId?: string) {
    onAnswer(current.speciesId, result, userAnswer, pickedId);
    if (result.grade === 'correct') setCorrect((c) => c + 1);
  }

  function next() {
    if (i + 1 >= total) {
      setDone(true);
    } else {
      setI((x) => x + 1);
    }
  }

  return (
    <div>
      <div className="row spread" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{title}</h2>
        <button className="btn secondary" onClick={onExit}>
          그만두기
        </button>
      </div>
      <QuizCard
        key={i}
        question={current}
        index={i}
        total={total}
        onGraded={handleGraded}
        onNext={next}
        showFeedback={showFeedback}
      />
    </div>
  );
}
