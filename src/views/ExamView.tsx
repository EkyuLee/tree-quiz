import { useEffect, useMemo, useRef, useState } from 'react';
import type { ExamResult, GradeResult, Question, StudyData } from '../types';
import { SPECIES, getSpecies, speciesWithPhotos } from '../lib/data';
import { sample } from '../lib/shuffle';
import { buildSession } from '../lib/question';
import { QuizCard } from '../components/QuizCard';
import type { useStudyData } from '../hooks/useStudyData';

type Store = ReturnType<typeof useStudyData>;

export function ExamView({ store }: { store: Store }) {
  const data = store.data as StudyData;
  const [phase, setPhase] = useState<'config' | 'run' | 'result'>('config');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<ExamResult['questions']>([]);
  const count = data.settings.examQuestionCount;
  const perSec = data.settings.perQuestionSeconds;

  const pool = useMemo(() => speciesWithPhotos(), []);

  function start() {
    const ids = sample(pool, count).map((s) => s.id);
    const qs = buildSession(ids, getSpecies, {
      answerMode: 'typing',
      allSpecies: SPECIES,
      recentFiles: (id) => data.cards[id]?.recentPhotos ?? [],
    });
    setQuestions(qs);
    setAnswers([]);
    setI(0);
    setPhase('run');
  }

  function handleGraded(speciesId: string, result: GradeResult, userAnswer: string) {
    setAnswers((prev) => [...prev, { speciesId, userAnswer, grade: result.grade }]);
    store.noteShownPhoto(speciesId, questions[i]?.photo?.file);
    store.recordAnswer(speciesId, result.grade, userAnswer);
  }

  function next() {
    if (i + 1 >= questions.length) finish();
    else setI((x) => x + 1);
  }

  function finish() {
    const correct = answersRef.current.filter((a) => a.grade === 'correct').length;
    const total = questions.length;
    const exam: ExamResult = {
      date: new Date().toISOString(),
      total,
      correct,
      score: Math.round((correct / total) * 100),
      questions: answersRef.current,
    };
    store.addExam(exam);
    setPhase('result');
  }

  // answers의 최신값을 finish에서 쓰기 위한 ref
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  if (phase === 'config') {
    return (
      <div>
        <h2>실전 모의고사</h2>
        <p className="muted">
          실제 시험 형식입니다. 사진을 보고 수종 이름을 <b>직접 입력</b>해 답합니다. 공개문제
          기준으로 기본 20문항이며, 답은 공식 목록 표기로 작성합니다(별칭·띄어쓰기는 인정).
        </p>
        <div className="card">
          <label className="row spread">
            <span>문항 수</span>
            <select
              value={count}
              onChange={(e) =>
                store.updateSettings({ examQuestionCount: Number(e.target.value) })
              }
            >
              {[10, 20, 30, 40].map((n) => (
                <option key={n} value={n}>
                  {n}문항
                </option>
              ))}
            </select>
          </label>
          <label className="row spread" style={{ marginTop: 12 }}>
            <span>문항당 시간</span>
            <select
              value={perSec}
              onChange={(e) =>
                store.updateSettings({ perQuestionSeconds: Number(e.target.value) })
              }
            >
              <option value={0}>무제한</option>
              {[10, 15, 20, 30].map((n) => (
                <option key={n} value={n}>
                  {n}초
                </option>
              ))}
            </select>
          </label>
          <small className="note" style={{ display: 'block', marginTop: 8 }}>
            공식: 20수종 영상, 한 번 반복 후 종료·중복 조회 불가. 답안은 공식 수목명으로 작성해야
            정답 인정(예: 복자기 ○ / 복자기나무 ×).
          </small>
        </div>
        <button className="btn" style={{ width: '100%' }} onClick={start} disabled={pool.length < count}>
          모의고사 시작
        </button>
        {pool.length < count && (
          <small className="note">사진이 있는 수종이 {pool.length}종이라 문항 수를 조정하세요.</small>
        )}
      </div>
    );
  }

  if (phase === 'run') {
    return (
      <ExamQuestion
        key={i}
        question={questions[i]}
        index={i}
        total={questions.length}
        perSec={perSec}
        onGraded={handleGraded}
        onNext={next}
      />
    );
  }

  // result
  const exam = data.exams[0];
  return (
    <div className="card center">
      <h2>모의고사 결과</h2>
      {exam && (
        <>
          <p className="stat">
            <span className="num">{exam.score}점</span>
            <br />
            <span className="lbl">
              {exam.correct} / {exam.total} 정답
            </span>
          </p>
          <p className={exam.score >= 60 ? 'feedback correct' : 'feedback wrong'}>
            {exam.score >= 60 ? '합격 기준(60%) 이상입니다.' : '합격 기준(60%)에 미치지 못했습니다. 약점 집중으로 보완하세요.'}
          </p>
          <details style={{ textAlign: 'left', marginTop: 12 }}>
            <summary>문항별 보기</summary>
            <ul>
              {exam.questions.map((a, idx) => {
                const sp = getSpecies(a.speciesId)!;
                return (
                  <li key={idx}>
                    {sp.name} — 내 답: “{a.userAnswer || '(미입력)'}”{' '}
                    <span className={`badge ${a.grade === 'correct' ? '' : 'tag-review'}`}>
                      {a.grade === 'correct' ? '정답' : a.grade === 'almost' ? '거의' : '오답'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </details>
        </>
      )}
      <button className="btn" onClick={() => setPhase('config')}>
        돌아가기
      </button>
    </div>
  );
}

function ExamQuestion({
  question,
  index,
  total,
  perSec,
  onGraded,
  onNext,
}: {
  question: Question;
  index: number;
  total: number;
  perSec: number;
  onGraded: (speciesId: string, result: GradeResult, userAnswer: string) => void;
  onNext: () => void;
}) {
  const [left, setLeft] = useState(perSec);
  const timeUp = perSec > 0 && left <= 0;

  // 이 컴포넌트는 부모에서 key={index}로 문항마다 새로 마운트되므로
  // left는 마운트 시 perSec로 초기화된다. 1초마다 감소시키는 인터벌만 둔다.
  useEffect(() => {
    if (perSec <= 0) return;
    const t = setInterval(() => {
      setLeft((l) => (l <= 0 ? 0 : l - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [perSec]);

  return (
    <div>
      <div className="row spread" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>모의고사</h2>
        {perSec > 0 && (
          <span className="badge" aria-live="polite">
            남은 시간 {Math.max(left, 0)}s
          </span>
        )}
      </div>
      <QuizCard
        question={question}
        index={index}
        total={total}
        onGraded={(result, userAnswer) => onGraded(question.speciesId, result, userAnswer)}
        onNext={onNext}
        showFeedback
        autoSubmit={timeUp}
      />
    </div>
  );
}
