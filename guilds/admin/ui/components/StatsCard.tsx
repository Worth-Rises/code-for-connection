import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@openconnect/ui';

interface StatsCardProps {
  title: string;
  value: number | null;
  color: string;
  linkTo?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, color, linkTo }) => {
  const content = (
    <Card padding="md">
      <div className="text-center">
        <p className={`text-3xl font-bold ${color}`}>
          {value !== null ? value : 'Unavailable'}
        </p>
        <p className="text-sm text-gray-600">{title}</p>
      </div>
    </Card>
  );

  if (linkTo) {
    return <Link to={linkTo}>{content}</Link>;
  }

  return content;
};
