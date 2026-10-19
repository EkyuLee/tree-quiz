// 셔플 유틸 — Fisher-Yates, 연속 중복(같은 수종) 방지

/** 시드 가능한 난수 생성기 (테스트 재현성). 기본은 Math.random */
export type Rng = () => number;

/** Fisher-Yates 셔플 (원본 불변, 새 배열 반환) */
export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * key(같은 수종 등)가 연속으로 나오지 않도록 재배치한다.
 * 먼저 셔플한 뒤, 직전과 같은 key면 뒤쪽의 다른 key와 교환한다.
 * 한 key가 전체의 과반이면 완전 분리는 불가능하므로 최선으로 배치한다.
 */
export function shuffleNoConsecutive<T>(
  arr: readonly T[],
  keyOf: (item: T) => string,
  rng: Rng = Math.random,
): T[] {
  const a = shuffle(arr, rng);
  for (let i = 1; i < a.length; i++) {
    if (keyOf(a[i]) === keyOf(a[i - 1])) {
      // i 이후에서 a[i-1]와 다른 key를 찾아 swap
      let swapped = false;
      for (let j = i + 1; j < a.length; j++) {
        if (keyOf(a[j]) !== keyOf(a[i - 1])) {
          [a[i], a[j]] = [a[j], a[i]];
          swapped = true;
          break;
        }
      }
      if (!swapped) {
        // 앞쪽에서 교환 가능한 위치 탐색 (양옆과 다른 자리)
        for (let j = 0; j < i - 1; j++) {
          if (
            keyOf(a[j]) !== keyOf(a[i]) &&
            keyOf(a[j + 1]) !== keyOf(a[i]) &&
            (j === 0 || keyOf(a[j - 1]) !== keyOf(a[i]))
          ) {
            [a[i], a[j]] = [a[j], a[i]];
            break;
          }
        }
      }
    }
  }
  return a;
}

/** 배열에서 n개를 비복원 무작위 추출 */
export function sample<T>(arr: readonly T[], n: number, rng: Rng = Math.random): T[] {
  return shuffle(arr, rng).slice(0, Math.min(n, arr.length));
}

/** 연속 중복이 몇 쌍 있는지 (테스트/검증용) */
export function countConsecutive<T>(arr: readonly T[], keyOf: (item: T) => string): number {
  let c = 0;
  for (let i = 1; i < arr.length; i++) {
    if (keyOf(arr[i]) === keyOf(arr[i - 1])) c++;
  }
  return c;
}
