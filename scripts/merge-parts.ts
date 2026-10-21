// 부위 분류 결과를 species.json photos[].part에 병합
// data/photo-parts.json : { "photos/<id>/NN.webp": "leaf|bark|flower|fruit|whole|winter" }
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { SpeciesDataset } from '../data/schema';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dataPath = resolve(root, 'data/species.json');
const partsPath = resolve(root, 'data/photo-parts.json');

const VALID = new Set(['leaf', 'bark', 'flower', 'fruit', 'whole', 'winter']);

function main() {
  if (!existsSync(partsPath)) {
    console.error('data/photo-parts.json 이 없습니다. 먼저 분류 결과를 작성하세요.');
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(dataPath, 'utf-8')) as SpeciesDataset;
  const parts = JSON.parse(readFileSync(partsPath, 'utf-8')) as Record<string, string>;

  let changed = 0;
  let invalid = 0;
  for (const sp of data.species) {
    for (const p of sp.photos) {
      const tag = parts[p.file ?? ''];
      if (!tag) continue;
      if (!VALID.has(tag)) {
        console.warn(`무효 태그 '${tag}' (${p.file}) — 건너뜀`);
        invalid++;
        continue;
      }
      if (p.part !== tag) {
        p.part = tag as typeof p.part;
        changed++;
      }
    }
  }
  writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');

  // 결과 요약
  const dist: Record<string, number> = {};
  for (const sp of data.species) for (const p of sp.photos) dist[p.part] = (dist[p.part] ?? 0) + 1;
  console.log(`병합 완료: ${changed}장 태그 변경, 무효 ${invalid}건`);
  console.log('부위 분포:', dist);
}

main();
