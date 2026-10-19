// 데이터 검증 스크립트 — npm run data:validate
// 공식목록 대조, 사진 수/라이선스/작성자, 금지 라이선스, nature.go.kr URL 검사
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { SpeciesDataset, Photo } from '../data/schema';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const ALLOWED_LICENSES = ['CC0', 'CC-BY', 'CC-BY-SA', 'CC-BY-NC', 'CC-BY-NC-SA'];
const MIN_PHOTOS = 4;

function loadJson<T>(p: string): T {
  return JSON.parse(readFileSync(resolve(root, p), 'utf-8')) as T;
}

function officialNames(): Map<number, string> {
  const txt = readFileSync(resolve(root, 'data/official/species-list-2020.txt'), 'utf-8');
  const m = new Map<number, string>();
  for (const line of txt.split('\n')) {
    const match = line.match(/^(\d+)\s+(.+?)\s*$/);
    if (match) m.set(Number(match[1]), match[2].trim());
  }
  return m;
}

interface Issue {
  level: 'error' | 'warn';
  msg: string;
}

function main() {
  const data = loadJson<SpeciesDataset>('data/species.json');
  const official = officialNames();
  const issues: Issue[] = [];
  const err = (msg: string) => issues.push({ level: 'error', msg });
  const warn = (msg: string) => issues.push({ level: 'warn', msg });

  // 1. 수종 수
  if (data.species.length !== 120) err(`수종 수가 120이 아님: ${data.species.length}`);
  if (official.size !== 120) err(`공식목록 수종 수가 120이 아님: ${official.size}`);

  // 2. 공식목록 1:1 대조 (순번·국명)
  for (const sp of data.species) {
    const off = official.get(sp.order);
    if (off === undefined) err(`순번 ${sp.order}(${sp.name})가 공식목록에 없음`);
    else if (off !== sp.name) err(`순번 ${sp.order}: species.json '${sp.name}' ≠ 공식 '${off}'`);
  }
  const ids = new Set<string>();
  for (const sp of data.species) {
    if (ids.has(sp.id)) err(`중복 id: ${sp.id}`);
    ids.add(sp.id);
  }

  // 3. 사진 수 / 라이선스 / 작성자
  const lowPhoto: string[] = [];
  let totalPhotos = 0;
  for (const sp of data.species) {
    const photos = (sp.photos ?? []).filter((p: Photo) => !p.excluded);
    totalPhotos += photos.length;
    if (photos.length < MIN_PHOTOS) lowPhoto.push(`${sp.name}(${photos.length})`);
    for (const p of photos) {
      if (!p.license) err(`${sp.name}: 라이선스 누락 사진 (${p.sourceUrl})`);
      else if (!ALLOWED_LICENSES.includes(p.license))
        err(`${sp.name}: 금지/알수없는 라이선스 '${p.license}' (${p.sourceUrl})`);
      if (!p.author) warn(`${sp.name}: 작성자 누락 (${p.sourceUrl})`);
      if (!p.sourceUrl) err(`${sp.name}: 원본 URL 누락`);
      if (!p.licenseUrl) warn(`${sp.name}: 라이선스 URL 누락 (${p.sourceUrl})`);
    }
  }

  // 4. nature.go.kr 전역 검사
  const raw = readFileSync(resolve(root, 'data/species.json'), 'utf-8');
  if (/nature\.go\.kr/i.test(raw)) err('species.json에 nature.go.kr URL이 존재');

  // --- 리포트 ---
  console.log('=== 데이터 검증 결과 ===');
  console.log(`수종: ${data.species.length} / 사진 총합(비제외): ${totalPhotos}`);
  console.log(`사진 ${MIN_PHOTOS}장 미만 수종 (${lowPhoto.length}종):`);
  if (lowPhoto.length) console.log('  ' + lowPhoto.join(', '));
  else console.log('  (없음)');

  const errors = issues.filter((i) => i.level === 'error');
  const warns = issues.filter((i) => i.level === 'warn');
  if (warns.length) {
    console.log(`\n경고 ${warns.length}건:`);
    warns.slice(0, 50).forEach((w) => console.log('  [warn] ' + w.msg));
  }
  if (errors.length) {
    console.log(`\n오류 ${errors.length}건:`);
    errors.forEach((e) => console.log('  [error] ' + e.msg));
    process.exit(1);
  } else {
    console.log('\n오류 없음 (사진 수 부족은 별도 보고 항목).');
  }
}

main();
