// 조경기능사 수목감별 — 데이터 스키마 (앱/파이프라인 공용)
// 이 파일은 data/species.json 의 타입 기준이다.

export type PartTag = 'leaf' | 'bark' | 'flower' | 'fruit' | 'whole' | 'winter';

export type PhotoLicense =
  | 'CC0'
  | 'CC-BY'
  | 'CC-BY-SA'
  | 'CC-BY-NC'
  | 'CC-BY-NC-SA';

export interface Photo {
  /** 로컬 자산 경로(파이프라인이 WebP로 저장). 수집 전에는 비어 있을 수 있음 */
  file?: string;
  /** 썸네일 경로 */
  thumb?: string;
  /** 부위 태그 */
  part: PartTag;
  /** 원본 이미지 URL */
  sourceUrl: string;
  /** 작성자 표시명 */
  author: string;
  /** 라이선스 */
  license: PhotoLicense;
  /** 라이선스 전문 URL */
  licenseUrl: string;
  /** 출처 플랫폼 */
  provider: 'iNaturalist' | 'Wikimedia Commons';
  /** 사람 검수에서 제외 플래그(다른 수종/표본/사람/이름표 등) */
  excluded?: boolean;
  excludedReason?: string;
}

export interface Species {
  /** 안정적 식별자 (로마자 slug) */
  id: string;
  /** 공식 목록 순번 1..120 */
  order: number;
  /** 국명 (공식 목록 표기 = 기본 정답) */
  name: string;
  /** 이명/별칭 (정답으로 인정) */
  aliases: string[];
  /** 학명 */
  scientificName: string;
  /** 영명 */
  englishName: string;
  /** 과 (국명) */
  family: string;
  familyScientific: string;
  /** 속 (국명) */
  genus: string;
  genusScientific: string;
  /** 상록 / 낙엽 / 반상록 */
  leafPersistence: '상록' | '낙엽' | '반상록';
  /** 생활형 */
  habit: ('교목' | '관목' | '덩굴' | '소교목')[];
  /** 형태 특징 */
  morphology: {
    leaf: string;
    bark: string;
    flower: string;
    fruit: string;
    winterBud?: string;
    form: string;
  };
  /** 개화기 (월) */
  floweringMonths: number[];
  /** 결실기 (월) */
  fruitingMonths: number[];
  /** 조경 용도 */
  landscapeUse: string;
  /** 혼동 수종 그룹 (같은 그룹 id 공유) */
  confusionGroup?: string;
  /** 혼동 수종과의 핵심 구분 포인트 (시험 대비) */
  distinguishing: string;
  /** 사실 검수 필요 플래그 */
  review?: 'needs-review';
  reviewNote?: string;
  /** GBIF/Wikidata 조회로 확인된 학명인지 */
  scientificNameVerified?: boolean;
  gbifKey?: number;
  /** iNaturalist taxon id (사진 수집용) */
  inatTaxonId?: number;
  /** 사진 목록 */
  photos: Photo[];
}

export interface SpeciesDataset {
  meta: {
    source: string;
    sourceFile: string;
    sourceSha256: string;
    listDate: string;
    count: number;
    generatedAt: string;
    license: string;
  };
  species: Species[];
}
