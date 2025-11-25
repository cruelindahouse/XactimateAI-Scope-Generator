/**
 * Singleton Rate Limiter
 * Ensures API calls do not exceed strict RPM limits.
 * Gemini Flash Limit safe zone: ~15 RPM (1 request every 4 seconds).
 */

class RateLimiter {
  private static instance: RateLimiter;
  private queue: Array<{
    task: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  }> = [];
  private isProcessing = false;
  private lastCallTime = 0;
  
  // 4000ms delay = 15 calls per minute max.
  // This is conservative to strictly avoid 429s.
  private readonly DELAY_MS = 4000;

  private constructor() {}

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  public async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastCall = now - this.lastCallTime;
      
      if (timeSinceLastCall < this.DELAY_MS) {
        await new Promise(r => setTimeout(r, this.DELAY_MS - timeSinceLastCall));
      }

      const item = this.queue.shift();
      if (item) {
        try {
          this.lastCallTime = Date.now();
          const result = await item.task();
          item.resolve(result);
        } catch (error) {
          item.reject(error);
        }
      }
    }

    this.isProcessing = false;
  }
}

export const rateLimiter = RateLimiter.getInstance();