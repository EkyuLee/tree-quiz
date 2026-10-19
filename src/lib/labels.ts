// UI 라벨 헬퍼 (컴포넌트 분리로 fast-refresh 경고 회피)
const PART_LABEL: Record<string, string> = {
  leaf: '잎',
  bark: '수피',
  flower: '꽃',
  fruit: '열매',
  whole: '전체',
  winter: '겨울눈',
};

export function partLabel(part: string): string {
  return PART_LABEL[part] ?? part;
}

export const LICENSE_SHORT: Record<string, string> = {
  CC0: 'CC0',
  'CC-BY': 'CC BY',
  'CC-BY-SA': 'CC BY-SA',
  'CC-BY-NC': 'CC BY-NC',
  'CC-BY-NC-SA': 'CC BY-NC-SA',
};
