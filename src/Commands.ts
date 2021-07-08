/* eslint-disable class-methods-use-this */
import { Discord, CommandMessage, Command, Guard } from "@typeit/discord";
import config from "./config";
import NotABot from "./Guards/NotABot";
import Main from "./Main";
import { handleJoinCode } from "./utils/utils";

@Discord(config.prefix)
abstract class Commands {
  static commands = ["ping", "join"];

  @Command("ping")
  @Guard(NotABot)
  ping(command: CommandMessage): void {
    command.reply(
      `Latency is ${
        Date.now() - command.createdTimestamp
      }ms. API Latency is ${Math.round(Main.Client.ws.ping)}ms`
    );
  }

  @Command("join :joinCode")
  @Guard(NotABot)
  join(command: CommandMessage): void {
    const { joinCode } = command.args;
    handleJoinCode(joinCode, command.author);
    if (command.channel.type !== "dm") {
      command.delete();
    }
  }
}

export default Commands;
