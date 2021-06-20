/* eslint-disable class-methods-use-this */
import { Discord, CommandMessage, Command, Guard } from "@typeit/discord";
import config from "./config";
import NotABot from "./Guards/NotABot";
import Main from "./Main";
import { userJoined } from "./service";

@Discord(config.prefix)
abstract class Commands {
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
    userJoined(joinCode, command.author.id, command.guild?.id, true).then(
      (ok) => {
        const message = ok
          ? "You have successfully joined."
          : "Join failed. (wrong join code)";
        command.author.send(message);
      }
    );
    if (command.channel.type !== "dm") {
      command.delete();
    }
  }
}

export default Commands;
