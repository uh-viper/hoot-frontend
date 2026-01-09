"use client";

import { useState } from 'react';

type TimePeriod = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export default function GraphSection() {
  const [activePeriod, setActivePeriod] = useState<TimePeriod>('today');

  const handlePeriodChange = (period: TimePeriod) => {
    setActivePeriod(period);
    // TODO: Fetch graph data based on period
  };

  return (
    <div className="dashboard-graph-section">
      <div className="graph-header">
        <h2 className="graph-title">Business Centers</h2>
        <div className="time-selector">
          <button 
            className={`time-btn ${activePeriod === 'today' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('today')}
          >
            Today
          </button>
          <button 
            className={`time-btn ${activePeriod === 'yesterday' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('yesterday')}
          >
            Yesterday
          </button>
          <button 
            className={`time-btn ${activePeriod === 'week' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('week')}
          >
            This Week
          </button>
          <button 
            className={`time-btn ${activePeriod === 'month' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('month')}
          >
            This Month
          </button>
          <button 
            className={`time-btn ${activePeriod === 'custom' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('custom')}
            aria-label="Custom date range"
          >
            <span className="material-icons">calendar_today</span>
          </button>
        </div>
      </div>
      <div className="graph-container">
        <div className="graph-placeholder">
          <span className="material-icons">show_chart</span>
          <p>Chart will appear here</p>
        </div>
      </div>
    </div>
  );
}
