import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { apiClient, ApiNetworkError } from '../api/client';
import { HealthResponse, ReadinessResponse, SystemInfoResponse, ConnectionState } from '../types';

interface SystemStatusContextType {
  connectionState: ConnectionState;
  loading: boolean;
  isRefreshing: boolean;
  health: HealthResponse | null;
  readiness: ReadinessResponse | null;
  systemInfo: SystemInfoResponse | null;
  error: string | null;
  lastChecked: Date | null;
  refetch: () => Promise<void>;
}

const SystemStatusContext = createContext<SystemStatusContextType | undefined>(undefined);

export const SystemStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const isFetchingRef = useRef(false);

  const fetchStatus = useCallback(async (isManualRefresh = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Call real backend health and readiness endpoints concurrently
      const [healthData, readinessData, infoData] = await Promise.allSettled([
        apiClient.getHealth(),
        apiClient.getReadiness(),
        apiClient.getSystemInfo(),
      ]);

      if (healthData.status === 'fulfilled') {
        setHealth(healthData.value);
      } else {
        setHealth(null);
        throw healthData.reason;
      }

      if (readinessData.status === 'fulfilled') {
        setReadiness(readinessData.value);
      } else {
        setReadiness(null);
      }

      if (infoData.status === 'fulfilled') {
        setSystemInfo(infoData.value);
      } else {
        setSystemInfo(null);
      }

      setLastChecked(new Date());
      setError(null);
    } catch (err: unknown) {
      if (err instanceof ApiNetworkError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to communicate with backend API.');
      }
      setHealth(null);
      setReadiness(null);
      setSystemInfo(null);
      setLastChecked(new Date());
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchStatus(false);
  }, [fetchStatus]);

  // Compute overall connection state
  let connectionState: ConnectionState = 'loading';
  if (loading && !health) {
    connectionState = 'loading';
  } else if (!health) {
    connectionState = 'disconnected';
  } else if (readiness && !readiness.database.connected) {
    connectionState = 'degraded'; // Backend is healthy, but database is not reachable
  } else {
    connectionState = 'connected';
  }

  return (
    <SystemStatusContext.Provider
      value={{
        connectionState,
        loading,
        isRefreshing,
        health,
        readiness,
        systemInfo,
        error,
        lastChecked,
        refetch: () => fetchStatus(true),
      }}
    >
      {children}
    </SystemStatusContext.Provider>
  );
};

export const useSystemStatus = (): SystemStatusContextType => {
  const context = useContext(SystemStatusContext);
  if (!context) {
    throw new Error('useSystemStatus must be used within a SystemStatusProvider');
  }
  return context;
};
