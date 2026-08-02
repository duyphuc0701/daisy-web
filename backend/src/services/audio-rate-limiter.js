function createAudioRateLimiter({
  maxStarts = Number(process.env.AUDIO_STREAM_RATE_LIMIT_MAX || 30),
  windowMs = Number(process.env.AUDIO_STREAM_RATE_LIMIT_WINDOW_MS || 60000),
  maxConcurrent = Number(
    process.env.AUDIO_MAX_CONCURRENT_STREAMS_PER_USER || 2,
  ),
} = {}) {
  const starts = new Map();
  const active = new Map();
  return {
    acquire({ userId, ip }) {
      const now = Date.now();
      const key = `${userId}:${ip || "unknown"}`;
      const recent = (starts.get(key) || []).filter(
        (time) => time > now - windowMs,
      );
      if (
        recent.length >= maxStarts ||
        (active.get(userId) || 0) >= maxConcurrent
      )
        return {
          allowed: false,
          retryAfter: Math.max(1, Math.ceil(windowMs / 1000)),
        };
      recent.push(now);
      starts.set(key, recent);
      active.set(userId, (active.get(userId) || 0) + 1);
      let released = false;
      return {
        allowed: true,
        release() {
          if (!released) {
            released = true;
            active.set(userId, Math.max(0, (active.get(userId) || 1) - 1));
          }
        },
      };
    },
  };
}
module.exports = createAudioRateLimiter;
