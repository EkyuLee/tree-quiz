import { useState } from 'react';
import { useStudyData } from './hooks/useStudyData';
import { FlashcardView } from './views/FlashcardView';
import { TodayView } from './views/TodayView';
import { ExamView } from './views/ExamView';
import { WeaknessView } from './views/WeaknessView';
import { BookView } from './views/BookView';
import { Dashboard } from './views/Dashboard';
import { SourcesView } from './views/SourcesView';

type Tab = 'flash' | 'today' | 'exam' | 'weakness' | 'book' | 'dash';
type Route = Tab | 'sources';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'flash', label: '감별', icon: '🔍' },
  { id: 'today', label: '오늘', icon: '📘' },
  { id: 'exam', label: '모의고사', icon: '📝' },
  { id: 'weakness', label: '약점', icon: '🎯' },
  { id: 'book', label: '도감', icon: '🌳' },
  { id: 'dash', label: '대시보드', icon: '📊' },
];

export default function App() {
  const store = useStudyData();
  const [route, setRoute] = useState<Route>('flash');

  if (!store.data) {
    return (
      <div className="app">
        <p className="center muted" style={{ marginTop: 40 }}>
          불러오는 중…
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>조경기능사 수목감별</h1>
        <button
          className="btn ghost"
          style={{ padding: '6px 10px', minHeight: 'auto' }}
          onClick={() => setRoute('sources')}
          aria-label="출처 및 라이선스"
        >
          출처
        </button>
      </header>

      <main>
        {route === 'flash' && <FlashcardView store={store} />}
        {route === 'today' && <TodayView store={store} />}
        {route === 'exam' && <ExamView store={store} />}
        {route === 'weakness' && <WeaknessView store={store} />}
        {route === 'book' && <BookView />}
        {route === 'dash' && <Dashboard store={store} />}
        {route === 'sources' && <SourcesView />}
      </main>

      <nav className="tabs" aria-label="주요 메뉴">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setRoute(t.id)}
            aria-current={route === t.id ? 'page' : undefined}
          >
            <span className="ico" aria-hidden="true">
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
