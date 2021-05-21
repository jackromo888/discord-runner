import { Discord, CommandMessage, Command, Guard } from "@typeit/discord";
import { Invite } from "discord.js";
import { NotABot } from "./Guards/NotABot";
import { Main } from "./Main";

@Discord(Main.prefix)
export abstract class Commands {
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
      })
      .then((invite: Invite) => {
        command.reply(invite.url);
      })
      .catch(console.error);
    // TODO: respose
  }

  // TODO: change this to API endpoint
  @Command("isMember :userId")
  @Guard(NotABot)
  isMember(command: CommandMessage): void {
    const userId: string = command.args.userId;
    command.guild.members
      .fetch({ user: userId })
      .then((_) => command.reply("yes"))
      .catch((_) => {
        command.reply("no");
      });
    // TODO: respose
  }

  // TODO: change this to API endpoint
  @Command("addRole :userId :roleId")
  @Guard(NotABot)
  addRole(command: CommandMessage): void {
    const userId: string = command.args.userId;
    const roleId: string = command.args.roleId;
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
            console.log(error);
            command.reply("role does not exit");
            // TODO: error respose
          });
      })
      .catch((error) => {
        console.log(error);
        command.reply("member does not exit");
        // TODO: error respose
      });
  }

  // TODO: change this to API endpoint
  @Command("removeRole :userId :roleId")
  @Guard(NotABot)
  removeRole(command: CommandMessage): void {
    const userId: string = command.args.userId;
    const roleId: string = command.args.roleId;

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
            console.log(error);
            command.reply("role does not exit");
            // TODO: error respose
          });
      })
      .catch((error) => {
        console.log(error);
        command.reply("member does not exit");
        // TODO: error respose
      });
  }

  // TODO: change this to API request
  @Command("join :joinCode")
  @Guard(NotABot)
  join(command: CommandMessage): void {
    const joinCode = command.args.joinCode;
    console.log(
      `User joined (${joinCode}, "discord", ${command.author.id}, ${command.guild.id})`
    );
    // TODO: call the API
    command.delete().then();
  }
}
