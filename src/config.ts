/* eslint-disable no-unused-vars */
import * as dotenv from "dotenv";
import { hostname } from "os";

const envFound = dotenv.config();
/* if (envFound.error) {
  throw new Error("Couldn't find .env file or volumes in compose.");
} */

const nodeEnv = process.env.NODE_ENV || "development";
const instanceInfo = {
  version: process.env.COMMIT_SHA || "local",
  hostname: hostname(),
};
const notificationWebhook = process.env.NOTIFICATION_WEBHOOK || "";
const redisHost = process.env.REDIS_HOST;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const discordToken = process.env.DISCORD_TOKEN;
const backendUrl = process.env.BACKEND_URL;
const api = {
  prefix: "/api",
  port: process.env.PORT || 8990,
};
const embedColor = {
  default: process.env.EMBED_COLOR || "6366f1",
  error: "ff0000",
};
const guildUrl = process.env.GUILD_URL;

const joinButtonEmojis = {
  emoji1: process.env.JOIN_BUTTON_EMOJI1 || "🖤",
  emoji2: process.env.JOIN_BUTTON_EMOJI2 || "🤍",
};

const couchDbUrl = process.env.COUCH_URL;

const naclSecret = process.env.NACL_SECRET;
const naclPublic = process.env.NACL_PUBLIC;

if (!discordToken) {
  throw new Error(
    "You need to specify the bot's DISCORD_TOKEN in the .env file."
  );
}

if (!backendUrl) {
  throw new Error("You need to specify the BACKEND_URL in the .env file.");
}

if (!redisHost) {
  throw new Error("You need to specify the REDIS_HOST in the .env file.");
}

if (!couchDbUrl) {
  throw new Error("You need to specify the COUCH_URL in the .env file.");
}
if (!naclSecret) {
  throw new Error("You need to specify the NACL_SECRET in the .env file.");
}
if (!naclPublic) {
  throw new Error("You need to specify the NACL_PUBLIC in the .env file.");
}

export default {
  nodeEnv,
  redisHost,
  discordToken,
  backendUrl,
  api,
  platform: "DISCORD",
  embedColor,
  guildUrl,
  joinButtonEmojis,
  couchDbUrl,
  clientId,
  clientSecret,
  naclSecret,
  naclPublic,
  instanceInfo,
  notificationWebhook,
};
