import type { FeedbackType, FormData } from './state';

export interface FeedbackSubmitPayload {
  readonly type: FeedbackType;
  readonly title: string;
  readonly description: string;
  readonly nickname: string;
  readonly email?: string;
}

export interface FeedbackSubmitResult {
  readonly trackingId: string;
  readonly status: string;
}

export interface ApiError {
  readonly message: string;
  readonly statusCode: number;
}

export async function submitFeedback(
  apiUrl: string,
  type: FeedbackType,
  formData: FormData
): Promise<FeedbackSubmitResult> {
  const email = formData.email.trim();
  const payload: FeedbackSubmitPayload = {
    type,
    title: formData.title.trim(),
    description: formData.description.trim(),
    nickname: formData.nickname.trim(),
    ...(email ? { email } : {}),
  };

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/v1/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    const netErr: ApiError = {
      message: 'Network error. Please check your connection.',
      statusCode: 0,
    };
    throw netErr;
  }

  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.success) {
    const message = json?.error ?? `Request failed (HTTP ${response.status})`;
    const err: ApiError = { message, statusCode: response.status };
    throw err;
  }

  return {
    trackingId: json.data.trackingId,
    status: json.data.status,
  };
}
