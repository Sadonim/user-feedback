import { describe, it, expect } from 'vitest'
import { submitFeedbackSchema, analyticsQuerySchema, timeseriesQuerySchema } from '@/lib/validators/feedback'

describe('submitFeedbackSchema', () => {
  it('should accept valid input with all fields provided correctly', () => {
    const result = submitFeedbackSchema.safeParse({
      type: 'BUG',
      title: 'Test bug',
      description: 'This is a test bug description',
      nickname: 'testuser',
      email: 'test@example.com'
    })
    expect(result.success).toBe(true)
  })

  it('should accept valid input when email is omitted', () => {
    const result = submitFeedbackSchema.safeParse({
      type: 'BUG',
      title: 'Test bug',
      description: 'This is a test bug description',
      nickname: 'testuser'
    })
    expect(result.success).toBe(true)
  })

  it('should accept valid input when email is empty string', () => {
    const result = submitFeedbackSchema.safeParse({
      type: 'BUG',
      title: 'Test bug',
      description: 'This is a test bug description',
      nickname: 'testuser',
      email: ''
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid type not in enum', () => {
    const result = submitFeedbackSchema.safeParse({
      type: 'UNKNOWN',
      title: 'Test bug',
      description: 'This is a test bug description',
      nickname: 'testuser'
    })
    expect(result.success).toBe(false)
  })

  it('should reject empty title', () => {
    const result = submitFeedbackSchema.safeParse({
      type: 'BUG',
      title: '',
      description: 'This is a test bug description',
      nickname: 'testuser'
    })
    expect(result.success).toBe(false)
  })

  it('should reject title exceeding 200 characters', () => {
    const result = submitFeedbackSchema.safeParse({
      type: 'BUG',
      title: 'a'.repeat(201),
      description: 'This is a test bug description',
      nickname: 'testuser'
    })
    expect(result.success).toBe(false)
  })

  it('should reject description shorter than 10 characters', () => {
    const result = submitFeedbackSchema.safeParse({
      type: 'BUG',
      title: 'Test bug',
      description: 'Short',
      nickname: 'testuser'
    })
    expect(result.success).toBe(false)
  })

  it('should reject description exceeding 5000 characters', () => {
    const result = submitFeedbackSchema.safeParse({
      type: 'BUG',
      title: 'Test bug',
      description: 'a'.repeat(5001),
      nickname: 'testuser'
    })
    expect(result.success).toBe(false)
  })

  it('should reject empty nickname', () => {
    const result = submitFeedbackSchema.safeParse({
      type: 'BUG',
      title: 'Test bug',
      description: 'This is a test bug description',
      nickname: ''
    })
    expect(result.success).toBe(false)
  })

  it('should reject invalid email format', () => {
    const result = submitFeedbackSchema.safeParse({
      type: 'BUG',
      title: 'Test bug',
      description: 'This is a test bug description',
      nickname: 'testuser',
      email: 'not-an-email'
    })
    expect(result.success).toBe(false)
  })
})

describe('analyticsQuerySchema', () => {
  it('should use default values for period and granularity', () => {
    const result = analyticsQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    expect(result.data.period).toBe('30d')
    expect(result.data.granularity).toBe('day')
  })

  it('should accept valid period "7d"', () => {
    const result = analyticsQuerySchema.safeParse({
      period: '7d'
    })
    expect(result.success).toBe(true)
  })

  it('should accept valid period "30d"', () => {
    const result = analyticsQuerySchema.safeParse({
      period: '30d'
    })
    expect(result.success).toBe(true)
  })

  it('should accept valid period "90d"', () => {
    const result = analyticsQuerySchema.safeParse({
      period: '90d'
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid period not in enum', () => {
    const result = analyticsQuerySchema.safeParse({
      period: '180d'
    })
    expect(result.success).toBe(false)
  })

  it('should reject invalid granularity not in enum', () => {
    const result = analyticsQuerySchema.safeParse({
      granularity: 'month'
    })
    expect(result.success).toBe(false)
  })
})

describe('timeseriesQuerySchema', () => {
  it('should use default value for days', () => {
    const result = timeseriesQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    expect(result.data.days).toBe(30)
  })

  it('should accept valid days value 7', () => {
    const result = timeseriesQuerySchema.safeParse({
      days: 7
    })
    expect(result.success).toBe(true)
  })

  it('should accept valid days value 14', () => {
    const result = timeseriesQuerySchema.safeParse({
      days: 14
    })
    expect(result.success).toBe(true)
  })

  it('should accept valid days value 30', () => {
    const result = timeseriesQuerySchema.safeParse({
      days: 30
    })
    expect(result.success).toBe(true)
  })

  it('should accept valid days value 90', () => {
    const result = timeseriesQuerySchema.safeParse({
      days: 90
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid days value not in allowed list', () => {
    const result = timeseriesQuerySchema.safeParse({
      days: 15
    })
    expect(result.success).toBe(false)
  })

  it('should accept optional type filter', () => {
    const result = timeseriesQuerySchema.safeParse({
      type: 'BUG'
    })
    expect(result.success).toBe(true)
  })
})
