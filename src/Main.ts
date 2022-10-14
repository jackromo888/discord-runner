import axios from "axios";
import { importx } from "@discordx/importer";
import {
  IntentsBitField,
  MessageComponentInteraction,
  Partials,
} from "discord.js";
import { Client } from "discordx";
import { Platform, setApiBaseUrl, setProjectName } from "@guildxyz/sdk";
import config from "./config";
import logger from "./utils/logger";
import { logAxiosResponse } from "./utils/utils";

class Main {
  public static client: Client;

  public static platform: Platform;

  public static async start(): Promise<void> {
    // log all axios responses
    axios.interceptors.response.use(logAxiosResponse);

    // setup sdk
    setApiBaseUrl(config.backendUrl);
    setProjectName("DISCORD connector");
    logger.info(`Backend url set to ${config.backendUrl}`);
    this.platform = new Platform("DISCORD");

    this.client = new Client({
      shardCount: 3,
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
      } catch (error) {
        logger.error(error);
      }
    });

    await importx(`${__dirname}/discords/*.{ts,js}`);

    await this.client.login(config.discordToken);
  }
}

Main.start();

export default Main;
