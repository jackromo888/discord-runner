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
    await interaction.deferReply({
      ephemeral: true,
    });

    let messagePayload: BaseMessageOptions;
    try {
      messagePayload = await join(
        interaction?.user.id,
        interaction?.guild,
        interaction?.token
      );
    } catch (error) {
      if (error.message?.startsWith("Cannot find guild")) {
        try {
          await interaction.followUp({
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
        } catch (noGuildError) {
          logger.error(
            `There is no guild associated with this server.=${interaction.guildId} serverName=${interaction.guild?.name} channelId=${interaction.channelId} channelName=${interaction.channel?.name} error=${noGuildError.message}`
          );
          return;
        }
      }
      try {
        await interaction.followUp({
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

    try {
      await interaction.followUp(messagePayload);
    } catch (error) {
      logger.warn(
        ` ${interaction.user?.id} ${interaction.guildId} join-button interaction EDITREPLY ${error.message}`
      );
      await interaction.followUp({
        content:
          "Joining this guild currently is not possible. Please, try it again later!",
      });
    }
  }

  @ButtonComponent({
    id: "poap-claim-button",
  })
  async claimButton(interaction: ButtonInteraction) {
    await interaction.deferReply({
      ephemeral: true,
    });
    const message = await getUserPoap(
      interaction?.user?.id,
      interaction?.guild?.id
    );

    try {
      await interaction.followUp(message);
    } catch (error) {
      logger.warn(`poap-claim-button interaction EDITREPLY ${error.message}`);
      await interaction.followUp({
        content: "Poap claiming unsuccessful. Please, try it again later!",
      });
    }
  }
}

export default Buttons;
