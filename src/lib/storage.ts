// 학습 기록 저장 (IndexedDB via Dexie) + 내보내기/가져오기
import Dexie, { type Table } from 'dexie';
import type { StudyData } from '../types';

const DATA_KEY = 'studyData';

interface KV {
  key: string;
  value: unknown;
}

class StudyDB extends Dexie {
  kv!: Table<KV, string>;
  constructor() {
    super('tree-quiz');
    this.version(1).stores({ kv: 'key' });
  }
}

const db = new StudyDB();

export function emptyStudyData(): StudyData {
  return {
    version: 1,
    cards: {},
    confusions: [],
    exams: [],
    streak: { lastStudyDate: null, current: 0, best: 0 },
    settings: { perQuestionSeconds: 20, examQuestionCount: 20 },
  };
}

export async function loadStudyData(): Promise<StudyData> {
  const row = await db.kv.get(DATA_KEY);
  if (!row) return emptyStudyData();
  return migrate(row.value as StudyData);
}

export async function saveStudyData(data: StudyData): Promise<void> {
  await db.kv.put({ key: DATA_KEY, value: data });
}

function migrate(data: StudyData): StudyData {
  const base = emptyStudyData();
  return {
    ...base,
    ...data,
    streak: { ...base.streak, ...data.streak },
    settings: { ...base.settings, ...data.settings },
    cards: data.cards ?? {},
    confusions: data.confusions ?? [],
    exams: data.exams ?? [],
  };
}

/** 내보내기: JSON 문자열 */
export function exportJson(data: StudyData): string {
  return JSON.stringify(data, null, 2);
}

/** 가져오기: JSON 파싱 + 최소 검증 */
export function importJson(text: string): StudyData {
  const parsed = JSON.parse(text) as Partial<StudyData>;
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('잘못된 형식입니다.');
  }
  return migrate(parsed as StudyData);
}

/** YYYY-MM-DD (로컬) */
export function todayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 연속 학습일 갱신 */
export function updateStreak(streak: StudyData['streak'], today = todayStr()): StudyData['streak'] {
  if (streak.lastStudyDate === today) return streak;
  let current = 1;
  if (streak.lastStudyDate) {
    const prev = new Date(streak.lastStudyDate);
    const diff = Math.round((new Date(today).getTime() - prev.getTime()) / 86400000);
    current = diff === 1 ? streak.current + 1 : 1;
  }
  return {
    lastStudyDate: today,
    current,
    best: Math.max(streak.best, current),
  };
}
