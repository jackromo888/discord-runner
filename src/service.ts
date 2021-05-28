import axios from "axios";
import config from "./config";
import logger from "./utils/logger";

const API_BASE_URL = config.hubUrl;
const PLATFORM = "discord";

export function userJoined(
  refId: string,
  idFromPlatform: string,
  sender: string
) {
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
}

export function userRemoved(idFromPlatform: string, sender: string) {
  axios
    .post(`${API_BASE_URL}/user/removed`, {
      idFromPlatform,
      platform: PLATFORM,
      sender,
    })
    .then((res) => {
      logger.debug(JSON.stringify(res.data));
    })
    .catch(logger.error);
}
