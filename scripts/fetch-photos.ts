/**
 * 데이터 파이프라인 — npm run data:fetch
 *
 * 허용 출처의 공식 API만 사용한다(nature.go.kr 미사용):
 *  - GBIF: 학명 검증(usageKey)
 *  - iNaturalist: research-grade 관찰 사진 (한국 관찰 우선), 라이선스·작성자·부위 태그
 *  - Wikimedia Commons: 부족분 보충
 *
 * 특징:
 *  - rate limit (기본 1.2s/req), User-Agent에 서비스명/연락처
 *  - idempotent & resumable: scripts/.cache/<id>.json 에 API 결과 캐시,
 *    public/photos/<id>/ 에 이미 받은 WebP 있으면 건너뜀
 *  - 라이선스 필터: CC0/CC-BY/CC-BY-SA/CC-BY-NC/CC-BY-NC-SA 만 허용(ND·ARR 제외)
 *  - sharp로 긴 변 800px WebP + 썸네일(320px)
 *  - 결과를 data/species.json 의 photos[] 에 병합하고 public/photos/manifest.json 작성
 *
 * 옵션(env):
 *  - ONLY=sonamu,gomsol   특정 수종만
 *  - LIMIT=8              수종당 목표 사진 수(기본 8)
 *  - MIN_KO=0            한국 관찰 최소 비율 등은 코드 내 상수
 *  - DRY=1               다운로드/쓰기 없이 수집 계획만 출력
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';
import type { SpeciesDataset, Species, Photo, PhotoLicense, PartTag } from '../data/schema';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const CACHE_DIR = resolve(root, 'scripts/.cache');
const PHOTO_DIR = resolve(root, 'public/photos');

const CONTACT = process.env.CONTACT_EMAIL ?? 'contact@example.org';
const UA = `JogyeongTreeQuiz/1.0 (noncommercial study PWA; ${CONTACT})`;
const RATE_MS = Number(process.env.RATE_MS ?? 1200);
const TARGET = Number(process.env.LIMIT ?? 8);
const DRY = process.env.DRY === '1';
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;

const LICENSE_MAP: Record<string, PhotoLicense | null> = {
  cc0: 'CC0',
  'cc-by': 'CC-BY',
  'cc-by-sa': 'CC-BY-SA',
  'cc-by-nc': 'CC-BY-NC',
  'cc-by-nc-sa': 'CC-BY-NC-SA',
  // 제외 대상(ND 계열·ARR 등)은 명시적으로 null
  'cc-by-nd': null,
  'cc-by-nc-nd': null,
};
const LICENSE_URL: Record<PhotoLicense, string> = {
  CC0: 'https://creativecommons.org/publicdomain/zero/1.0/',
  'CC-BY': 'https://creativecommons.org/licenses/by/4.0/',
  'CC-BY-SA': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'CC-BY-NC': 'https://creativecommons.org/licenses/by-nc/4.0/',
  'CC-BY-NC-SA': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(url: string): Promise<T> {
  await sleep(RATE_MS);
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}

async function getBuffer(url: string): Promise<Buffer> {
  await sleep(RATE_MS);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

function cachePath(id: string) {
  return resolve(CACHE_DIR, `${id}.json`);
}
function readCache(id: string): CachedCandidate[] | null {
  const p = cachePath(id);
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf-8')) as CachedCandidate[]) : null;
}
function writeCache(id: string, cands: CachedCandidate[]) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath(id), JSON.stringify(cands, null, 2));
}

interface CachedCandidate {
  provider: 'iNaturalist' | 'Wikimedia Commons';
  imageUrl: string;
  sourceUrl: string;
  author: string;
  license: PhotoLicense;
  part: PartTag;
}

// ---- GBIF: 학명 검증 ----
interface GbifMatch {
  usageKey?: number;
  scientificName?: string;
  matchType?: string;
}
async function verifyGbif(name: string): Promise<{ key?: number; verified: boolean }> {
  try {
    const r = await getJson<GbifMatch>(
      `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(name)}`,
    );
    return { key: r.usageKey, verified: r.matchType === 'EXACT' || r.matchType === 'FUZZY' };
  } catch {
    return { verified: false };
  }
}

// ---- iNaturalist ----
interface InatTaxaResp {
  results: { id: number; name: string }[];
}
interface InatObsResp {
  results: {
    id: number;
    uri: string;
    photos: {
      url: string;
      license_code: string | null;
      attribution: string;
    }[];
    annotations?: { controlled_attribute_id: number; controlled_value_id: number }[];
  }[];
}

// iNaturalist "Plant Phenology / Plant part" annotation 매핑(대표값)
function partFromInat(): PartTag {
  return 'whole'; // annotation이 불명확하면 whole로 두고, 실제 태깅은 Commons 분류/파일명으로 보강
}

async function inatTaxonId(name: string): Promise<number | undefined> {
  const r = await getJson<InatTaxaResp>(
    `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(name)}&per_page=1`,
  );
  return r.results[0]?.id;
}

async function inatCandidates(sp: Species): Promise<CachedCandidate[]> {
  // 전체 학명 → 없으면 이명법(속+종)으로 폴백 (f./var. 등 품종명 미등록 대응)
  let taxonId = await inatTaxonId(sp.scientificName);
  if (!taxonId) {
    const binomial = sp.scientificName.split(/\s+/).slice(0, 2).join(' ');
    if (binomial !== sp.scientificName) taxonId = await inatTaxonId(binomial);
  }
  if (!taxonId) return [];

  const cands: CachedCandidate[] = [];
  // 한국(place_id=6891: South Korea) 관찰 우선 → 부족하면 전체
  for (const place of ['&place_id=6891', '']) {
    const obs = await getJson<InatObsResp>(
      `https://api.inaturalist.org/v1/observations?taxon_id=${taxonId}&quality_grade=research&photos=true&per_page=30${place}`,
    );
    for (const o of obs.results) {
      for (const ph of o.photos) {
        const lic = ph.license_code ? LICENSE_MAP[ph.license_code.toLowerCase()] : null;
        if (!lic) continue; // ND·ARR·null 제외
        const big = ph.url.replace('square', 'large');
        cands.push({
          provider: 'iNaturalist',
          imageUrl: big,
          sourceUrl: o.uri,
          author: cleanInatAuthor(ph.attribution),
          license: lic,
          part: partFromInat(),
        });
      }
      if (cands.length >= TARGET * 2) break;
    }
    if (cands.length >= TARGET) break;
  }
  return dedupe(cands);
}

// ---- Wikimedia Commons (보충) ----
interface CommonsSearchResp {
  query?: { search?: { title: string }[] };
}
interface CommonsInfoResp {
  query?: {
    pages?: Record<
      string,
      {
        imageinfo?: {
          url: string;
          descriptionshorturl: string;
          extmetadata?: {
            License?: { value: string };
            Artist?: { value: string };
            LicenseShortName?: { value: string };
          };
        }[];
      }
    >;
  };
}
async function commonsCandidates(sp: Species, need: number): Promise<CachedCandidate[]> {
  const search = await getJson<CommonsSearchResp>(
    `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      sp.scientificName,
    )}&srnamespace=6&srlimit=${need * 3}&format=json&origin=*`,
  );
  const titles = (search.query?.search ?? []).map((s) => s.title);
  const cands: CachedCandidate[] = [];
  for (const title of titles) {
    const info = await getJson<CommonsInfoResp>(
      `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
        title,
      )}&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`,
    );
    const pages = info.query?.pages ?? {};
    for (const pid of Object.keys(pages)) {
      const ii = pages[pid].imageinfo?.[0];
      if (!ii) continue;
      // 비이미지/부적합 포맷(PDF·SVG·도감스캔 등) 제외
      if (!/\.(jpe?g|png|webp)$/i.test(ii.url)) continue;
      const licRaw = (ii.extmetadata?.LicenseShortName?.value ||
        ii.extmetadata?.License?.value ||
        '')
        .toLowerCase()
        .replace(/\s+/g, '-');
      const lic = normalizeCommonsLicense(licRaw);
      if (!lic) continue;
      const author = stripHtml(ii.extmetadata?.Artist?.value ?? 'Wikimedia Commons');
      cands.push({
        provider: 'Wikimedia Commons',
        imageUrl: ii.url,
        sourceUrl: ii.descriptionshorturl,
        author,
        license: lic,
        part: partFromTitle(title),
      });
    }
    if (cands.length >= need) break;
  }
  return dedupe(cands);
}

function normalizeCommonsLicense(s: string): PhotoLicense | null {
  if (s.includes('cc0') || s.includes('publicdomain') || s.includes('public-domain')) return 'CC0';
  if (s.includes('nd')) return null;
  if (s.includes('by-nc-sa')) return 'CC-BY-NC-SA';
  if (s.includes('by-nc')) return 'CC-BY-NC';
  if (s.includes('by-sa')) return 'CC-BY-SA';
  if (s.includes('cc-by') || s.includes('by-')) return 'CC-BY';
  return null;
}
function partFromTitle(title: string): PartTag {
  const t = title.toLowerCase();
  if (/(leaf|leaves|잎|foliage)/.test(t)) return 'leaf';
  if (/(bark|수피|trunk)/.test(t)) return 'bark';
  if (/(flower|bloom|꽃|inflorescence)/.test(t)) return 'flower';
  if (/(fruit|seed|열매|cone|berry)/.test(t)) return 'fruit';
  if (/(winter|bud|겨울|겨울눈)/.test(t)) return 'winter';
  return 'whole';
}
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').trim();
}
/** iNat attribution("(c) 이름, some rights reserved (CC BY-NC)")에서 작성자만 추출 */
function cleanInatAuthor(attr: string): string {
  if (!attr) return 'iNaturalist user';
  let s = attr.replace(/\(c\)\s*/i, '').replace(/©\s*/g, '');
  s = s.replace(/,?\s*(some|all) rights reserved.*$/i, '');
  s = s.replace(/,?\s*\(CC[^)]*\)\s*$/i, '');
  s = s.replace(/,?\s*no rights reserved.*$/i, '');
  s = s.replace(/,?\s*uploaded by.*$/i, '');
  return s.trim() || 'iNaturalist user';
}
function dedupe(c: CachedCandidate[]): CachedCandidate[] {
  const seen = new Set<string>();
  return c.filter((x) => (seen.has(x.imageUrl) ? false : (seen.add(x.imageUrl), true)));
}

// ---- 이미지 다운로드 + WebP 변환 ----
async function processImage(buf: Buffer, outBase: string): Promise<{ file: string; thumb: string }> {
  const img = sharp(buf, { failOn: 'none' }).rotate();
  await img
    .clone()
    .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(resolve(root, 'public', `${outBase}.webp`));
  await img
    .clone()
    .resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 72 })
    .toFile(resolve(root, 'public', `${outBase}.thumb.webp`));
  return { file: `${outBase}.webp`, thumb: `${outBase}.thumb.webp` };
}

async function collectForSpecies(sp: Species): Promise<CachedCandidate[]> {
  let cands = readCache(sp.id);
  if (cands) return cands;
  cands = [];
  try {
    cands = await inatCandidates(sp);
  } catch (e) {
    console.warn(`  iNat 실패 ${sp.name}: ${(e as Error).message}`);
  }
  if (cands.length < TARGET) {
    try {
      const more = await commonsCandidates(sp, TARGET - cands.length + 2);
      cands = dedupe([...cands, ...more]);
    } catch (e) {
      console.warn(`  Commons 실패 ${sp.name}: ${(e as Error).message}`);
    }
  }
  writeCache(sp.id, cands);
  return cands;
}

async function main() {
  const dataPath = resolve(root, 'data/species.json');
  const data = JSON.parse(readFileSync(dataPath, 'utf-8')) as SpeciesDataset;
  const manifest: Record<string, Photo[]> = {};

  for (const sp of data.species) {
    if (ONLY && !ONLY.has(sp.id)) continue;
    const spDir = resolve(PHOTO_DIR, sp.id);
    const existing = existsSync(spDir)
      ? readdirSync(spDir).filter((f) => f.endsWith('.webp') && !f.endsWith('.thumb.webp'))
      : [];

    // 학명 검증(캐시 없을 때만 네트워크)
    if (!DRY && sp.scientificNameVerified === undefined) {
      const g = await verifyGbif(sp.scientificName);
      sp.scientificNameVerified = g.verified;
      if (g.key) sp.gbifKey = g.key;
    }

    const cands = await collectForSpecies(sp);
    console.log(`${sp.order}. ${sp.name}: 후보 ${cands.length}장 (기존 ${existing.length})`);
    if (DRY) continue;

    if (!existsSync(spDir)) mkdirSync(spDir, { recursive: true });
    // 기존 photos[]의 part 태그 보존 (비전 분류 결과를 덮어쓰지 않음)
    const prevPart = new Map<string, Photo['part']>();
    for (const p of sp.photos) if (p.file) prevPart.set(p.file, p.part);
    const photos: Photo[] = [];
    let idx = 0;
    for (const c of cands) {
      if (photos.length >= TARGET) break;
      idx++;
      const base = `photos/${sp.id}/${String(idx).padStart(2, '0')}`;
      const outFile = resolve(root, 'public', `${base}.webp`);
      try {
        if (!existsSync(outFile)) {
          const buf = await getBuffer(c.imageUrl);
          await processImage(buf, base);
        }
        photos.push({
          file: base + '.webp',
          thumb: base + '.thumb.webp',
          part: prevPart.get(base + '.webp') ?? c.part,
          sourceUrl: c.sourceUrl,
          author: c.author,
          license: c.license,
          licenseUrl: LICENSE_URL[c.license],
          provider: c.provider,
        });
      } catch (e) {
        console.warn(`  이미지 실패: ${c.imageUrl} (${(e as Error).message})`);
      }
    }
    sp.photos = photos;
    manifest[sp.id] = photos;
  }

  if (!DRY) {
    data.meta.generatedAt = new Date().toISOString().slice(0, 10);
    writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
    if (!existsSync(PHOTO_DIR)) mkdirSync(PHOTO_DIR, { recursive: true });
    writeFileSync(resolve(PHOTO_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log('\nspecies.json 및 manifest.json 갱신 완료.');
  } else {
    console.log('\n[DRY] 쓰기 없음.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
