import { useMemo } from 'react';
import { SPECIES, SPECIES_META } from '../lib/data';

export function SourcesView() {
  const photoCount = useMemo(
    () => SPECIES.reduce((n, s) => n + s.photos.filter((p) => !p.excluded).length, 0),
    [],
  );
  const providers = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of SPECIES) {
      for (const p of s.photos) {
        if (p.excluded) continue;
        m[p.provider] = (m[p.provider] ?? 0) + 1;
      }
    }
    return m;
  }, []);

  const meta = SPECIES_META as Record<string, string>;

  return (
    <div>
      <h2>출처 및 라이선스</h2>
      <div className="card">
        <b>수종 목록</b>
        <p>{meta.source}</p>
        <p className="note">
          파일: {meta.sourceFile}
          <br />
          기준일: {meta.listDate} · 120종
        </p>
      </div>

      <div className="card">
        <b>사진 ({photoCount}장)</b>
        <p className="note">
          공개 API만 사용했습니다: iNaturalist(research-grade 관찰, 한국 관찰 우선), Wikimedia
          Commons. 학명은 GBIF로 대조했습니다. nature.go.kr의 사진·데이터는 사용하지 않았습니다.
        </p>
        <ul>
          {Object.entries(providers).map(([p, n]) => (
            <li key={p}>
              {p}: {n}장
            </li>
          ))}
        </ul>
        <p className="note">
          허용 라이선스만 사용: CC0, CC BY, CC BY-SA, CC BY-NC, CC BY-NC-SA. (ND 계열·저작권 전부
          보유 사진 제외) 사진마다 작성자·라이선스·원본 링크를 화면에 표시합니다.
        </p>
      </div>

      <div className="card">
        <b>비상업 운영</b>
        <p className="note">
          NC(비상업) 라이선스 사진이 포함되므로 이 서비스는 <b>비상업 목적</b>으로만 운영합니다.
          설명 텍스트는 시험 대비용으로 직접 작성했으며, 일부 항목은 사람 검수가 필요합니다(도감의
          “검수 필요” 표시 참고).
        </p>
      </div>

      <details className="card">
        <summary>수종별 사진 출처 전체 보기</summary>
        {SPECIES.map((s) => {
          const ps = s.photos.filter((p) => !p.excluded);
          if (ps.length === 0) return null;
          return (
            <div key={s.id} style={{ marginTop: 10 }}>
              <b>{s.name}</b>
              <ul style={{ marginTop: 2 }}>
                {ps.map((p, i) => (
                  <li key={i} style={{ fontSize: '0.8rem' }}>
                    {p.author} · {p.license} ·{' '}
                    <a href={p.sourceUrl} target="_blank" rel="noreferrer">
                      원본
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </details>
    </div>
  );
}
