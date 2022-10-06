/* eslint-disable class-methods-use-this */
import {
  ApplicationCommandOptionType,
  BaseMessageOptions,
  ChannelType,
  CommandInteraction,
  EmbedBuilder,
  GuildMember,
  PermissionsBitField,
} from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import { GetGuildResponse } from "@guildxyz/sdk";
import { join, ping, status } from "../commands";
import logger from "../utils/logger";
import { createInteractionPayload } from "../utils/utils";
import config from "../config";
import Main from "../Main";
import { sendMessageLimiter } from "../utils/limiters";
import { startVoiceEvent, stopVoiceEvent } from "../utils/voiceUtils";

@Discord()
abstract class Slashes {
  @Slash({
    name: "ping",
    description: "Get the latency of the bot and the Discord API.",
  })
  ping(interaction: CommandInteraction): void {
    logger.verbose(
      `/ping command was used by ${interaction.user.username}#${interaction.user.discriminator}`
    );
    interaction
      .reply({ content: ping(interaction.createdTimestamp), ephemeral: true })
      .catch(logger.error);
  }

  @Slash({
    name: "status",
    description: "Update all of your guild accesses in every server.",
  })
  async status(interaction: CommandInteraction): Promise<void> {
    logger.verbose(
      `/status command was used by ${interaction.user.username}#${interaction.user.discriminator} userId: ${interaction.user.id}`
    );

    try {
      await sendMessageLimiter.schedule(() =>
        interaction.reply({
          content: `I'll update your Guild accesses as soon as possible. (It could take up to 2 minutes.)`,
          ephemeral: true,
        })
      );

      const editOptions = await status(interaction.guild.id, interaction.user);

      await sendMessageLimiter.schedule(() =>
        interaction.editReply({
          content: null,
          ...editOptions,
        })
      );
    } catch (error) {
      logger.verbose(
        `status command failed ${interaction.user.id} ${
          error.message
        } ${JSON.stringify(error)}`
      );
    }
  }

  @Slash({ name: "join", description: "Join the guild of this server." })
  async join(interaction: CommandInteraction) {
    try {
      if (interaction.channel.type !== ChannelType.GuildText) {
        await sendMessageLimiter.schedule(() =>
          interaction.reply(
            "❌ Use this command in a server to join all of its guilds you have access to!"
          )
        );
        return;
      }

      logger.verbose(
        `/join command was used by ${interaction.user.username}#${interaction.user.discriminator}`
      );

      await interaction.deferReply({ ephemeral: true });

      let messagePayload: BaseMessageOptions;
      try {
        messagePayload = await join(
          interaction?.user.id,
          interaction?.guild,
          interaction?.token
        );
      } catch (error) {
        if (error.message?.startsWith("Cannot find guild")) {
          await interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setTitle("Error")
                .setDescription(
                  "There is no guild associated with this server."
                )
                .setColor(`#${config.embedColor.error}`),
            ],
          });
          return;
        }
        logger.error(error);
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Error")
              .setDescription("Unkown error occured, please try again later.")
              .setColor(`#${config.embedColor.error}`),
          ],
        });
        return;
      }

      await interaction.editReply(messagePayload);
    } catch (error) {
      logger.error(
        `Slashes.join failed serverId: ${interaction.guild.id} dc userId: ${
          interaction.user.id
        } error: ${error.message} ${JSON.stringify(error)}`
      );
    }
  }

  @Slash({
    name: "join-button",
    description: "Generate a join button. (Only for server administrators!)",
  })
  async joinButton(
    @SlashOption({
      name: "title",
      type: ApplicationCommandOptionType.String,
      required: false,
      description: "The title of the embed message.",
    })
    title: string,
    @SlashOption({
      name: "message",
      type: ApplicationCommandOptionType.String,
      required: false,
      description: "The text that will be shown in the embed message.",
    })
    messageText: string,
    @SlashOption({
      name: "buttontext",
      type: ApplicationCommandOptionType.String,
      required: false,
      description: "The text that will be shown on the button.",
    })
    buttonText: string,
    interaction: CommandInteraction
  ) {
    try {
      if (interaction.channel.type !== ChannelType.GuildText) {
        await sendMessageLimiter.schedule(() =>
          interaction.reply(
            "Use this command in a server to spawn a join button!"
          )
        );
        return;
      }

      if (
        !(interaction.member as GuildMember).permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        await sendMessageLimiter.schedule(() =>
          interaction.reply({
            content: "❌ Only server admins can use this command.",
            ephemeral: true,
          })
        );
        return;
      }

      let guild: GetGuildResponse;
      try {
        guild = await Main.platform.guild.get(interaction.guild.id);
      } catch (error) {
        // ignored
      }
      if (!guild) {
        await sendMessageLimiter.schedule(() =>
          interaction.reply({
            content: "❌ There are no guilds in this server.",
            ephemeral: true,
          })
        );
        return;
      }

      const payload = createInteractionPayload(
        guild,
        title,
        messageText,
        buttonText
      );

      const message = await sendMessageLimiter.schedule(() =>
        interaction.channel.send(payload)
      );

      await message.react(config.joinButtonEmojis.emoji1);
      await message.react(config.joinButtonEmojis.emoji2);

      await sendMessageLimiter.schedule(() =>
        interaction.reply({
          content: "✅ Join button created successfully.",
          ephemeral: true,
        })
      );
    } catch (err: any) {
      logger.error(`join-button error -  ${err.message}`);
    }
  }

  @Slash({
    name: "start-voice-event",
    description: "Starting a Voice Event on your server in the given channel.",
  })
  async startVoiceEvent(
    @SlashOption({
      name: "poapid",
      type: ApplicationCommandOptionType.Number,
      required: true,
      description: "The POAP Identifier for the Voice Event.",
    })
    poapId: number,
    interaction: CommandInteraction
  ): Promise<void> {
    logger.verbose(
      `/start-voice-event was used by ${interaction.user.username}#${interaction.user.discriminator} userId: ${interaction.user.id}`
    );

    try {
      await interaction.deferReply({
        ephemeral: true,
      });

      const guild = await Main.platform.guild.get(interaction.guildId);
      await startVoiceEvent(guild.id, poapId);

      await interaction.editReply({
        content: `The Voice Event has successfully started for POAP ${poapId}.`,
      });
    } catch (error) {
      logger.verbose(
        `start-voice-event command failed ${interaction.user.id} ${
          error.message
        } ${JSON.stringify(error)}`
      );
    }
  }

  @Slash({
    name: "stop-voice-event",
    description: "Stopping a Voice Event on your server in the given channel.",
  })
  async stopVoiceEvent(
    @SlashOption({
      name: "poapid",
      type: ApplicationCommandOptionType.Number,
      required: true,
      description: "The POAP Identifier for the Voice Event.",
    })
    poapId: number,
    interaction: CommandInteraction
  ): Promise<void> {
    logger.verbose(
      `/stop-voice-event was used by ${interaction.user.username}#${interaction.user.discriminator} userId: ${interaction.user.id}`
    );

    try {
      await interaction.deferReply({
        ephemeral: true,
      });

      const guild = await Main.platform.guild.get(interaction.guildId);
      await stopVoiceEvent(guild.id, poapId);

      await interaction.editReply({
        content: `The Voice Event has successfully stopped for POAP ${poapId}.`,
      });
    } catch (error) {
      logger.verbose(
        `stop-voice-event command failed ${interaction.user.id} ${
          error.message
        } ${JSON.stringify(error)}`
      );
    }
  }
}

export default Slashes;
