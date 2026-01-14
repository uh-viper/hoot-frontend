"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getUserFilteredStats } from '@/app/actions/user-stats';
import CalendarModal from './CalendarModal';
import { getLocalDateRange, localDateRangeToUTC, formatDateRange } from '@/lib/utils/date-timezone';

export default function DashboardStats() {
  const pathname = usePathname();
  const [stats, setStats] = useState({
    requested: 0,
    successful: 0,
    failures: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [quickDateRange, setQuickDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Fetch stats based on date range
  const fetchStats = async () => {
    setIsLoading(true);
    
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (dateRange) {
      const utcRange = localDateRangeToUTC(dateRange.start, dateRange.end);
      startDate = utcRange.start;
      endDate = utcRange.end;
    }

    const result = await getUserFilteredStats(startDate, endDate);
    
    if (result.error) {
      console.error('Error fetching stats:', result.error);
      setIsLoading(false);
      return;
    }

    setStats({
      requested: result.requested ?? 0,
      successful: result.successful ?? 0,
      failures: result.failures ?? 0,
    });
    setIsLoading(false);
  };

  useEffect(() => {
    fetchStats();

    // Fetch immediately and set up real-time
    const setupRealtime = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const channel = supabase
        .channel('dashboard-stats-updates')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'user_jobs',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // When any job changes, refetch stats
            fetchStats();
          }
        )
        .subscribe();

      return { channel, supabase };
    };

    // Set up real-time subscription
    let realtimeSetup: Awaited<ReturnType<typeof setupRealtime>> | null = null;
    setupRealtime().then(setup => {
      realtimeSetup = setup;
    });

    // Also listen for custom event when job completes
    const handleStatsUpdate = () => {
      fetchStats();
    };
    
    // Listen for when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchStats();
      }
    };
    
    window.addEventListener('stats-updated', handleStatsUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (realtimeSetup) {
        realtimeSetup.supabase.removeChannel(realtimeSetup.channel);
      }
      window.removeEventListener('stats-updated', handleStatsUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname, dateRange]); // Re-run when pathname or date range changes

  // Handle quick date range selection
  const handleQuickDateRange = (range: 'all' | 'today' | 'week' | 'month') => {
    setQuickDateRange(range);
    if (range === 'all') {
      setDateRange(null);
      return;
    }

    const { start, end } = getLocalDateRange(range);
    setDateRange({ start, end });
  };

  const handleDateRangeSelect = (range: 'all' | 'today' | 'week' | 'month' | 'custom') => {
    if (range === 'custom') {
      setIsCalendarOpen(true);
      setIsDropdownOpen(false);
    } else {
      handleQuickDateRange(range as 'all' | 'today' | 'week' | 'month');
      setIsDropdownOpen(false);
    }
  };

  const getDateRangeLabel = () => {
    if (dateRange) {
      return formatDateRange(dateRange.start, dateRange.end);
    }
    return 'All Time';
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isDropdownOpen && !target.closest('.dashboard-date-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  if (isLoading) {
    return (
      <>
        <div className="dashboard-stats-header">
          <div className="dashboard-date-dropdown-wrapper">
            <div className="dashboard-date-dropdown">
              <button className="dashboard-date-dropdown-toggle" disabled>
                <span className="material-icons">calendar_today</span>
                <span>Loading...</span>
              </button>
            </div>
          </div>
        </div>
        <div className="dashboard-stats">
          {[1, 2, 3].map((i) => (
            <div key={i} className="stat-card">
              <div className="stat-icon">
                <span className="material-icons">pending_actions</span>
              </div>
              <div className="stat-content">
                <p className="stat-label">Loading...</p>
                <p className="stat-value">-</p>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Date Range Selector */}
      <div className="dashboard-stats-header">
        <div className="dashboard-date-dropdown-wrapper">
          <div className="dashboard-date-dropdown">
            <button
              className="dashboard-date-dropdown-toggle"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span className="material-icons">calendar_today</span>
              <span>{getDateRangeLabel()}</span>
              <span className="material-icons">{isDropdownOpen ? 'expand_less' : 'expand_more'}</span>
            </button>
            {isDropdownOpen && (
              <div className="dashboard-date-dropdown-menu">
                <button
                  className={`dashboard-date-dropdown-item ${quickDateRange === 'all' ? 'active' : ''}`}
                  onClick={() => handleDateRangeSelect('all')}
                >
                  <span className="material-icons">event</span>
                  All Time
                </button>
                <button
                  className={`dashboard-date-dropdown-item ${quickDateRange === 'today' ? 'active' : ''}`}
                  onClick={() => handleDateRangeSelect('today')}
                >
                  <span className="material-icons">today</span>
                  Today
                </button>
                <button
                  className={`dashboard-date-dropdown-item ${quickDateRange === 'week' ? 'active' : ''}`}
                  onClick={() => handleDateRangeSelect('week')}
                >
                  <span className="material-icons">date_range</span>
                  This Week
                </button>
                <button
                  className={`dashboard-date-dropdown-item ${quickDateRange === 'month' ? 'active' : ''}`}
                  onClick={() => handleDateRangeSelect('month')}
                >
                  <span className="material-icons">calendar_month</span>
                  This Month
                </button>
                <button
                  className="dashboard-date-dropdown-item"
                  onClick={() => handleDateRangeSelect('custom')}
                >
                  <span className="material-icons">tune</span>
                  Custom Range
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">pending_actions</span>
          </div>
          <div className="stat-content">
            <p className="stat-label">Requested</p>
            <p className="stat-value">{stats.requested.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">check_circle</span>
          </div>
          <div className="stat-content">
            <p className="stat-label">Successful</p>
            <p className="stat-value">{stats.successful.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">error</span>
          </div>
          <div className="stat-content">
            <p className="stat-label">Failures</p>
            <p className="stat-value">{stats.failures.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Calendar Modal */}
      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        onSelect={(start, end) => {
          const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
          setDateRange({ start: startDate, end: endDate });
          setQuickDateRange('all');
        }}
        initialStartDate={dateRange?.start}
        initialEndDate={dateRange?.end}
      />
    </>
  );
}
