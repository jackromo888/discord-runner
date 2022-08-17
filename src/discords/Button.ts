/* eslint-disable class-methods-use-this */
import { ButtonInteraction, MessageEmbed, MessageOptions } from "discord.js";
import { ButtonComponent, Discord } from "discordx";
import { getUserPoap } from "../api/actions";
import { join } from "../commands";
import config from "../config";
import logger from "../utils/logger";

@Discord()
abstract class Buttons {
  @ButtonComponent("join-button")
  async button1(interaction: ButtonInteraction) {
    try {
      await interaction.reply({
        content: "I'll update your accesses as soon as possible.",
        ephemeral: true,
      });
    } catch (error) {
      logger.verbose(`join-button interaction reply ${error.message}`);
      return;
    }

    let messagePayload: MessageOptions;
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
            new MessageEmbed({
              title: "Error",
              description: "There is no guild associated with this server.",
              color: `#${config.embedColor.error}`,
            }),
          ],
        });
        return;
      }
      logger.error(`join-button - ${error}`);
      await interaction.editReply({
        embeds: [
          new MessageEmbed({
            title: "Error",
            description: "Unkown error occured, please try again later.",
            color: `#${config.embedColor.error}`,
          }),
        ],
      });
      return;
    }

    try {
      await interaction.editReply(messagePayload);
    } catch (error) {
      logger.verbose(
        `join-button interaction EDITREPLY ${JSON.stringify(error)}`
      );
      logger.verbose(`join-button interaction EDITREPLY ${error.message}`);
    }
  }

  @ButtonComponent("poap-claim-button")
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
