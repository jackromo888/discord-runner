/* eslint-disable class-methods-use-this */
import {
  ButtonInteraction,
  EmbedBuilder,
  BaseMessageOptions,
} from "discord.js";
import { ButtonComponent, Discord } from "discordx";
import { getUserPoap } from "../api/actions";
import { join } from "../commands";
import config from "../config";
import logger from "../utils/logger";

@Discord()
abstract class Buttons {
  @ButtonComponent({
    id: "join-button",
  })
  async joinButton(interaction: ButtonInteraction) {
    logger.debug(
      `join-trace ${interaction.user?.id} ${interaction.guildId} button pressed`
    );
    try {
      await interaction.reply({
        content: "I'll update your accesses as soon as possible.",
        ephemeral: true,
      });
    } catch (error) {
      logger.verbose(`join-button interaction reply ${error.message}`);
      return;
    }
    logger.debug(
      `join-trace ${interaction.user?.id} ${interaction.guildId} reply sent`
    );

    let messagePayload: BaseMessageOptions;
    try {
      messagePayload = await join(
        interaction?.user.id,
        interaction?.guild,
        interaction?.token
      );
    } catch (error) {
      if (error.message?.startsWith("Cannot find guild")) {
        logger.debug(
          `join-trace ${interaction.user?.id} ${interaction.guildId} cannot find guild`
        );
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Error")
              .setDescription("There is no guild associated with this server.")
              .setColor(`#${config.embedColor.error}`),
          ],
        });
        return;
      }
      logger.error(`join-button - ${error}`);
      try {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Error")
              .setDescription("Unkown error occured, please try again later.")
              .setColor(`#${config.embedColor.error}`),
          ],
        });
      } catch (error2) {
        logger.error(
          `Cannot send "Unkown error occured" to serverId=${
            interaction.guildId
          } serverName=${interaction.guild?.name} channelId=${
            interaction.channelId
          } channelName=${interaction.channel?.name} error=${
            error.message
          } ${JSON.stringify(error)}`
        );
      }
      return;
    }
    logger.debug(
      `join-trace ${interaction.user?.id} ${interaction.guildId} join util successful`
    );

    try {
      await interaction.editReply(messagePayload);
      logger.debug(
        `join-trace ${interaction.user?.id} ${interaction.guildId} edited reply`
      );
    } catch (error) {
      logger.verbose(
        `join-button interaction EDITREPLY ${JSON.stringify(error)}`
      );
      logger.verbose(`join-button interaction EDITREPLY ${error.message}`);
    }
  }

  @ButtonComponent({
    id: "poap-claim-button",
  })
  async claimButton(interaction: ButtonInteraction) {
    try {
      await interaction.reply({
        content: "I'll send the link for your POAP right now.",
        ephemeral: true,
      });
    } catch (error) {
      logger.verbose(`poap-claim-button interaction reply ${error.message}`);
    }

    const message = await getUserPoap(
      interaction?.user?.id,
      interaction?.guild?.id
    );

    try {
      await interaction.editReply(message);
    } catch (error) {
      logger.verbose(
        `poap-claim-button interaction EDITREPLY ${error.message}`
      );
    }
  }
}

export default Buttons;
