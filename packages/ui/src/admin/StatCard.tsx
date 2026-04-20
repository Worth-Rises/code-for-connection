/**
 * Reusable stat card with optional pulsing indicator.
 */
import { Card } from '@openconnect/ui';

interface StatCardProps {
  label: string;
  value: number | string;
  loading?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  pulse?: boolean;
}

const colorMap: Record<string, string> = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  yellow: 'text-yellow-600',
  red: 'text-red-600',
  purple: 'text-purple-600',
  gray: 'text-gray-600',
};

const pulseColorMap: Record<string, { ring: string; dot: string }> = {
  blue: { ring: 'bg-blue-400', dot: 'bg-blue-500' },
  green: { ring: 'bg-green-400', dot: 'bg-green-500' },
  yellow: { ring: 'bg-yellow-400', dot: 'bg-yellow-500' },
  red: { ring: 'bg-red-400', dot: 'bg-red-500' },
  purple: { ring: 'bg-purple-400', dot: 'bg-purple-500' },
  gray: { ring: 'bg-gray-400', dot: 'bg-gray-500' },
};

export function StatCard({ label, value, loading, color = 'blue', pulse }: StatCardProps) {
  const textColor = colorMap[color] || colorMap.blue;
  const pulseColors = pulseColorMap[color] || pulseColorMap.blue;

  return (
    <Card padding="md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className={`text-3xl font-bold ${textColor} mt-1`}>
            {loading ? '—' : value}
          </p>
        </div>
        {pulse && (
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pulseColors.ring} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-3 w-3 ${pulseColors.dot}`} />
          </span>
        )}
      </div>
    </Card>
  );
}
