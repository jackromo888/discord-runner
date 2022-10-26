/* eslint-disable class-methods-use-this */
import { SelectMenuInteraction } from "discord.js";
import { Discord, SelectMenuComponent } from "discordx";
import pollStorage from "../api/pollStorage";
import logger from "../utils/logger";

@Discord()
abstract class Menus {
  @SelectMenuComponent({
    id: "token-menu",
  })
  async equipMenu(interaction: SelectMenuInteraction) {
    try {
      await interaction.deferReply();

      const { user, values } = interaction;

      const value = values?.[0];

      if (!value) {
        await interaction.followUp({
          content: "❌ Invalid selection, please select again!",
          ephemeral: true,
        });
      }

      pollStorage.saveReqId(user.id, +value);
      pollStorage.setUserStep(user.id, 1);

      await interaction.followUp(
        "Please give me the question/subject of the poll. For example:\n" +
          '"Do you think drinking milk is cool?"'
      );
    } catch (error) {
      logger.error(error);
    }
  }
}

export default Menus;
