"use client";

import { useState, useEffect, useRef } from 'react';
import { getBusinessCentersGraphData, type GraphDataPoint } from '../../actions/graph-data';

type TimePeriod = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export default function GraphSection() {
  const [activePeriod, setActivePeriod] = useState<TimePeriod>('today');
  const [graphData, setGraphData] = useState<GraphDataPoint[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const fetchGraphData = async (period: TimePeriod, start?: Date, end?: Date) => {
    setIsLoading(true);
    try {
      const result = await getBusinessCentersGraphData(period, start, end);
      if (result.success && result.data) {
        setGraphData(result.data.data);
        setTotal(result.data.total);
      } else {
        setGraphData([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('Failed to fetch graph data:', error);
      setGraphData([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activePeriod === 'custom' && customStartDate && customEndDate) {
      fetchGraphData('custom', new Date(customStartDate), new Date(customEndDate));
    } else if (activePeriod !== 'custom') {
      fetchGraphData(activePeriod);
    }
  }, [activePeriod, customStartDate, customEndDate]);

  const handlePeriodChange = (period: TimePeriod) => {
    setActivePeriod(period);
    if (period === 'custom') {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
      fetchGraphData(period);
    }
  };

  const handleCustomDateSubmit = () => {
    if (customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      if (start <= end) {
        fetchGraphData('custom', start, end);
        setShowCustomPicker(false);
      }
    }
  };

  // Calculate graph dimensions and draw smooth line
  const drawGraph = () => {
    if (!svgRef.current || graphData.length === 0) return;

    const svg = svgRef.current;
    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 300;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Clear previous content
    svg.innerHTML = '';

    // Find max value for scaling
    const maxCount = Math.max(...graphData.map(d => d.count), 1);
    const yScale = graphHeight / maxCount;

    // Calculate points
    const points: Array<{ x: number; y: number }> = [];

    graphData.forEach((point, index) => {
      const x = padding.left + (index / (graphData.length - 1 || 1)) * graphWidth;
      const y = padding.top + graphHeight - (point.count * yScale);
      points.push({ x, y });
    });

    // Generate smooth path using cubic bezier curves (Catmull-Rom style)
    let path = '';
    if (points.length > 0) {
      if (points.length === 1) {
        // Single point - just a dot
        path = '';
      } else if (points.length === 2) {
        // Two points - straight line
        path = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
      } else {
        // Multiple points - smooth curve using cubic bezier
        path = `M ${points[0].x} ${points[0].y}`;
        
        for (let i = 0; i < points.length - 1; i++) {
          const p0 = i > 0 ? points[i - 1] : points[i];
          const p1 = points[i];
          const p2 = points[i + 1];
          const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];
          
          // Calculate control points for smooth curve (Catmull-Rom to Bezier conversion)
          const tension = 0.5;
          const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
          const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
          const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
          const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;
          
          path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }
      }
    }

    // Create gradient for the line
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'lineGradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '0%');
    gradient.setAttribute('y2', '100%');
    
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#d4af37');
    stop1.setAttribute('stop-opacity', '1');
    
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#d4af37');
    stop2.setAttribute('stop-opacity', '0.6');
    
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.appendChild(defs);

    // Draw area under curve
    if (path && points.length > 1) {
      const areaPath = path + ` L ${points[points.length - 1].x} ${padding.top + graphHeight} L ${points[0].x} ${padding.top + graphHeight} Z`;
      const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      area.setAttribute('d', areaPath);
      area.setAttribute('fill', 'url(#lineGradient)');
      area.setAttribute('opacity', '0.2');
      svg.appendChild(area);
    }

    // Draw line
    if (path) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      line.setAttribute('d', path);
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', '#d4af37');
      line.setAttribute('stroke-width', '2.5');
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(line);
    }

    // Draw points
    points.forEach((point, index) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', point.x.toString());
      circle.setAttribute('cy', point.y.toString());
      circle.setAttribute('r', '4');
      circle.setAttribute('fill', '#d4af37');
      circle.setAttribute('stroke', '#0a0a0a');
      circle.setAttribute('stroke-width', '2');
      svg.appendChild(circle);
    });

    // Draw Y-axis labels
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const value = Math.round((maxCount / ySteps) * i);
      const y = padding.top + graphHeight - (i / ySteps) * graphHeight;
      
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', padding.left.toString());
      line.setAttribute('y1', y.toString());
      line.setAttribute('x2', (padding.left + graphWidth).toString());
      line.setAttribute('y2', y.toString());
      line.setAttribute('stroke', 'rgba(255, 255, 255, 0.1)');
      line.setAttribute('stroke-width', '1');
      svg.appendChild(line);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', (padding.left - 10).toString());
      text.setAttribute('y', (y + 4).toString());
      text.setAttribute('fill', 'rgba(255, 255, 255, 0.5)');
      text.setAttribute('font-size', '12');
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('font-family', 'var(--font-poppins)');
      text.textContent = value.toString();
      svg.appendChild(text);
    }

    // Draw X-axis labels
    const labelStep = Math.max(1, Math.floor(graphData.length / 8));
    graphData.forEach((point, index) => {
      if (index % labelStep === 0 || index === graphData.length - 1) {
        const x = padding.left + (index / (graphData.length - 1 || 1)) * graphWidth;
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x.toString());
        text.setAttribute('y', (height - padding.bottom + 20).toString());
        text.setAttribute('fill', 'rgba(255, 255, 255, 0.6)');
        text.setAttribute('font-size', '11');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-family', 'var(--font-poppins)');
        text.textContent = point.label;
        svg.appendChild(text);
      }
    });
  };

  useEffect(() => {
    if (graphData.length > 0) {
      // Small delay to ensure SVG is rendered
      const timer = setTimeout(drawGraph, 100);
      return () => clearTimeout(timer);
    }
  }, [graphData]);

  // Handle window resize
  useEffect(() => {
    if (graphData.length > 0) {
      const handleResize = () => {
        drawGraph();
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [graphData]);

  return (
    <div className="dashboard-graph-section">
      <div className="graph-header">
        <div>
          <h2 className="graph-title">Business Centers</h2>
          {total > 0 && (
            <p className="graph-subtitle">{total} total in selected period</p>
          )}
        </div>
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

      {showCustomPicker && (
        <div className="custom-date-picker">
          <div className="date-picker-group">
            <label>Start Date</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              max={customEndDate || new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="date-picker-group">
            <label>End Date</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              min={customStartDate}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          <button
            className="apply-date-btn"
            onClick={handleCustomDateSubmit}
            disabled={!customStartDate || !customEndDate}
          >
            Apply
          </button>
          <button
            className="cancel-date-btn"
            onClick={() => {
              setShowCustomPicker(false);
              setCustomStartDate('');
              setCustomEndDate('');
            }}
          >
            Cancel
          </button>
        </div>
      )}

      <div className="graph-container">
        {isLoading ? (
          <div className="graph-placeholder">
            <span className="material-icons spinning">sync</span>
            <p>Loading chart data...</p>
          </div>
        ) : graphData.length === 0 ? (
          <div className="graph-placeholder">
            <span className="material-icons">show_chart</span>
            <p>No data available for this period</p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            className="graph-svg"
            viewBox="0 0 800 300"
            preserveAspectRatio="xMidYMid meet"
          />
        )}
      </div>
    </div>
  );
}
