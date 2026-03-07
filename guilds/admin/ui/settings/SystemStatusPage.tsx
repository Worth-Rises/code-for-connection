import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '@openconnect/ui';
import { useAdminApi } from '../hooks/useAdminApi';

interface ServiceHealth {
  status: string;
  latencyMs?: number;
  url?: string;
}

interface HealthData {
  database: ServiceHealth;
  api: ServiceHealth;
  signaling: ServiceHealth;
  redis: ServiceHealth;
}

const SERVICE_LABELS: Record<string, string> = {
  database: 'Database',
  api: 'API Server',
  signaling: 'Signaling Server',
  redis: 'Redis',
};

function StatusIndicator({ status }: { status: string }) {
  const isHealthy = status === 'healthy';
  const isUnconfigured = status === 'unconfigured';

  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-3 h-3 rounded-full inline-block ${
          isHealthy
            ? 'bg-green-500'
            : isUnconfigured
              ? 'bg-gray-400'
              : 'bg-red-500'
        }`}
      />
      <span
        className={`text-sm font-medium ${
          isHealthy
            ? 'text-green-700'
            : isUnconfigured
              ? 'text-gray-500'
              : 'text-red-700'
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </div>
  );
}

export default function SystemStatusPage() {
  const { get } = useAdminApi();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/settings/system/health');
      setHealth(res.data || null);
      setLastChecked(new Date());
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const services = health
    ? (Object.entries(health) as [string, ServiceHealth][])
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">System Status</h1>
        <Button onClick={fetchHealth} loading={loading}>
          Refresh
        </Button>
      </div>

      {loading && !health ? (
        <Card padding="lg">
          <p className="text-center text-gray-500">Loading system status...</p>
        </Card>
      ) : !health ? (
        <Card padding="lg">
          <p className="text-center text-gray-500">
            Unable to fetch system status. Please try again.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map(([key, service]) => (
            <Card key={key} padding="lg">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {SERVICE_LABELS[key] || key}
                </h3>
                <StatusIndicator status={service.status} />
                {service.latencyMs !== undefined && (
                  <p className="text-sm text-gray-500">
                    Latency: {service.latencyMs}ms
                  </p>
                )}
                {service.url && (
                  <p className="text-sm text-gray-400 truncate" title={service.url}>
                    {service.url}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {lastChecked && (
        <p className="text-sm text-gray-400 text-center">
          Last checked: {lastChecked.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
