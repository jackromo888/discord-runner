/* eslint-disable class-methods-use-this */
import { Discord, CommandMessage, Command, Guard } from "@typeit/discord";
import { Invite } from "discord.js";
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
  @Command("invite")
  @Guard(NotABot)
  createInvite(command: CommandMessage): void {
    // TODO: replace systemChannel
    command.guild.systemChannel
      .createInvite({
        maxAge: 60 * 60 * 24, // TODO: maxAge?
        maxUses: 1,
        unique: true,
      })
      .then((invite: Invite) => {
        command.reply(invite.url);
      })
      .catch(logger.error);
    // TODO: respose
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

  // TODO: change this to API endpoint
  @Command("addRole :userId :roleId")
  @Guard(NotABot)
  addRole(command: CommandMessage): void {
    const { userId } = command.args;
    const { roleId } = command.args;
    command.guild.members
      .fetch({ user: userId })
      .then((member) => {
        command.guild.roles
          .fetch(roleId)
          .then((role) => {
            member.roles.add(role);
            // TODO: respose
          })
          .catch((error) => {
            logger.error(error);
            command.reply("role does not exit");
            // TODO: error respose
          });
      })
      .catch((error) => {
        logger.error(error);
        command.reply("member does not exit");
        // TODO: error respose
      });
  }

  // TODO: change this to API endpoint
  @Command("removeRole :userId :roleId")
  @Guard(NotABot)
  removeRole(command: CommandMessage): void {
    const { userId } = command.args;
    const { roleId } = command.args;

    command.guild.members
      .fetch({ user: userId })
      .then((member) => {
        command.guild.roles
          .fetch(roleId)
          .then((role) => {
            member.roles.remove(role);
            // TODO: respose
          })
          .catch((error) => {
            logger.error(error);
            command.reply("role does not exit");
            // TODO: error respose
          });
      })
      .catch((error) => {
        logger.error(error);
        command.reply("member does not exit");
        // TODO: error respose
      });
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
