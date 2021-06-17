import axios from "axios";
import config from "./config";
import logger from "./utils/logger";

const API_BASE_URL = config.backendUrl;
const PLATFORM = "discord";

const userJoined = (
  refId: string,
  idFromPlatform: string,
  sender: string
): void => {
  axios
    .post(`${API_BASE_URL}/user/joined`, {
      refId,
      idFromPlatform,
      platform: PLATFORM,
      sender,
    })
    .then((res) => {
      logger.debug(JSON.stringify(res.data));
    })
    .catch(logger.error);
};

const userRemoved = (dcUserId: string, serverId: string): void => {
  axios
    .post(`${API_BASE_URL}/user/removeFromPlatform`, {
      platform: PLATFORM,
      platformUserId: dcUserId,
      serverId,
      triggerKick: false,
    })
    .then((res) => {
      logger.debug(JSON.stringify(res.data));
    })
    .catch(logger.error);
};

export { userJoined, userRemoved };
