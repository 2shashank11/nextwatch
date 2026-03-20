import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { DigestFeed } from './components/DigestFeed';
import { SubmitReport } from './components/SubmitReport';
import { TrendsDashboard } from './components/TrendsDashboard';
import { ReportDetail, ReportDetailRoute } from './components/ReportDetail';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthPage } from './components/AuthPage';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { CirclePage } from './pages/CirclePage';
import { CircleSettings } from './pages/CircleSettings';

export function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/feed" element={<DigestFeed />} />
            <Route path="/trends" element={<TrendsDashboard />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <ProfilePage /> 
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/circle" 
              element={
                <ProtectedRoute>
                  <CirclePage /> 
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/circle/settings" 
              element={
                <ProtectedRoute>
                  <CircleSettings /> 
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/report" 
              element={
                <ProtectedRoute>
                  <SubmitReport /> 
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/report/:id" 
              element={
                <ProtectedRoute>
                  <ReportDetailRoute /> 
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/verify" 
              element={
                <ProtectedRoute>
                  <ReportDetail />
                </ProtectedRoute>
              } 
            />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors />
    </>
  );
}
