import Bottleneck from "bottleneck";
import logger from "./logger";

const manageRoleLimiter = new Bottleneck({
  reservoir: 10,
  reservoirRefreshAmount: 10,
  reservoirRefreshInterval: 10 * 1000,
  maxConcurrent: 5,
});

manageRoleLimiter.on("depleted", () => {
  const queued = manageRoleLimiter.queued();
  logger.warn(`manageRoleLimiter depleted, queued requests: ${queued}`);
});

const sendMessageLimiter = new Bottleneck({
  reservoir: 5,
  reservoirRefreshAmount: 5,
  reservoirRefreshInterval: 5 * 1000,
  maxConcurrent: 1,
});

sendMessageLimiter.on("depleted", () => {
  const queued = manageRoleLimiter.queued();
  logger.warn(`sendMessageLimiter depleted, queued requests: ${queued}`);
});

export { manageRoleLimiter, sendMessageLimiter };
