// 앱 전역 타입
import type { Species, Photo, PartTag } from '../data/schema';

export type { Species, Photo, PartTag };

/** 퀴즈 응답 형식 */
export type AnswerMode = 'choice' | 'typing';

/** 학습 모드 */
export type StudyMode = 'today' | 'exam' | 'weakness' | 'book';

/** 한 문제 */
export interface Question {
  speciesId: string;
  /** 보여줄 사진 (없으면 사진 없이 설명만) */
  photo?: Photo;
  /** 객관식 보기 (choice 모드일 때) — 정답 포함 수종 id 목록 */
  choices?: string[];
  answerMode: AnswerMode;
}

/** 채점 결과 */
export type Grade = 'correct' | 'almost' | 'wrong';

export interface GradeResult {
  grade: Grade;
  /** 매칭된 정식 명칭(정답일 때) */
  matched?: string;
  /** '거의 맞음'일 때 사용자가 노린 것으로 보이는 정답 */
  suggestion?: string;
}

/** 수종별 학습 상태(FSRS 카드 + 통계) — IndexedDB에 저장 */
export interface CardRecord {
  speciesId: string;
  // ts-fsrs Card 필드 (직렬화 가능 형태)
  due: string; // ISO
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number; // ts-fsrs State enum 값
  last_review?: string; // ISO
  learning_steps: number;
  // 통계
  seen: number;
  correct: number;
  wrong: number;
  /** 최근 본 사진 파일 경로 (예시 다양성 위해 최근 회피) */
  recentPhotos: string[];
}

/** 혼동 쌍 집계 (약점 집중용): "선택한 오답 수종" 빈도 */
export interface ConfusionStat {
  speciesId: string; // 정답 수종
  confusedWith: string; // 잘못 고른 수종
  count: number;
}

/** 모의고사 결과 1회 */
export interface ExamResult {
  date: string; // ISO
  total: number;
  correct: number;
  score: number; // 100점 환산
  questions: {
    speciesId: string;
    userAnswer: string;
    grade: Grade;
  }[];
}

/** 전체 학습 기록 (내보내기/가져오기 단위) */
export interface StudyData {
  version: 1;
  cards: Record<string, CardRecord>;
  confusions: ConfusionStat[];
  exams: ExamResult[];
  streak: {
    lastStudyDate: string | null; // YYYY-MM-DD
    current: number;
    best: number;
  };
  settings: {
    perQuestionSeconds: number; // 모의고사 문항당 시간(0=무제한)
    examQuestionCount: number;
  };
}
