import { CommandInteraction } from "discord.js";
import { Client, GuardFunction, Next } from "discordx";

const OnlyGuild: GuardFunction<CommandInteraction> = async (
  interaction: CommandInteraction,
  client: Client,
  next: Next
) => {
  if (!interaction) {
    return;
  }

  if (!interaction.channel.guild) {
    interaction.reply({
      content:
        "❌ Use this command in a server to join all of its guilds you have access to!",
      ephemeral: true,
    });

    return;
  }

  await next();
};

export default OnlyGuild;
