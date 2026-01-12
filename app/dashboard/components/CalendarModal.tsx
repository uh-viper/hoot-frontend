"use client";

import { useState, useEffect } from 'react';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (startDate: Date, endDate: Date) => void;
  initialStartDate?: Date;
  initialEndDate?: Date;
}

export default function CalendarModal({ isOpen, onClose, onSelect, initialStartDate, initialEndDate }: CalendarModalProps) {
  const [selectedStart, setSelectedStart] = useState<Date | null>(initialStartDate || null);
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(initialEndDate || null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentMonth(initialStartDate || new Date());
      setSelectedStart(initialStartDate || null);
      setSelectedEnd(initialEndDate || null);
    }
  }, [isOpen, initialStartDate, initialEndDate]);

  if (!isOpen) return null;

  const today = new Date();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleDateClick = (date: Date) => {
    // Create new Date objects to avoid timezone issues
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (!selectedStart || (selectedStart && selectedEnd)) {
      // Start new selection
      setSelectedStart(normalizedDate);
      setSelectedEnd(null);
    } else if (selectedStart && !selectedEnd) {
      // Complete selection
      const normalizedStart = new Date(selectedStart.getFullYear(), selectedStart.getMonth(), selectedStart.getDate());
      if (normalizedDate < normalizedStart) {
        // If clicked date is before start, swap them
        setSelectedEnd(normalizedStart);
        setSelectedStart(normalizedDate);
      } else {
        setSelectedEnd(normalizedDate);
      }
    }
  };

  const handleDateDoubleClick = (date: Date) => {
    // Double click sets both start and end to the same date
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    setSelectedStart(normalizedDate);
    setSelectedEnd(normalizedDate);
  };

  const handleApply = () => {
    if (selectedStart && selectedEnd) {
      onSelect(selectedStart, selectedEnd);
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedStart(initialStartDate || null);
    setSelectedEnd(initialEndDate || null);
    onClose();
  };

  const isDateInRange = (date: Date) => {
    if (!selectedStart || !selectedEnd) return false;
    const dateStr = date.toDateString();
    const startStr = selectedStart.toDateString();
    const endStr = selectedEnd.toDateString();
    return dateStr >= startStr && dateStr <= endStr;
  };

  const isDateSelected = (date: Date) => {
    const dateStr = date.toDateString();
    return (selectedStart && dateStr === selectedStart.toDateString()) || 
           (selectedEnd && dateStr === selectedEnd.toDateString());
  };

  const isDateHovered = (date: Date) => {
    if (!selectedStart || selectedEnd || !hoveredDate) return false;
    const dateStr = date.toDateString();
    const startStr = selectedStart.toDateString();
    const hoverStr = hoveredDate.toDateString();
    return dateStr >= startStr && dateStr <= hoverStr;
  };

  const isDateDisabled = (date: Date) => {
    return date > today;
  };

  const renderCalendarDays = () => {
    const days = [];
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
    
    // Calculate how many days to show (full weeks)
    const totalDays = lastDayOfMonth.getDate();
    const firstDayWeekday = firstDayOfMonth.getDay();
    const weeksToShow = Math.ceil((totalDays + firstDayWeekday) / 7);
    const totalCells = weeksToShow * 7;

    for (let i = 0; i < totalCells; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
      
      // Only render dates from the current month
      if (!isCurrentMonth) {
        days.push(
          <div key={i} className="calendar-day-empty"></div>
        );
        continue;
      }
      
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = isDateSelected(date);
      const inRange = isDateInRange(date);
      const isHovered = isDateHovered(date);
      const disabled = isDateDisabled(date);

      days.push(
        <button
          key={i}
          type="button"
          className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${inRange ? 'in-range' : ''} ${isHovered ? 'hovered' : ''} ${disabled ? 'disabled' : ''}`}
          onClick={() => !disabled && handleDateClick(date)}
          onDoubleClick={() => !disabled && handleDateDoubleClick(date)}
          onMouseEnter={() => !disabled && !selectedEnd && selectedStart && setHoveredDate(date)}
          onMouseLeave={() => setHoveredDate(null)}
          disabled={disabled}
        >
          {date.getDate()}
        </button>
      );
    }

    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
    if (nextMonth <= today) {
      setCurrentMonth(nextMonth);
    }
  };

  return (
    <div className="calendar-modal-overlay" onClick={onClose}>
      <div className="calendar-modal" onClick={(e) => e.stopPropagation()}>
        <div className="calendar-modal-header">
          <h3>Select Date Range</h3>
          <button className="calendar-modal-close" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="calendar-container">
          <div className="calendar-nav">
            <button type="button" onClick={goToPreviousMonth} className="calendar-nav-btn">
              <span className="material-icons">chevron_left</span>
            </button>
            <h4 className="calendar-month-year">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h4>
            <button 
              type="button" 
              onClick={goToNextMonth} 
              className="calendar-nav-btn"
              disabled={new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1) > today}
            >
              <span className="material-icons">chevron_right</span>
            </button>
          </div>

          <div className="calendar-grid">
            {dayNames.map(day => (
              <div key={day} className="calendar-day-header">{day}</div>
            ))}
            {renderCalendarDays()}
          </div>

        </div>

        <div className="calendar-modal-footer">
          <button type="button" className="calendar-cancel-btn" onClick={handleCancel}>
            Cancel
          </button>
          <button 
            type="button" 
            className="calendar-apply-btn" 
            onClick={handleApply}
            disabled={!selectedStart || !selectedEnd}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
