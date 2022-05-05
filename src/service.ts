import axios from "axios";
import { LevelInfo } from "./api/types";
import config from "./config";
import logger from "./utils/logger";
import { logAxiosResponse, logBackendError } from "./utils/utils";

const API_BASE_URL = config.backendUrl;
const PLATFORM = "DISCORD";

const userJoined = async (platformUserId: string, serverId: string) => {
  logger.verbose(`userJoined params: ${platformUserId}, ${serverId}`);
  try {
    logger.verbose(`userJoined userId - ${platformUserId}`);
    const response = await axios.post(`${API_BASE_URL}/user/joinedPlatform`, {
      platform: PLATFORM,
      platformUserId,
      serverId,
    });
    logger.verbose(`joinedPlatform result:`);
    logAxiosResponse(response);
    return response.data;
  } catch (error) {
    logger.verbose("joinedPlatform error");
    logBackendError(error);
    return null;
  }
};

const userRemoved = async (platformUserId: string, serverId: string) => {
  logger.verbose(`userRemoved userId - ${platformUserId}`);
  axios
    .post(`${API_BASE_URL}/user/removeFromPlatform`, {
      platform: PLATFORM,
      platformUserId,
      serverId,
      triggerKick: false,
    })
    .catch(logBackendError);
};

const statusUpdate = async (
  platformUserId: string
): Promise<LevelInfo[] | undefined> => {
  logger.verbose(`statusUpdate params: ${platformUserId}`);
  try {
    const response = await axios.post(`${API_BASE_URL}/user/statusUpdate`, {
      discordId: platformUserId,
    });
    logAxiosResponse(response);
    return response.data;
  } catch (error) {
    logger.verbose("statusUpdate error");
    logBackendError(error);
    return undefined;
  }
};

const getGuildsOfServer = async (serverId: string) => {
  logger.verbose(`getGuildsOfServer params: ${serverId}`);
  try {
    const response = await axios.get(
      `${API_BASE_URL}/guild/platformId/${serverId}`
    );
    return [response.data];
  } catch (error) {
    logger.verbose("getGuildsOfServer error");
    return [];
  }
};


export {
  userJoined,
  userRemoved,
  statusUpdate,
  getGuildsOfServer
};
