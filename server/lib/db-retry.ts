function isRetryableDbError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Can't reach database server") ||
    msg.includes('P1001') ||
    msg.includes('P1002') ||
    msg.includes('Connection timed out') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('socket hang up')
  );
}

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  attempts = 5,
  baseDelayMs = 600,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryableDbError(err) || attempt === attempts - 1) {
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, baseDelayMs * (attempt + 1)));
    }
  }
  throw lastError;
}
