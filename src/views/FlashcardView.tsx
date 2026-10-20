import { useEffect, useMemo, useState } from 'react';
import type { Species } from '../types';
import { getSpecies, assetUrl } from '../lib/data';
import {
  loadGroups,
  saveGroups,
  shuffledGroups,
  type Groups,
} from '../lib/groups';
import { pickPhotos } from '../lib/question';
import { shuffle } from '../lib/shuffle';
import { partLabel } from '../lib/labels';
import type { useStudyData } from '../hooks/useStudyData';

type Store = ReturnType<typeof useStudyData>;

export function FlashcardView({ store }: { store: Store }) {
  const [groups, setGroups] = useState<Groups>(() => loadGroups());
  const [activeGroup, setActiveGroup] = useState<number | null>(null);

  function doShuffle() {
    const g = shuffledGroups();
    setGroups(g);
    saveGroups(g);
    setActiveGroup(null);
  }

  if (activeGroup !== null) {
    return (
      <FlashcardSession
        store={store}
        speciesIds={groups[activeGroup]}
        groupLabel={`${activeGroup + 1}그룹`}
        onExit={() => setActiveGroup(null)}
      />
    );
  }

  return (
    <div>
      <h2>감별 연습</h2>
      <p className="muted">
        실제 시험처럼 한 수종의 사진 여러 장을 한 번에 보고 이름을 떠올린 뒤, 화면을 눌러 정답을
        확인합니다. 120종을 20종씩 6그룹으로 나눴습니다.
      </p>
      <div className="row spread" style={{ margin: '12px 0' }}>
        <b>그룹 선택</b>
        <button className="btn secondary" onClick={doShuffle}>
          🔀 섞기
        </button>
      </div>
      <div className="grid modes">
        {groups.map((ids, i) => {
          const first = getSpecies(ids[0]);
          const last = getSpecies(ids[ids.length - 1]);
          return (
            <button key={i} className="mode-card" onClick={() => setActiveGroup(i)}>
              <h3>{i + 1}그룹</h3>
              <p>
                {ids.length}종
                {first && last && (
                  <>
                    <br />
                    {first.name} … {last.name}
                  </>
                )}
              </p>
            </button>
          );
        })}
      </div>
      <small className="note" style={{ display: 'block', marginTop: 12 }}>
        “섞기”를 누르면 120종이 무작위로 다시 20종씩 6그룹으로 재편성됩니다.
      </small>
    </div>
  );
}

function FlashcardSession({
  store,
  speciesIds,
  groupLabel,
  onExit,
}: {
  store: Store;
  speciesIds: string[];
  groupLabel: string;
  onExit: () => void;
}) {
  // 그룹 내 수종을 무작위 순서로 (섞인 상태에서 또 매번 랜덤)
  const order = useMemo(() => shuffle(speciesIds), [speciesIds]);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const sp = getSpecies(order[i]);
  const photos = useMemo(() => (sp ? pickPhotos(sp, 4) : []), [sp]);

  // 정답 공개 시 학습 기록(본 것으로 표시)
  useEffect(() => {
    if (revealed && sp) {
      store.noteShownPhoto(sp.id, photos[0]?.file);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  if (!sp) return null;

  function reveal() {
    if (!revealed) setRevealed(true);
  }
  function next() {
    if (i + 1 >= order.length) {
      onExit();
    } else {
      setI(i + 1);
      setRevealed(false);
    }
  }
  function markAndNext(known: boolean) {
    // 간단한 자가 채점: 간격 반복에 반영(맞음=correct, 모름=wrong)
    store.recordAnswer(sp!.id, known ? 'correct' : 'wrong');
    next();
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!revealed) reveal();
      else next();
    }
  }

  return (
    <div>
      <div className="row spread" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>감별 연습 · {groupLabel}</h2>
        <button className="btn secondary" onClick={onExit}>
          그만두기
        </button>
      </div>

      <div className="row spread">
        <small className="note">
          {i + 1} / {order.length}
        </small>
        <div className="progress" style={{ width: 120 }}>
          <span style={{ width: `${((i + 1) / order.length) * 100}%` }} />
        </div>
      </div>

      {/* 클릭 시 정답 공개 영역 */}
      <div
        role="button"
        tabIndex={0}
        aria-label={revealed ? '정답 공개됨. 다음으로 넘어가려면 누르세요' : '사진을 보고 이름을 떠올린 뒤 눌러 정답 확인'}
        onClick={reveal}
        onKeyDown={onKey}
        style={{ cursor: revealed ? 'default' : 'pointer', outlineOffset: 4 }}
      >
        <PhotoGrid photos={photos} speciesName={revealed ? sp.name : '???'} />
        {!revealed && (
          <p className="center muted" style={{ marginTop: 8 }}>
            이 수종의 이름은? — 화면을 누르면 정답이 보입니다
          </p>
        )}
      </div>

      {revealed && (
        <div className="feedback correct" role="status" aria-live="polite" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>
            {sp.name} <span className="sci">{sp.scientificName}</span>
          </h3>
          <p>
            <span className="badge">{sp.family}</span>
            <span className="badge">{sp.leafPersistence}</span>
            <span className="badge">{sp.habit.join('·')}</span>
          </p>
          <p style={{ marginBottom: 0 }}>
            <b>구분 포인트:</b> {sp.distinguishing}
          </p>
          {sp.aliases.length > 0 && (
            <p className="note" style={{ marginBottom: 0 }}>
              인정 별칭: {sp.aliases.join(', ')}
            </p>
          )}
        </div>
      )}

      <div className="row" style={{ marginTop: 16 }}>
        {!revealed ? (
          <button className="btn" style={{ width: '100%' }} onClick={reveal}>
            정답 보기 (Enter)
          </button>
        ) : (
          <>
            <button className="btn secondary" style={{ flex: 1 }} onClick={() => markAndNext(false)}>
              몰랐어요
            </button>
            <button className="btn" style={{ flex: 1 }} onClick={() => markAndNext(true)}>
              맞혔어요 →
            </button>
          </>
        )}
      </div>
      {revealed && (
        <button className="btn ghost" style={{ width: '100%', marginTop: 8 }} onClick={next}>
          채점 없이 다음
        </button>
      )}
    </div>
  );
}

function PhotoGrid({ photos, speciesName }: { photos: Species['photos']; speciesName: string }) {
  if (photos.length === 0) {
    return (
      <div className="photo-wrap" role="img" aria-label={`${speciesName} 사진 없음`}>
        <span className="muted">사진 준비 중</span>
      </div>
    );
  }
  return (
    <div className="flash-grid" aria-label={`${speciesName} 사진 ${photos.length}장`}>
      {photos.map((p, idx) => (
        <figure key={idx} className="flash-cell">
          <img
            src={assetUrl(p.file)}
            alt={`${speciesName}의 ${partLabel(p.part)} 사진`}
            loading="lazy"
          />
          <figcaption>{partLabel(p.part)}</figcaption>
        </figure>
      ))}
    </div>
  );
}
