"use client";

import { useState } from 'react';
import DashboardStats from './DashboardStats';
import DashboardChart from './DashboardChart';

export default function DashboardWithChart() {
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);

  return (
    <>
      <DashboardStats onDateRangeChange={setDateRange} />
      <DashboardChart dateRange={dateRange} />
    </>
  );
}
