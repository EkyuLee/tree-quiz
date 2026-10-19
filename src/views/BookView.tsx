import { useMemo, useState } from 'react';
import type { PartTag, Species } from '../types';
import { SPECIES, FAMILIES, assetUrl } from '../lib/data';
import { SpeciesPhoto } from '../components/SpeciesPhoto';
import { partLabel } from '../lib/labels';
import { usablePhotos } from '../lib/question';

const MONTHS = (m: number[]) => (m.length ? m.join('·') + '월' : '-');

export function BookView() {
  const [q, setQ] = useState('');
  const [family, setFamily] = useState('');
  const [persist, setPersist] = useState('');
  const [part, setPart] = useState<PartTag | ''>('');
  const [selected, setSelected] = useState<Species | null>(null);

  const filtered = useMemo(() => {
    const nq = q.replace(/\s+/g, '').toLowerCase();
    return SPECIES.filter((s) => {
      if (family && s.family !== family) return false;
      if (persist && s.leafPersistence !== persist) return false;
      if (part && !s.photos.some((p) => p.part === part && !p.excluded)) return false;
      if (nq) {
        const hay = [s.name, ...s.aliases, s.scientificName, s.englishName]
          .join('')
          .replace(/\s+/g, '')
          .toLowerCase();
        if (!hay.includes(nq)) return false;
      }
      return true;
    });
  }, [q, family, persist, part]);

  if (selected) {
    return <SpeciesDetail sp={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div>
      <h2>도감</h2>
      <p className="muted">과·상록/낙엽·부위·이름으로 거를 수 있습니다. 공식 120종 전체를 수록했습니다.</p>
      <div className="filters">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름/학명 검색"
          aria-label="수종 검색"
        />
        <select value={family} onChange={(e) => setFamily(e.target.value)} aria-label="과 필터">
          <option value="">과 전체</option>
          {FAMILIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select value={persist} onChange={(e) => setPersist(e.target.value)} aria-label="상록/낙엽 필터">
          <option value="">상록/낙엽</option>
          <option value="상록">상록</option>
          <option value="낙엽">낙엽</option>
          <option value="반상록">반상록</option>
        </select>
        <select
          value={part}
          onChange={(e) => setPart(e.target.value as PartTag | '')}
          aria-label="부위 필터"
        >
          <option value="">부위 전체</option>
          <option value="leaf">잎</option>
          <option value="bark">수피</option>
          <option value="flower">꽃</option>
          <option value="fruit">열매</option>
          <option value="whole">전체</option>
          <option value="winter">겨울눈</option>
        </select>
      </div>
      <p className="note">{filtered.length}종</p>
      <div className="book-grid">
        {filtered.map((s) => {
          const photo = usablePhotos(s)[0];
          return (
            <button key={s.id} className="book-item" onClick={() => setSelected(s)}>
              {photo ? (
                <img
                  className="thumb"
                  src={assetUrl(photo.thumb || photo.file)}
                  alt={`${s.name} 사진`}
                  loading="lazy"
                />
              ) : (
                <div className="noimg">사진 준비 중</div>
              )}
              <div className="label">
                <b>{s.name}</b>
                <small>{s.scientificName}</small>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SpeciesDetail({ sp, onBack }: { sp: Species; onBack: () => void }) {
  const photos = usablePhotos(sp);
  const [active, setActive] = useState(0);
  return (
    <div>
      <button className="btn secondary" onClick={onBack} style={{ marginBottom: 12 }}>
        ← 목록
      </button>
      <h2 style={{ marginBottom: 0 }}>
        {sp.name} {sp.review === 'needs-review' && <span className="badge tag-review">검수 필요</span>}
      </h2>
      <p className="sci muted" style={{ fontStyle: 'italic', marginTop: 2 }}>
        {sp.scientificName} · {sp.englishName}
      </p>

      <SpeciesPhoto photo={photos[active]} speciesName={sp.name} />
      {photos.length > 1 && (
        <div className="row" style={{ marginTop: 8 }}>
          {photos.map((p, i) => (
            <button
              key={i}
              className={`badge ${i === active ? '' : ''}`}
              onClick={() => setActive(i)}
              style={{
                border: i === active ? '2px solid var(--green)' : '1px solid var(--border)',
                background: 'var(--bg)',
              }}
              aria-pressed={i === active}
            >
              {partLabel(p.part)} {i + 1}
            </button>
          ))}
        </div>
      )}

      <div className="card">
        <dl className="detail">
          <dt>과 / 속</dt>
          <dd>
            {sp.family} / {sp.genus}
          </dd>
          <dt>구분</dt>
          <dd>
            {sp.leafPersistence} · {sp.habit.join('·')}
          </dd>
          <dt>잎</dt>
          <dd>{sp.morphology.leaf}</dd>
          <dt>수피</dt>
          <dd>{sp.morphology.bark}</dd>
          <dt>꽃</dt>
          <dd>{sp.morphology.flower}</dd>
          <dt>열매</dt>
          <dd>{sp.morphology.fruit}</dd>
          {sp.morphology.winterBud && (
            <>
              <dt>겨울눈</dt>
              <dd>{sp.morphology.winterBud}</dd>
            </>
          )}
          <dt>수형</dt>
          <dd>{sp.morphology.form}</dd>
          <dt>개화기</dt>
          <dd>{MONTHS(sp.floweringMonths)}</dd>
          <dt>결실기</dt>
          <dd>{MONTHS(sp.fruitingMonths)}</dd>
          <dt>조경 용도</dt>
          <dd>{sp.landscapeUse}</dd>
          {sp.aliases.length > 0 && (
            <>
              <dt>별칭</dt>
              <dd>{sp.aliases.join(', ')}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="card">
        <b>시험 구분 포인트</b>
        <p style={{ marginBottom: 0 }}>{sp.distinguishing}</p>
        {sp.reviewNote && <small className="note">검수 메모: {sp.reviewNote}</small>}
      </div>
    </div>
  );
}
