"use client";

import { useState } from 'react';
import DashboardStats from './DashboardStats';
import DashboardChart from './DashboardChart';

export default function DashboardWithChart() {
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedStatType, setSelectedStatType] = useState<'requested' | 'successful' | 'failures'>('requested');

  return (
    <>
      <DashboardStats 
        onDateRangeChange={setDateRange} 
        onStatTypeChange={setSelectedStatType}
        selectedStatType={selectedStatType}
      />
      <DashboardChart dateRange={dateRange} statType={selectedStatType} />
    </>
  );
}
