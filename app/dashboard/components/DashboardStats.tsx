"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DashboardStats() {
  const [stats, setStats] = useState({
    businessCenters: 0,
    requested: 0,
    successful: 0,
    failures: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Fetch user stats from database
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('requested, successful, failures')
        .eq('user_id', user.id)
        .single();

      // Business Centers = count of accounts in vault
      const { count: businessCentersCount } = await supabase
        .from('user_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setStats({
        businessCenters: businessCentersCount ?? 0,
        requested: statsData?.requested ?? 0,
        successful: statsData?.successful ?? 0,
        failures: statsData?.failures ?? 0,
      });
      setIsLoading(false);
    };

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
            event: 'UPDATE',
            schema: 'public',
            table: 'user_stats',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.new) {
              setStats(prev => ({
                ...prev,
                requested: payload.new.requested ?? prev.requested,
                successful: payload.new.successful ?? prev.successful,
                failures: payload.new.failures ?? prev.failures,
              }));
            }
          }
        )
        .subscribe();

      return { channel, supabase };
    };

    fetchStats();
    let realtimeSetup: Awaited<ReturnType<typeof setupRealtime>> | null = null;
    setupRealtime().then(setup => {
      realtimeSetup = setup;
    });

    // Also listen for custom event when job completes
    const handleStatsUpdate = () => {
      fetchStats();
    };
    
    window.addEventListener('stats-updated', handleStatsUpdate);

    return () => {
      if (realtimeSetup) {
        realtimeSetup.supabase.removeChannel(realtimeSetup.channel);
      }
      window.removeEventListener('stats-updated', handleStatsUpdate);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="dashboard-stats">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon">
              <span className="material-icons">account_balance</span>
            </div>
            <div className="stat-content">
              <p className="stat-label">Loading...</p>
              <p className="stat-value">-</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="dashboard-stats">
      <div className="stat-card">
        <div className="stat-icon">
          <span className="material-icons">account_balance</span>
        </div>
        <div className="stat-content">
          <p className="stat-label">Business Centers</p>
          <p className="stat-value">{stats.businessCenters.toLocaleString()}</p>
        </div>
      </div>

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
  );
}
