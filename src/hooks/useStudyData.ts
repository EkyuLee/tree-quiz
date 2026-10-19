import { useCallback, useEffect, useRef, useState } from 'react';
import type { CardRecord, Grade, StudyData } from '../types';
import {
  emptyStudyData,
  loadStudyData,
  saveStudyData,
  updateStreak,
} from '../lib/storage';
import { newCardRecord, reviewCard } from '../lib/fsrs';
import { matchOtherSpecies } from '../lib/matching';
import { SPECIES } from '../lib/data';

export function useStudyData() {
  const [data, setData] = useState<StudyData | null>(null);
  const dataRef = useRef<StudyData | null>(null);

  useEffect(() => {
    loadStudyData().then((d) => {
      dataRef.current = d;
      setData(d);
    });
  }, []);

  const persist = useCallback((next: StudyData) => {
    dataRef.current = next;
    setData(next);
    void saveStudyData(next);
  }, []);

  /** 카드 레코드 가져오기(없으면 새로 생성) */
  const getCard = useCallback(
    (speciesId: string): CardRecord => {
      const d = dataRef.current ?? emptyStudyData();
      return d.cards[speciesId] ?? newCardRecord(speciesId);
    },
    [],
  );

  /** 한 문제 채점 결과를 반영 (FSRS 갱신 + 통계 + 혼동 + streak) */
  const recordAnswer = useCallback(
    (speciesId: string, grade: Grade, userAnswer?: string) => {
      const d = dataRef.current ?? emptyStudyData();
      const prev = d.cards[speciesId] ?? newCardRecord(speciesId);
      const updated = reviewCard(prev, grade);

      const cards = { ...d.cards, [speciesId]: updated };

      // 혼동 통계: 오답 시 사용자가 고른/적은 수종 추정
      let confusions = d.confusions;
      if (grade === 'wrong' && userAnswer) {
        const confusedWith = matchOtherSpecies(userAnswer, SPECIES, speciesId);
        if (confusedWith) {
          confusions = upsertConfusion(confusions, speciesId, confusedWith);
        }
      }

      const streak = updateStreak(d.streak);
      persist({ ...d, cards, confusions, streak });
    },
    [persist],
  );

  /** 최근 사진 기록 (예시 다양성) */
  const noteShownPhoto = useCallback(
    (speciesId: string, photoFile?: string) => {
      if (!photoFile) return;
      const d = dataRef.current ?? emptyStudyData();
      const prev = d.cards[speciesId] ?? newCardRecord(speciesId);
      const recent = [photoFile, ...prev.recentPhotos.filter((p) => p !== photoFile)].slice(0, 3);
      const cards = { ...d.cards, [speciesId]: { ...prev, recentPhotos: recent } };
      persist({ ...d, cards });
    },
    [persist],
  );

  const addExam = useCallback(
    (exam: StudyData['exams'][number]) => {
      const d = dataRef.current ?? emptyStudyData();
      const streak = updateStreak(d.streak);
      persist({ ...d, exams: [exam, ...d.exams].slice(0, 100), streak });
    },
    [persist],
  );

  const updateSettings = useCallback(
    (patch: Partial<StudyData['settings']>) => {
      const d = dataRef.current ?? emptyStudyData();
      persist({ ...d, settings: { ...d.settings, ...patch } });
    },
    [persist],
  );

  const replaceAll = useCallback(
    (next: StudyData) => {
      persist(next);
    },
    [persist],
  );

  const reset = useCallback(() => {
    persist(emptyStudyData());
  }, [persist]);

  return {
    data,
    getCard,
    recordAnswer,
    noteShownPhoto,
    addExam,
    updateSettings,
    replaceAll,
    reset,
  };
}

function upsertConfusion(
  list: StudyData['confusions'],
  speciesId: string,
  confusedWith: string,
): StudyData['confusions'] {
  const idx = list.findIndex(
    (c) => c.speciesId === speciesId && c.confusedWith === confusedWith,
  );
  if (idx >= 0) {
    const next = list.slice();
    next[idx] = { ...next[idx], count: next[idx].count + 1 };
    return next;
  }
  return [...list, { speciesId, confusedWith, count: 1 }];
}
