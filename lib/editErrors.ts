/**
 * Maps raw pipeline/worker/network failures to safe user-facing messages.
 * Pure function with no dependencies, so every branch is unit-verifiable.
 * Never surfaces tokens, signed URLs, stack traces, or account internals.
 */

export type EditErrorKind =
  | 'billing'
  | 'auth'
  | 'rate_limited'
  | 'timeout'
  | 'network'
  | 'bad_input'
  | 'server'
  | 'unknown';

export function classifyEditError(err: unknown): { kind: EditErrorKind; userMessage: string } {
  const text =
    err instanceof Error ? `${err.message} ${(err as { cause?: unknown }).cause ?? ''}` : String(err ?? '');

  if (/insufficient credit|402|payment required|billing/i.test(text)) {
    return {
      kind: 'billing',
      userMessage:
        'AI editing is temporarily unavailable because the image-processing service has insufficient credit. Please try again later.',
    };
  }
  if (
    /401|403|unauthorized|forbidden|sign-in|signed in|not your edit job|invalid.*token|jwt|session|account/i.test(
      text
    )
  ) {
    return {
      kind: 'auth',
      userMessage: 'We could not verify your account. Check your connection and try again.',
    };
  }
  if (/429|rate.?limit|throttl/i.test(text)) {
    return {
      kind: 'rate_limited',
      userMessage: 'The AI service is busy. Wait about a minute, then tap Retry.',
    };
  }
  if (/timed out|taking too long/i.test(text)) {
    return {
      kind: 'timeout',
      userMessage: 'The edit took too long. Check your connection and tap Retry.',
    };
  }
  if (
    /network|fetch failed|failed to fetch|unreachable|connection|offline|load failed|CORS|preflight|DNS|socket|abort|upload failed/i.test(
      text
    )
  ) {
    return {
      kind: 'network',
      userMessage: 'Connection problem. Check your internet and tap Retry.',
    };
  }
  if (/could not read the photo|photo dimensions|invalid image|bad model slug|no image/i.test(text)) {
    return {
      kind: 'bad_input',
      userMessage: 'That photo could not be read. Try a different one.',
    };
  }
  if (/500|502|503|504|server error|service|internal error|unavailable/i.test(text)) {
    return {
      kind: 'server',
      userMessage: 'The editing service had a problem. Please try again in a bit.',
    };
  }
  return { kind: 'unknown', userMessage: 'Edit failed. Try again.' };
}
