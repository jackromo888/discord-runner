import Bottleneck from "bottleneck";
import logger from "./logger";

class Limiters {
  private manageRoleLimiters: Map<string, Bottleneck> = new Map();

  getManageRoleLimiter(serverId: string) {
    let limiter = this.manageRoleLimiters.get(serverId);
    if (limiter) return limiter;

    limiter = new Bottleneck({
      reservoir: 4,
      reservoirRefreshAmount: 4,
      reservoirRefreshInterval: 10 * 1000,
      maxConcurrent: 4,
    });

    limiter.on("depleted", () => {
      const queued = limiter.queued();
      logger.warn(
        `manageRoleLimiter depleted for ${serverId}, queued requests: ${queued}`
      );
    });

    this.manageRoleLimiters.set(serverId, limiter);
    return limiter;
  }
}

const sendMessageLimiter = new Bottleneck({
  reservoir: 5,
  reservoirRefreshAmount: 5,
  reservoirRefreshInterval: 5 * 1000,
  maxConcurrent: 1,
});

sendMessageLimiter.on("depleted", () => {
  const queued = sendMessageLimiter.queued();
  logger.warn(`sendMessageLimiter depleted, queued requests: ${queued}`);
});

const limiters = new Limiters();

export { limiters, sendMessageLimiter };
