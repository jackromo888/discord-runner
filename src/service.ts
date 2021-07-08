import axios from "axios";
import config from "./config";
import { logBackendError } from "./utils/utils";

const API_BASE_URL = config.backendUrl;
const PLATFORM = "discord";

const userJoined = async (
  refId: string,
  platformUserId: string,
  isJoinCode: boolean
): Promise<boolean> => {
  try {
    await axios.post(`${API_BASE_URL}/user/joinedPlatform`, {
      refId,
      platform: PLATFORM,
      platformUserId,
      isJoinCode,
    });
    return true;
  } catch (error) {
    logBackendError(error);
    return false;
  }
};

const userRemoved = (dcUserId: string, serverId: string): void => {
  axios
    .post(`${API_BASE_URL}/user/removeFromPlatform`, {
      platform: PLATFORM,
      platformUserId: dcUserId,
      serverId,
      triggerKick: false,
    })
    .catch(logBackendError);
};

export { userJoined, userRemoved };
