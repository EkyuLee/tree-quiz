// 수종 데이터 로더 — build 시 species.json을 번들에 포함
import dataset from '../../data/species.json';
import type { Species } from '../types';

interface Dataset {
  meta: Record<string, unknown>;
  species: Species[];
}

const typed = dataset as unknown as Dataset;

export const SPECIES: Species[] = typed.species;
export const SPECIES_META = typed.meta;

const byId = new Map<string, Species>(SPECIES.map((s) => [s.id, s]));

export function getSpecies(id: string): Species | undefined {
  return byId.get(id);
}

export const FAMILIES: string[] = Array.from(
  new Set(SPECIES.map((s) => s.family)),
).sort((a, b) => a.localeCompare(b, 'ko'));

/** 사진이 있는 수종만 (퀴즈 출제 대상) */
export function speciesWithPhotos(): Species[] {
  return SPECIES.filter((s) => s.photos.some((p) => !p.excluded));
}

/** 자산 경로를 base( import.meta.env.BASE_URL )에 맞춰 보정 */
export function assetUrl(path?: string): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  const base = import.meta.env.BASE_URL || '/';
  return (base.endsWith('/') ? base.slice(0, -1) : base) + (path.startsWith('/') ? path : '/' + path);
}
