/* eslint-disable class-methods-use-this */
import { Description, On, Guard } from "@typeit/discord";
import { GuildMember, Invite, Message, PartialGuildMember } from "discord.js";
import IsAPrivateMessage from "./Guards/IsAPrivateMessage";
import NotABot from "./Guards/NotABot";
import Main from "./Main";
import { userJoined, userRemoved } from "./service";
import logger from "./utils/logger";

const existingInvites: Map<string, string[]> = new Map();

@Description("Event listeners.")
export default abstract class Events {
  @On("ready")
  onReady(): void {
    logger.info("Bot logged in.");
    Main.Client.guilds.cache.forEach((guild) => {
      guild
        .fetchInvites()
        .then((guildInvites) => {
          existingInvites.set(
            guild.id,
            guildInvites
              .filter((i) => i.inviter.id === Main.Client.user.id)
              .map((i) => i.code)
          );
        })
        .catch(logger.error);
    });
  }

  @On("message")
  @Guard(NotABot)
  @Guard(IsAPrivateMessage)
  onPrivateMessage(messages: [Message]): void {
    messages.forEach((message) => {
      message.channel.send("Please visit our website: <url>");
    });
  }

  @On("inviteCreate")
  onInviteCreated(invites: [Invite]) {
    invites.forEach((invite) => {
      existingInvites.get(invite.guild.id).push(invite.code);
    });
  }

  @On("guildMemberAdd")
  onGuildMemberAdd(members: [GuildMember | PartialGuildMember]): void {
    if (members.length === 1) {
      const member = members[0];

      member.guild.fetchInvites().then((currentInvites) => {
        const currentBotInvites = currentInvites.filter(
          (i) => i.inviter.id === Main.Client.user.id
        );

        const previousInvites = existingInvites.get(member.guild.id);
        existingInvites[member.guild.id] = currentBotInvites.map((i) => i.code);

        const usedInvites = previousInvites.filter(
          (i) => !currentBotInvites.has(i)
        );

        if (usedInvites && usedInvites.length === 1) {
          logger.debug(
            `${member.user.username} joined with the ${usedInvites[0]} invite`
          );
          userJoined(usedInvites[0], member.user.id, member.guild.id);
        } else {
          // TODO: ask these members for invite code
          logger.debug("ambiguous invite code");
        }
      });
    } else {
      // TODO: ask these members for invite code
      logger.debug("more than one join at the same time");
    }
  }

  @On("guildMemberRemove")
  onGuildMemberRemove(members: [GuildMember | PartialGuildMember]): void {
    members.forEach((member) => {
      logger.debug(
        `User removed from platform of the community (${member.user.id}, "discord", ${Main.Client.user.id})`
      );
      userRemoved(member.user.id, member.guild.id);
    });
  }
}
