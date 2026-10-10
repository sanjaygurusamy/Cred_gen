import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SystemStatusProvider } from './context/SystemStatusContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { CampusBlocksPage } from './pages/CampusBlocksPage';
import { ActivityDataPage } from './pages/ActivityDataPage';
import { ElectricityPage } from './pages/ElectricityPage';
import { CarbonCalculationsPage } from './pages/CarbonCalculationsPage';
import { MRVProjectsPage } from './pages/MRVProjectsPage';
import { EvidencePage } from './pages/EvidencePage';
import { VerificationPage } from './pages/VerificationPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <SystemStatusProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<Navigate to="/" replace />} />
            <Route path="campus" element={<CampusBlocksPage />} />
            <Route path="activity" element={<ActivityDataPage />} />
            <Route path="electricity" element={<ElectricityPage />} />
            <Route path="calculator" element={<CarbonCalculationsPage />} />
            <Route path="mrv" element={<MRVProjectsPage />} />
            <Route path="evidence" element={<EvidencePage />} />
            <Route path="verification" element={<VerificationPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </SystemStatusProvider>
    </BrowserRouter>
  );
};
