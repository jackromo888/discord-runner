import { Description, On, Guard } from "@typeit/discord";
import { GuildMember, Invite, Message, PartialGuildMember } from "discord.js";
import { IsAPrivateMessage } from "./Guards/IsAPrivateMessage";
import { NotABot } from "./Guards/NotABot";
import { Main } from "./Main";

const existingInvites: Map<string, string[]> = new Map();

@Description("Event listeners.")
export abstract class Events {
  @On("ready")
  onReady(): void {
    console.log("Bot logged in.");
    Main.Client.guilds.cache.forEach((guild) => {
      guild
        .fetchInvites()
        .then((guildInvites) => {
          existingInvites.set(
            guild.id,
            guildInvites
              .filter((i) => i.inviter.id == Main.Client.user.id)
              .map((i) => i.code)
          );
        })
        .catch(console.error);
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

  // TODO: change this to API request
  @On("guildMemberAdd")
  onGuildMemberAdd(members: [GuildMember | PartialGuildMember]): void {
    if (members.length == 1) {
      let member = members[0];

      member.guild.fetchInvites().then((currentInvites) => {
        const currentBotInvites = currentInvites.filter(
          (i) => i.inviter.id == Main.Client.user.id
        );

        const previousInvites = existingInvites.get(member.guild.id);
        existingInvites[member.guild.id] = currentBotInvites.map((i) => i.code);

        const usedInvites = previousInvites.filter(
          (i) => !currentBotInvites.has(i)
        );

        if (usedInvites && usedInvites.length == 1) {
          console.log(
            `${member.user.username} joined with the ${usedInvites[0]} invite`
            // TODO: call api
          );
        } else {
          // TODO: ask these members for invite code
          console.log("ambiguous invite code");
        }
      });
    } else {
      // TODO: ask these members for invite code
      console.log("more than one join at the same time");
    }
  }

  // TODO: change this to API request
  @On("guildMemberRemove")
  onGuildMemberRemove(members: [GuildMember | PartialGuildMember]): void {
    members.forEach((member) => {
      console.log(
        `User removed from platform of the community (${member.user.id}, "discord", ${Main.Client.user.id})`
      );
      // TODO: call api
    });
  }
}
