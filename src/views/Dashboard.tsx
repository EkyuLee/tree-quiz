import { useMemo, useRef } from 'react';
import type { StudyData } from '../types';
import { SPECIES } from '../lib/data';
import { passProbability, retrievability, State } from '../lib/fsrs';
import { exportJson, importJson } from '../lib/storage';
import type { useStudyData } from '../hooks/useStudyData';

type Store = ReturnType<typeof useStudyData>;

export function Dashboard({ store }: { store: Store }) {
  const data = store.data as StudyData;
  const fileRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const now = new Date();
    let studied = 0;
    let mastered = 0;
    for (const s of SPECIES) {
      const c = data.cards[s.id];
      if (c && c.reps > 0) {
        studied++;
        if (retrievability(c, now) >= 0.9 && c.state === State.Review) mastered++;
      }
    }
    const { probability, meanRetrievability } = passProbability(SPECIES, data.cards, { now });
    return {
      studied,
      mastered,
      coverage: Math.round((studied / SPECIES.length) * 100),
      pass: Math.round(probability * 100),
      meanR: Math.round(meanRetrievability * 100),
    };
  }, [data.cards]);

  function doExport() {
    const blob = new Blob([exportJson(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tree-quiz-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function doImport(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = importJson(String(reader.result));
        store.replaceAll(next);
        alert('학습 기록을 가져왔습니다.');
      } catch (e) {
        alert('가져오기 실패: ' + (e as Error).message);
      }
    };
    reader.readAsText(file);
  }

  // 숙달도 상위/하위
  const sorted = useMemo(() => {
    const now = new Date();
    return SPECIES.map((s) => {
      const c = data.cards[s.id];
      const r = c ? retrievability(c, now) : 0;
      return { name: s.name, r, seen: c?.seen ?? 0, wrong: c?.wrong ?? 0 };
    }).sort((a, b) => a.r - b.r);
  }, [data.cards]);

  const weakest = sorted.filter((x) => x.seen > 0).slice(0, 8);

  return (
    <div>
      <h2>대시보드</h2>

      <div className="card grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="stat">
          <div className="num">{stats.pass}%</div>
          <div className="lbl">합격 가능성(추정)</div>
        </div>
        <div className="stat">
          <div className="num">{data.streak.current}일</div>
          <div className="lbl">연속 학습 (최고 {data.streak.best}일)</div>
        </div>
        <div className="stat">
          <div className="num">
            {stats.studied}/{SPECIES.length}
          </div>
          <div className="lbl">학습한 수종 ({stats.coverage}%)</div>
        </div>
        <div className="stat">
          <div className="num">{stats.mastered}</div>
          <div className="lbl">숙달(회상률 90%+)</div>
        </div>
      </div>

      <div className="card">
        <b>전체 학습 범위</b>
        <div className="progress" style={{ marginTop: 8 }}>
          <span style={{ width: `${stats.coverage}%` }} />
        </div>
        <small className="note">
          합격 가능성은 전체 120종의 FSRS 회상률 평균({stats.meanR}%)으로 20문항 중 60% 이상 정답
          확률을 추정한 값입니다.
        </small>
      </div>

      {weakest.length > 0 && (
        <div className="card">
          <b>가장 약한 수종</b>
          {weakest.map((w) => (
            <div key={w.name} style={{ margin: '8px 0' }}>
              <div className="row spread">
                <span>{w.name}</span>
                <small className="muted">
                  회상 {Math.round(w.r * 100)}% · 오답 {w.wrong}
                </small>
              </div>
              <div className="mastery-bar">
                <span
                  style={{
                    width: `${Math.round(w.r * 100)}%`,
                    background:
                      w.r >= 0.8 ? 'var(--correct)' : w.r >= 0.5 ? 'var(--almost)' : 'var(--wrong)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <b>학습 기록 백업</b>
        <p className="note">로그인이 없으므로 JSON으로 내보내 다른 기기에서 가져올 수 있습니다.</p>
        <div className="row">
          <button className="btn secondary" onClick={doExport}>
            내보내기(JSON)
          </button>
          <button className="btn secondary" onClick={() => fileRef.current?.click()}>
            가져오기(JSON)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) doImport(f);
              e.target.value = '';
            }}
          />
        </div>
        <button
          className="btn ghost"
          style={{ marginTop: 10 }}
          onClick={() => {
            if (confirm('학습 기록을 모두 초기화할까요? 되돌릴 수 없습니다.')) store.reset();
          }}
        >
          기록 초기화
        </button>
      </div>
    </div>
  );
}
