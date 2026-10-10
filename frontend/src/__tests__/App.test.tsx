import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { App } from '../App';
import { apiClient } from '../api/client';
import { HealthResponse, ReadinessResponse, SystemInfoResponse } from '../types';

const mockHealthResponse: HealthResponse = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  app: 'CampusCarbon AI',
  version: '2.0.0',
  environment: 'development',
};

const mockReadinessSuccess: ReadinessResponse = {
  status: 'ready',
  timestamp: new Date().toISOString(),
  database: {
    connected: true,
    status: 'connected',
    engine: 'postgresql',
    message: 'Database operational',
  },
  phase: 'Phase 1: Application Foundation',
};

const mockReadinessDegraded: ReadinessResponse = {
  status: 'not_ready',
  timestamp: new Date().toISOString(),
  database: {
    connected: false,
    status: 'unavailable',
    engine: 'postgresql',
    message: 'Database connection failed',
  },
  phase: 'Phase 1: Application Foundation',
};

const mockSystemInfo: SystemInfoResponse = {
  app_name: 'CampusCarbon AI',
  version: '2.0.0',
  environment: 'development',
  current_phase: 'Phase 1: Application Foundation',
  architecture: 'Modular Monolith',
  database_engine: 'postgresql',
  features_active: ['Health Probes', 'Readiness Verification'],
  features_planned: ['Phase 2: Campus Hierarchy', 'Phase 3: Activity Records'],
};

describe('CampusCarbon AI — Phase 1 Application Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, 'Test', '/');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Application shell renders branding and structure', async () => {
    vi.spyOn(apiClient, 'getHealth').mockResolvedValue(mockHealthResponse);
    vi.spyOn(apiClient, 'getReadiness').mockResolvedValue(mockReadinessSuccess);
    vi.spyOn(apiClient, 'getSystemInfo').mockResolvedValue(mockSystemInfo);

    render(<App />);

    expect(await screen.findByText('CampusCarbon AI')).toBeInTheDocument();
    expect(screen.getByText('GreenTech University Main Campus')).toBeInTheDocument();
  });

  it('2. Navigation renders all required sidebar routes', async () => {
    vi.spyOn(apiClient, 'getHealth').mockResolvedValue(mockHealthResponse);
    vi.spyOn(apiClient, 'getReadiness').mockResolvedValue(mockReadinessSuccess);
    vi.spyOn(apiClient, 'getSystemInfo').mockResolvedValue(mockSystemInfo);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Campus & Blocks/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Activity Data/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Electricity & Baselines/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Carbon Calculator/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /MRV Projects/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Evidence & Documents/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Verification/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Reports/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Settings/i })).toBeInTheDocument();
    });
  });

  it('3. Dashboard displays honest empty state when no activity data exists', async () => {
    vi.spyOn(apiClient, 'getHealth').mockResolvedValue(mockHealthResponse);
    vi.spyOn(apiClient, 'getReadiness').mockResolvedValue(mockReadinessSuccess);
    vi.spyOn(apiClient, 'getSystemInfo').mockResolvedValue(mockSystemInfo);

    render(<App />);

    expect(
      await screen.findByText('No campus activity data has been recorded yet')
    ).toBeInTheDocument();

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(4);
  });

  it('4. Handles backend connected state with database operational', async () => {
    vi.spyOn(apiClient, 'getHealth').mockResolvedValue(mockHealthResponse);
    vi.spyOn(apiClient, 'getReadiness').mockResolvedValue(mockReadinessSuccess);
    vi.spyOn(apiClient, 'getSystemInfo').mockResolvedValue(mockSystemInfo);

    render(<App />);

    expect(await screen.findByText('API & DB Ready')).toBeInTheDocument();
    expect(screen.getByText('Healthy & Responding')).toBeInTheDocument();
    expect(screen.getByText('Connected (Ping 200)')).toBeInTheDocument();
  });

  it('5. Handles backend connected but database unavailable state (degraded)', async () => {
    vi.spyOn(apiClient, 'getHealth').mockResolvedValue(mockHealthResponse);
    vi.spyOn(apiClient, 'getReadiness').mockResolvedValue(mockReadinessDegraded);
    vi.spyOn(apiClient, 'getSystemInfo').mockResolvedValue(mockSystemInfo);

    render(<App />);

    expect(await screen.findByText('API Up • DB Offline')).toBeInTheDocument();
    expect(screen.getByText('Healthy & Responding')).toBeInTheDocument();
    expect(screen.getByText('Unavailable (503)')).toBeInTheDocument();
  });

  it('6. Handles backend completely unavailable state', async () => {
    vi.spyOn(apiClient, 'getHealth').mockRejectedValue(new Error('Network error: Server unreachable'));
    vi.spyOn(apiClient, 'getReadiness').mockRejectedValue(new Error('Network error: Server unreachable'));
    vi.spyOn(apiClient, 'getSystemInfo').mockRejectedValue(new Error('Network error: Server unreachable'));

    render(<App />);

    expect(await screen.findByText('API Offline')).toBeInTheDocument();
    expect(screen.getByText('Offline / Unreachable')).toBeInTheDocument();
  });

  it('7. Manual retry probe triggers real re-fetch', async () => {
    const healthSpy = vi.spyOn(apiClient, 'getHealth').mockResolvedValue(mockHealthResponse);
    vi.spyOn(apiClient, 'getReadiness').mockResolvedValue(mockReadinessSuccess);
    vi.spyOn(apiClient, 'getSystemInfo').mockResolvedValue(mockSystemInfo);

    render(<App />);

    await screen.findByText('API & DB Ready');
    expect(healthSpy).toHaveBeenCalledTimes(1);

    const retryButtons = screen.getAllByRole('button', { name: /Probe Status|Test Connection/i });
    expect(retryButtons.length).toBeGreaterThan(0);

    fireEvent.click(retryButtons[0]);

    await waitFor(() => {
      expect(healthSpy).toHaveBeenCalledTimes(2);
    });
  });

  it('8. Navigating to an unknown route renders clean 404 page', async () => {
    vi.spyOn(apiClient, 'getHealth').mockResolvedValue(mockHealthResponse);
    vi.spyOn(apiClient, 'getReadiness').mockResolvedValue(mockReadinessSuccess);
    vi.spyOn(apiClient, 'getSystemInfo').mockResolvedValue(mockSystemInfo);

    window.history.pushState({}, 'Unknown', '/some-invalid-route');
    render(<App />);

    expect(await screen.findByText('404 Error')).toBeInTheDocument();
    expect(screen.getAllByText('Page Not Found').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('link', { name: /Return to Dashboard/i })).toBeInTheDocument();
  });
});
