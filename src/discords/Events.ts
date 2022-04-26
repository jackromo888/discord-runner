/* eslint-disable class-methods-use-this */
import {
  GuildMember,
  Invite,
  PartialGuildMember,
  RateLimitData,
  Role,
} from "discord.js";
import { Discord, On } from "discordx";
import Main from "../Main";
import { getGuildsOfServer, userJoined, userRemoved } from "../service";
import logger from "../utils/logger";

@Discord()
abstract class Events {
  @On("ready")
  onReady(): void {
    logger.info("Bot logged in.");
  }

  @On("rateLimit")
  onRateLimit(rateLimited: RateLimitData): void {
    logger.warn(`BOT Rate Limited. ${JSON.stringify(rateLimited)}`);
  }

  @On("guildMemberAdd")
  onGuildMemberAdd([member]: [GuildMember | PartialGuildMember]): void {
    userJoined(member.user.id, member.guild.id);
  }

  @On("guildMemberRemove")
  onGuildMemberRemove([member]: [GuildMember | PartialGuildMember]): void {
    userRemoved(member.user.id, member.guild.id);
  }

  @On("inviteDelete")
  onInviteDelete([invite]: [Invite]): void {
    Main.Client.guilds.fetch(invite.guild.id).then((guild) => {
      logger.verbose(`onInviteDelete guild: ${guild.name}`);

      const inviteChannelId = Main.inviteDataCache.get(
        guild.id
      )?.inviteChannelId;

      if (inviteChannelId) {
        guild.invites
          .create(inviteChannelId, { maxAge: 0 })
          .then((newInvite) => {
            Main.inviteDataCache.set(guild.id, {
              code: newInvite.code,
              inviteChannelId,
            });
            logger.verbose(
              `invite code cache updated: ${guild.id}, ${newInvite.code}`
            );
          });
      }
    });
  }

  @On("roleCreate")
  async onRoleCreate([role]: [Role]): Promise<void> {
    const guildOfServer = await getGuildsOfServer(role.guild.id);

    if (!guildOfServer?.[0]?.isGuarded) {
      return;
    }

    await role.edit({ permissions: role.permissions.remove("VIEW_CHANNEL") });
  }
}

export default Events;
