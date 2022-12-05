import { importx } from "@discordx/importer";
import { Platform, setApiBaseUrl, setProjectName } from "@guildxyz/sdk";
import axios from "axios";
import {
  IntentsBitField,
  MessageComponentInteraction,
  Partials,
} from "discord.js";
import { Client } from "discordx";
import API from "./api/api";
import config from "./config";
import { redisClient } from "./database";
import Health from "./services/healthService";
import logger from "./utils/logger";
import { logAxiosResponse } from "./utils/utils";

export default class Main {
  public static API: API;

  public static client: Client;

  public static platform: Platform;

  public static ready: Boolean = false;

  public static async start(): Promise<void> {
    // log all axios responses
    axios.interceptors.response.use(logAxiosResponse);

    // setup sdk
    setApiBaseUrl(config.backendUrl);
    setProjectName("DISCORD connector");
    logger.info(`Backend url set to ${config.backendUrl}`);

    this.API = new API();
    this.platform = new Platform("DISCORD");
    this.client = new Client({
      shardCount: 4,
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildInvites,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.GuildPresences,
        IntentsBitField.Flags.DirectMessages,
        IntentsBitField.Flags.DirectMessageReactions,
        IntentsBitField.Flags.GuildVoiceStates,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
      rest: {
        retries: 3,
        globalRequestsPerSecond: 50,
        // rejectOnRateLimit: ["/"],
      },
    });

    this.client.on("ready", async () => {
      logger.info(">> Bot started");

      this.ready = true;
      Health.status.runnerReady = true;

      await this.client.initApplicationCommands();
      await this.client.initGlobalApplicationCommands();
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
      try {
        this.client.executeInteraction(interaction);
        Health.status.interactionFail = false;
      } catch (error) {
        logger.error(error);
        Health.status.interactionFail = true;
        Health.sendNotification();
      }
    });

    await importx(`${__dirname}/discords/*.{ts,js}`);

    await redisClient.connect();
    await this.client.login(config.discordToken);
  }
}

// Polyfill for BigInt serialization
(BigInt.prototype as any).toJSON = function fn(): string {
  return this.toString();
};

// Healthcheck related
process.once("SIGTERM", () => {
  logger.info("SIGTERM received, exiting...");

  Health.status.runnerReady = false;
  Health.status.noSigterm = false;

  Main.client.destroy();
  process.exit(1);
});

Main.start();
