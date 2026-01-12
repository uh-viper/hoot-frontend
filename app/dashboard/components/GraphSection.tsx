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
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; data: GraphDataPoint } | null>(null);
  const [crosshairX, setCrosshairX] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const width = containerWidth || 800;
    const height = 350;
    const padding = { top: 30, right: 30, bottom: 50, left: 60 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Set SVG dimensions
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Clear previous content
    svg.innerHTML = '';

    // Find max value for scaling (min is always 0)
    const maxCount = Math.max(...graphData.map(d => d.count), 1);
    const yScale = graphHeight / maxCount;

    // Calculate points (ensure Y never goes below baseline)
    const points: Array<{ x: number; y: number }> = [];
    const baselineY = padding.top + graphHeight; // Bottom of graph (Y = 0)

    graphData.forEach((point, index) => {
      const x = padding.left + (index / (graphData.length - 1 || 1)) * graphWidth;
      // Calculate Y position, ensuring it never goes below baseline
      const calculatedY = padding.top + graphHeight - (point.count * yScale);
      const y = Math.max(calculatedY, baselineY); // Clamp to baseline or above
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

    // Draw area under curve (ensure it doesn't go below baseline)
    if (path && points.length > 1) {
      const baselineY = padding.top + graphHeight;
      // Ensure all points in the area path are at or above baseline
      let areaPath = path;
      // Close the area by going to baseline
      areaPath += ` L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;
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

    // Draw Y-axis labels (always start from 0)
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

    // Draw X-axis labels with better formatting
    const labelStep = Math.max(1, Math.floor(graphData.length / 10));
    graphData.forEach((point, index) => {
      if (index % labelStep === 0 || index === graphData.length - 1) {
        const x = padding.left + (index / (graphData.length - 1 || 1)) * graphWidth;
        
        // Draw tick mark
        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tick.setAttribute('x1', x.toString());
        tick.setAttribute('y1', (padding.top + graphHeight).toString());
        tick.setAttribute('x2', x.toString());
        tick.setAttribute('y2', (padding.top + graphHeight + 5).toString());
        tick.setAttribute('stroke', 'rgba(255, 255, 255, 0.3)');
        tick.setAttribute('stroke-width', '1');
        svg.appendChild(tick);
        
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

    // Add invisible hover area for the entire graph
    const hoverArea = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    hoverArea.setAttribute('x', padding.left.toString());
    hoverArea.setAttribute('y', padding.top.toString());
    hoverArea.setAttribute('width', graphWidth.toString());
    hoverArea.setAttribute('height', graphHeight.toString());
    hoverArea.setAttribute('fill', 'transparent');
    hoverArea.setAttribute('cursor', 'crosshair');
    hoverArea.style.pointerEvents = 'all';
    
    hoverArea.addEventListener('mousemove', (e) => {
      const rect = svg.getBoundingClientRect();
      const svgX = e.clientX - rect.left;
      
      // Find the closest data point
      let closestIndex = 0;
      let minDistance = Math.abs(points[0].x - svgX);
      
      points.forEach((point, index) => {
        const distance = Math.abs(point.x - svgX);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });
      
      const closestPoint = points[closestIndex];
      const containerRect = containerRef.current?.getBoundingClientRect();
      
      if (containerRect) {
        const actualX = (closestPoint.x / width) * containerRect.width;
        setCrosshairX(closestPoint.x);
        setHoveredPoint({
          x: containerRect.left + actualX,
          y: containerRect.top + closestPoint.y - 40,
          data: graphData[closestIndex]
        });
      }
    });
    
    hoverArea.addEventListener('mouseleave', () => {
      setHoveredPoint(null);
      setCrosshairX(null);
    });
    
    svg.appendChild(hoverArea);
  };
  
  // Draw crosshair separately when crosshairX changes
  useEffect(() => {
    if (!svgRef.current || crosshairX === null || graphData.length === 0) return;
    
    const svg = svgRef.current;
    const padding = { top: 30, right: 30, bottom: 50, left: 60 };
    const height = 350;
    const container = containerRef.current;
    if (!container) return;
    
    const containerWidth = container.clientWidth;
    const width = containerWidth || 800;
    const graphHeight = height - padding.top - padding.bottom;
    
    // Remove existing crosshair
    const existingCrosshair = svg.querySelector('.crosshair-line');
    if (existingCrosshair) {
      existingCrosshair.remove();
    }
    
    // Draw new crosshair
    const crosshair = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    crosshair.setAttribute('class', 'crosshair-line');
    crosshair.setAttribute('x1', crosshairX.toString());
    crosshair.setAttribute('y1', padding.top.toString());
    crosshair.setAttribute('x2', crosshairX.toString());
    crosshair.setAttribute('y2', (padding.top + graphHeight).toString());
    crosshair.setAttribute('stroke', 'rgba(212, 175, 55, 0.6)');
    crosshair.setAttribute('stroke-width', '1.5');
    crosshair.setAttribute('stroke-dasharray', '4,4');
    crosshair.setAttribute('pointer-events', 'none');
    svg.appendChild(crosshair);
    
    return () => {
      const crosshairToRemove = svg.querySelector('.crosshair-line');
      if (crosshairToRemove) {
        crosshairToRemove.remove();
      }
    };
  }, [crosshairX, graphData]);

  useEffect(() => {
    if (graphData.length > 0) {
      // Small delay to ensure SVG is rendered
      const timer = setTimeout(() => {
        drawGraph();
      }, 100);
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

      <div className="graph-container" ref={containerRef}>
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
          <>
            <svg
              ref={svgRef}
              className="graph-svg"
              style={{ width: '100%', height: '350px' }}
            />
            {hoveredPoint && (
              <div
                className="graph-tooltip"
                style={{
                  position: 'fixed',
                  left: `${hoveredPoint.x}px`,
                  top: `${hoveredPoint.y}px`,
                  transform: 'translateX(-50%)',
                  pointerEvents: 'none',
                  zIndex: 1000,
                }}
              >
                <div className="tooltip-content">
                  <div className="tooltip-value">{hoveredPoint.data.count} BCs</div>
                  <div className="tooltip-time">{hoveredPoint.data.label}</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
