import * as dotenv from "dotenv";

const envFound = dotenv.config();
if (envFound.error) {
  throw new Error("Couldn't find .env file or volumes in compose.");
}

const discordToken = process.env.DISCORD_TOKEN;
const backendUrl = process.env.BACKEND_URL;
const prefix = process.env.PREFIX || "!";
const api = {
  prefix: "/api",
  port: process.env.PORT || 8990,
};

if (!discordToken) {
  throw new Error(
    "You need to specify the bot's DISCORD_TOKEN in the .env file."
  );
}
if (!backendUrl) {
  throw new Error("You need to specify the BACKEND_URL in the .env file.");
}

export default {
  discordToken,
  backendUrl,
  prefix,
  api,
};
