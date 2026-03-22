import { describe, it, expect } from 'vitest'
import { submitFeedbackSchema, analyticsQuerySchema, timeseriesQuerySchema } from '@/lib/validators/feedback'

describe('submitFeedbackSchema', () => {
  it('should accept valid input with all fields provided correctly', () => {
    const result = submitFeedbackSchema.safeParse({
      type: 'BUG',
      content: '위젯 버튼이 클릭되지 않습니다.',
      nickname: 'testuser',
    })
    expect(result.success).toBe(true)
  })

  it('should accept valid input when type is FEATURE', () => {
    const result = submitFeedbackSchema.safeParse({
      type: 'FEATURE',
      content: '다크모드를 추가해주세요.',
      nickname: 'alice',
    })
    expect(result.success).toBe(true)
  })

  it('should accept valid input when type is GENERAL', () => {
    const result = submitFeedbackSchema.safeParse({
      type: 'GENERAL',
      content: '사용 방법이 궁금합니다.',
      nickname: 'bob',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid type not in enum', () => {
    const result = submitFeedbackSchema.safeParse({
      type: 'UNKNOWN',
      content: '테스트 내용입니다.',
      nickname: 'testuser',
    })
    expect(result.success).toBe(false)
  })

  it('should reject empty content', () => {
    const result = submitFeedbackSchema.safeParse({
      type: 'BUG',
      content: '',
      nickname: 'testuser',
    })
    expect(result.success).toBe(false)
  })

  it('should reject content exceeding 5000 characters', () => {
    const result = submitFeedbackSchema.safeParse({
      type: 'BUG',
      content: 'a'.repeat(5001),
      nickname: 'testuser',
    })
    expect(result.success).toBe(false)
  })

  it('should reject empty nickname', () => {
    const result = submitFeedbackSchema.safeParse({
      type: 'BUG',
      content: '테스트 내용입니다.',
      nickname: '',
    })
    expect(result.success).toBe(false)
  })

  it('should reject nickname exceeding 100 characters', () => {
    const result = submitFeedbackSchema.safeParse({
      type: 'BUG',
      content: '테스트 내용입니다.',
      nickname: 'a'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('should trim whitespace from content', () => {
    const result = submitFeedbackSchema.safeParse({
      type: 'BUG',
      content: '  앞뒤 공백  ',
      nickname: 'testuser',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.content).toBe('앞뒤 공백')
  })

  it('should trim whitespace from nickname', () => {
    const result = submitFeedbackSchema.safeParse({
      type: 'BUG',
      content: '테스트 내용입니다.',
      nickname: '  alice  ',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.nickname).toBe('alice')
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
