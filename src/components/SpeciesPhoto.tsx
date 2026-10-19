import type { Photo } from '../types';
import { assetUrl } from '../lib/data';
import { partLabel, LICENSE_SHORT } from '../lib/labels';

export function SpeciesPhoto({
  photo,
  speciesName,
  showCredit = true,
}: {
  photo?: Photo;
  speciesName: string;
  showCredit?: boolean;
}) {
  if (!photo || !photo.file) {
    return (
      <div className="photo-wrap" role="img" aria-label={`${speciesName} 사진 없음`}>
        <span className="muted">사진 준비 중</span>
      </div>
    );
  }
  const alt = `${speciesName}의 ${partLabel(photo.part)} 사진`;
  return (
    <figure style={{ margin: 0 }}>
      <div className="photo-wrap">
        <img src={assetUrl(photo.file)} alt={alt} loading="lazy" />
      </div>
      {showCredit && (
        <figcaption className="photo-credit">
          <span className="badge">{partLabel(photo.part)}</span>
          {photo.author} ·{' '}
          <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
            {LICENSE_SHORT[photo.license] ?? photo.license}
          </a>{' '}
          ·{' '}
          <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
            {photo.provider === 'iNaturalist' ? 'iNaturalist' : 'Commons'}
          </a>
        </figcaption>
      )}
    </figure>
  );
}
