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
  const [zoom, setZoom] = useState<number | null>(null); // 라이트박스로 연 사진 index

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

  function next() {
    setZoom(null);
    if (i + 1 >= order.length) {
      onExit();
    } else {
      setI(i + 1);
      setRevealed(false);
    }
  }
  function markAndNext(known: boolean) {
    store.recordAnswer(sp!.id, known ? 'correct' : 'wrong');
    next();
  }

  return (
    <div>
      <div className="row spread" style={{ marginBottom: 6 }}>
        <div className="row" style={{ gap: 8 }}>
          <strong style={{ fontSize: '0.95rem' }}>감별 · {groupLabel}</strong>
          <small className="note">
            {i + 1}/{order.length}
          </small>
        </div>
        <button
          className="btn secondary"
          style={{ padding: '6px 12px', minHeight: 'auto' }}
          onClick={onExit}
        >
          그만두기
        </button>
      </div>

      <div className="progress" style={{ marginBottom: 8 }}>
        <span style={{ width: `${((i + 1) / order.length) * 100}%` }} />
      </div>

      {/* 사진 그리드 — 개별 사진 탭 시 라이트박스로 확대 */}
      <PhotoGrid
        photos={photos}
        speciesName={revealed ? sp.name : '???'}
        onZoom={(idx) => setZoom(idx)}
      />
      {!revealed && (
        <p className="center muted" style={{ margin: '8px 0 0', fontSize: '0.85rem' }}>
          사진을 누르면 크게 볼 수 있어요. 이름을 떠올린 뒤 “정답 보기”.
        </p>
      )}

      {revealed && (
        <div className="feedback correct" role="status" aria-live="polite" style={{ marginTop: 10 }}>
          <h3 style={{ margin: '0 0 4px' }}>
            {sp.name} <span className="sci">{sp.scientificName}</span>
          </h3>
          <p style={{ margin: '0 0 4px' }}>
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

      <div className="row" style={{ marginTop: 12 }}>
        {!revealed ? (
          <button className="btn" style={{ width: '100%' }} onClick={() => setRevealed(true)}>
            정답 보기
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

      {zoom !== null && photos[zoom] && (
        <Lightbox
          photo={photos[zoom]}
          speciesName={revealed ? sp.name : '???'}
          onClose={() => setZoom(null)}
          onPrev={zoom > 0 ? () => setZoom(zoom - 1) : undefined}
          onNext={zoom < photos.length - 1 ? () => setZoom(zoom + 1) : undefined}
        />
      )}
    </div>
  );
}

function PhotoGrid({
  photos,
  speciesName,
  onZoom,
}: {
  photos: Species['photos'];
  speciesName: string;
  onZoom: (idx: number) => void;
}) {
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
        <button
          key={idx}
          className="flash-cell"
          onClick={() => onZoom(idx)}
          aria-label={`${partLabel(p.part)} 사진 크게 보기`}
        >
          <img
            src={assetUrl(p.file)}
            alt={`${speciesName}의 ${partLabel(p.part)} 사진`}
            loading="lazy"
          />
          <span className="flash-caption">{partLabel(p.part)}</span>
        </button>
      ))}
    </div>
  );
}

function Lightbox({
  photo,
  speciesName,
  onClose,
  onPrev,
  onNext,
}: {
  photo: NonNullable<Species['photos'][number]>;
  speciesName: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && onPrev) onPrev();
      else if (e.key === 'ArrowRight' && onNext) onNext();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${speciesName} ${partLabel(photo.part)} 사진 확대`}
      onClick={onClose}
    >
      <button className="lightbox-close" onClick={onClose} aria-label="닫기">
        ✕
      </button>
      <figure className="lightbox-fig" onClick={(e) => e.stopPropagation()}>
        <img src={assetUrl(photo.file)} alt={`${speciesName}의 ${partLabel(photo.part)} 사진`} />
        <figcaption>
          <span className="badge">{partLabel(photo.part)}</span> {photo.author} · {photo.license}
        </figcaption>
      </figure>
      {onPrev && (
        <button
          className="lightbox-nav prev"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          aria-label="이전 사진"
        >
          ‹
        </button>
      )}
      {onNext && (
        <button
          className="lightbox-nav next"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="다음 사진"
        >
          ›
        </button>
      )}
      <p className="lightbox-hint">빈 곳을 누르거나 Esc로 닫기</p>
    </div>
  );
}
