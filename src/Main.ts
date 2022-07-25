import axios from "axios";
import { importx } from "@discordx/importer";
import { Intents, MessageComponentInteraction } from "discord.js";
import { Client } from "discordx";
import { Platform, setApiBaseUrl, setProjectName } from "@guildxyz/sdk";
import api from "./api/api";
import config from "./config";
import logger from "./utils/logger";
import { logAxiosResponse } from "./utils/utils";

class Main {
  public static client: Client;

  public static platform: Platform;

  public static async start(): Promise<void> {
    api();

    // log all axios responses
    axios.interceptors.response.use(logAxiosResponse);

    // setup sdk
    setApiBaseUrl(config.backendUrl);
    setProjectName("DISCORD connector");
    logger.info(`Backend url set to ${config.backendUrl}`);
    this.platform = new Platform("DISCORD");

    this.client = new Client({
      intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_INVITES,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_PRESENCES,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
      ],
      partials: ["MESSAGE", "CHANNEL", "REACTION"],
      retryLimit: 3,
      // rejectOnRateLimit: ["/"],
      restGlobalRateLimit: 50,
    });

    this.client.on("ready", async () => {
      logger.info(">> Bot started");

      await this.client.initApplicationCommands();
      await this.client.initApplicationPermissions();
    });

    this.client.on("messageCreate", (message) => {
      try {
        if (!message.author.bot) {
          this.client.executeCommand(message);
        }
      } catch (error) {
        logger.error(`messageCreate error - ${error.message}`);
      }
    });

    this.client.on("interactionCreate", (interaction) => {
      if (
        interaction instanceof MessageComponentInteraction &&
        interaction.customId?.startsWith("discordx@pagination@")
      ) {
        return;
      }
      this.client.executeInteraction(interaction);
    });

    await importx(`${__dirname}/discords/*.{ts,js}`);

    this.client.login(config.discordToken);
  }
}

Main.start();

export default Main;
