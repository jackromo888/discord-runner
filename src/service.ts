import axios from "axios";
import config from "./config";
import logger from "./utils/logger";
import { logBackendError } from "./utils/utils";

const API_BASE_URL = config.backendUrl;

const userJoined = async (platformUserId: string, serverId: string) => {
  logger.verbose(`userJoined params: ${platformUserId}, ${serverId}`);
  try {
    logger.verbose(`userJoined userId - ${platformUserId}`);

    const response = await axios.post(`${API_BASE_URL}/user/joinedPlatform`, {
      platform: config.platform,
      platformUserId,
      serverId,
    });

    logger.verbose(`joinedPlatform result:`);

    return response.data;
  } catch (error) {
    logger.verbose("joinedPlatform error");
    logBackendError(error);
    return null;
  }
};

const guildStatusUpdate = async (guildId: number): Promise<boolean> => {
  logger.verbose(`guildStatusUpdate: ${guildId}`);
  try {
    const response = await axios.post(`${API_BASE_URL}/role/statusUpdate`, {
      guildId,
    });
    return response.data;
  } catch (error) {
    logger.verbose("guildStatusUpdate error");
    logBackendError(error);
    return undefined;
  }
};

export { userJoined, guildStatusUpdate };
