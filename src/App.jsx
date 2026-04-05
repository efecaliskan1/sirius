import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import AppLayout from './layouts/AppLayout';
import AppErrorBoundary from './components/AppErrorBoundary';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HomePage from './pages/HomePage';
import CoursesPage from './pages/CoursesPage';
import SchedulePage from './pages/SchedulePage';
import TasksPage from './pages/TasksPage';
import PomodoroPage from './pages/PomodoroPage';
import StatsPage from './pages/StatsPage';
import RewardsPage from './pages/RewardsPage';
import CoursePage from './pages/CoursePage';
import LeaderboardPage from './pages/LeaderboardPage';
import { clearLegacyAuthStorage } from './utils/auth';

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AuthGuard({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

export default function App() {
  const init = useAuthStore((s) => s.init);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    clearLegacyAuthStorage();
    init();
  }, [init]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Initializing Cosmic Study Space...</p>
        </div>
      </div>
    );
  }

  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthGuard><LoginPage /></AuthGuard>} />
          <Route path="/signup" element={<AuthGuard><SignupPage /></AuthGuard>} />
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<HomePage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="pomodoro" element={<PomodoroPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="rewards" element={<RewardsPage />} />
            <Route path="course/:courseId" element={<CoursePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
