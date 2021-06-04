/* eslint-disable class-methods-use-this */
import { Discord, CommandMessage, Command, Guard } from "@typeit/discord";
import config from "./config";
import NotABot from "./Guards/NotABot";
import Main from "./Main";
import { userJoined } from "./service";
import logger from "./utils/logger";

@Discord(config.prefix)
export default abstract class Commands {
  @Command("ping")
  @Guard(NotABot)
  ping(command: CommandMessage): void {
    command.reply(
      `Latency is ${
        Date.now() - command.createdTimestamp
      }ms. API Latency is ${Math.round(Main.Client.ws.ping)}ms`
    );
  }

  // TODO: change this to API endpoint
  @Command("isMember :userId")
  @Guard(NotABot)
  isMember(command: CommandMessage): void {
    const { userId } = command.args;
    command.guild.members
      .fetch({ user: userId })
      .then(() => command.reply("yes"))
      .catch(() => {
        command.reply("no");
      });
    // TODO: respose
  }

  @Command("join :joinCode")
  @Guard(NotABot)
  join(command: CommandMessage): void {
    const { joinCode } = command.args;
    logger.debug(
      `User joined (${joinCode}, "discord", ${command.author.id}, ${command.guild.id})`
    );
    userJoined(joinCode, command.author.id, command.guild.id);
    command.delete().then();
  }
}
