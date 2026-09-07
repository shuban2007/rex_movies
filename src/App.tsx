import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { HomePage } from './pages/HomePage';
import { WatchPage } from './pages/WatchPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { HistoryPage } from './pages/HistoryPage';
import { NotFoundPage } from './pages/NotFoundPage';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <ScrollToTop />
      <Header />
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/browse" element={<Navigate to="/" replace />} />
          <Route path="/watch/:tmdbId" element={<WatchPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}
