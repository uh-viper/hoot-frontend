import { NextRequest } from 'next/server'

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated service
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60 // 60 requests per minute

export function rateLimit(request: NextRequest): { success: boolean; message?: string } {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetAt) {
    // New window
    rateLimitMap.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW
    })
    return { success: true }
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      success: false,
      message: 'Rate limit exceeded. Please try again later.'
    }
  }

  record.count++
  return { success: true }
}
