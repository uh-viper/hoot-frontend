import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

// Extend dayjs with plugins
dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * Gets the user's local timezone from their browser/device
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Converts a local date to UTC for database queries
 * Takes a Date object representing a local date and converts it to UTC
 * 
 * @param localDate - Date object in local timezone
 * @param timeOfDay - 'start' for 00:00:00 or 'end' for 23:59:59
 * @param timezone - Optional timezone, defaults to user's detected timezone
 * @returns Date object in UTC
 * 
 * @example
 * // User in EST selects Jan 13
 * const utcDate = localDateToUTC(new Date(2026, 0, 13), 'start')
 * // Returns: Date representing Jan 13 05:00 UTC (Jan 13 00:00 EST)
 */
export function localDateToUTC(
  localDate: Date,
  timeOfDay: 'start' | 'end' = 'start',
  timezone?: string
): Date {
  const tz = timezone || getUserTimezone()
  
  // Extract local date components
  const year = localDate.getFullYear()
  const month = localDate.getMonth()
  const day = localDate.getDate()
  
  // Create date string in format YYYY-MM-DD HH:mm:ss
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const timeStr = timeOfDay === 'start' ? '00:00:00' : '23:59:59'
  
  // Create dayjs date in user's timezone, then convert to UTC
  const localDayjs = dayjs.tz(`${dateStr} ${timeStr}`, tz)
  return localDayjs.utc().toDate()
}

/**
 * Converts a date range from local time to UTC for database queries
 * 
 * @param startDate - Start date in local timezone
 * @param endDate - End date in local timezone
 * @param timezone - Optional timezone, defaults to user's detected timezone
 * @returns Object with start and end dates in UTC
 * 
 * @example
 * // User in EST selects Jan 13 (today)
 * const range = localDateRangeToUTC(startDate, endDate)
 * // Returns: { start: Jan 13 05:00 UTC, end: Jan 14 04:59 UTC }
 */
export function localDateRangeToUTC(
  startDate: Date,
  endDate: Date,
  timezone?: string
): { start: Date; end: Date } {
  return {
    start: localDateToUTC(startDate, 'start', timezone),
    end: localDateToUTC(endDate, 'end', timezone),
  }
}

/**
 * Formats a UTC date from the database to local time for display
 * 
 * @param utcDateString - ISO date string from database (UTC)
 * @param format - Optional dayjs format string, defaults to 'MMM D, YYYY, h:mm A'
 * @returns Formatted date string in local timezone
 * 
 * @example
 * formatUTCDateToLocal('2026-01-13T02:37:49.879985+00')
 * // Returns: "Jan 12, 2026, 9:37 PM" (if user is in EST)
 */
export function formatUTCDateToLocal(
  utcDateString: string,
  format: string = 'MMM D, YYYY, h:mm A'
): string {
  return dayjs.utc(utcDateString).local().format(format)
}

/**
 * Gets the start and end of today in local timezone
 * 
 * @param timezone - Optional timezone, defaults to user's detected timezone
 * @returns Object with start and end of today in local time
 */
export function getTodayLocalRange(timezone?: string): { start: Date; end: Date } {
  const tz = timezone || getUserTimezone()
  const now = dayjs().tz(tz)
  
  return {
    start: now.startOf('day').toDate(),
    end: now.endOf('day').toDate(),
  }
}

/**
 * Gets the start and end of a date range in local timezone
 * 
 * @param range - 'today' | 'week' | 'month'
 * @param timezone - Optional timezone, defaults to user's detected timezone
 * @returns Object with start and end dates in local time
 */
export function getLocalDateRange(
  range: 'today' | 'week' | 'month',
  timezone?: string
): { start: Date; end: Date } {
  const tz = timezone || getUserTimezone()
  const now = dayjs().tz(tz)
  
  switch (range) {
    case 'today':
      return {
        start: now.startOf('day').toDate(),
        end: now.endOf('day').toDate(),
      }
    case 'week':
      return {
        start: now.subtract(6, 'day').startOf('day').toDate(),
        end: now.endOf('day').toDate(),
      }
    case 'month':
      return {
        start: now.startOf('month').startOf('day').toDate(),
        end: now.endOf('day').toDate(),
      }
  }
}

/**
 * Formats a date range for display
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @param format - Optional dayjs format string, defaults to 'MMM D, YYYY'
 * @returns Formatted date range string
 * 
 * @example
 * formatDateRange(startDate, endDate)
 * // Returns: "Jan 13, 2026" (if same day) or "Jan 13, 2026 - Jan 15, 2026"
 */
export function formatDateRange(
  startDate: Date,
  endDate: Date,
  format: string = 'MMM D, YYYY'
): string {
  const start = dayjs(startDate)
  const end = dayjs(endDate)
  
  const startStr = start.format(format)
  const endStr = end.format(format)
  
  // If same day, just show one date
  if (start.isSame(end, 'day')) {
    return startStr
  }
  
  return `${startStr} - ${endStr}`
}
