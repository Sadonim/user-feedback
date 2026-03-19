FEATURE: aider_validation_test
AGENT: TESTER
PHASE: validation

## Task: Write unit tests for feedback validators

Write a new unit test file for two Zod schemas that currently have no dedicated tests:
- `submitFeedbackSchema`
- `analyticsQuerySchema` and `timeseriesQuerySchema`

### Target file to create
`src/__tests__/unit/validators-feedback-submit.test.ts`

### Source file
`src/lib/validators/feedback.ts`

### Test requirements

#### submitFeedbackSchema
- Valid input: all fields provided correctly
- Valid input: email is optional (omit it)
- Valid input: email as empty string is allowed
- Invalid: type not in enum (e.g. "UNKNOWN")
- Invalid: title empty string
- Invalid: title exceeds 200 chars
- Invalid: description shorter than 10 chars
- Invalid: description exceeds 5000 chars
- Invalid: nickname empty string
- Invalid: email is invalid format (e.g. "not-an-email")

#### analyticsQuerySchema
- Default values: period defaults to "30d", granularity defaults to "day"
- Valid: period "7d", "30d", "90d"
- Invalid: period not in enum
- Invalid: granularity not in enum

#### timeseriesQuerySchema
- Default: days defaults to 30
- Valid: days 7, 14, 30, 90
- Invalid: days value not in allowed list (e.g. 15)
- Valid: type filter optional

### Test style
Follow the same pattern as `src/__tests__/unit/validators-phase2.test.ts`:
- Use vitest (import from 'vitest')
- Use describe/it blocks
- Use .safeParse() and check result.success
- Import from '@/lib/validators/feedback'
- Write tests in English

### Done signal
After writing the test file, create:
`docs/handoffs/signals/TESTER_aider_validation_test.done`

Content:
```
FEATURE: aider_validation_test
AGENT: TESTER
STATUS: DONE
SUMMARY: unit tests written for submitFeedbackSchema, analyticsQuerySchema, timeseriesQuerySchema
```
