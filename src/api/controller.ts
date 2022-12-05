import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { writeHeapSnapshot } from "v8";
import Health from "../services/healthService";
import logger from "../utils/logger";
import { getErrorResult, hasNecessaryPermissions } from "../utils/utils";
import {
  resetVoiceEvent,
  startVoiceEvent,
  stopVoiceEvent,
} from "../utils/voiceUtils";
import {
  createChannel,
  createRole,
  getChannelList,
  getEmoteList,
  getMembersByRoleId,
  getRole,
  getServerInfo,
  getUser,
  getVoiceChannelList,
  isMember,
  listAdministeredServers,
  manageMigratedActions,
  sendDiscordButton,
  sendPollMessage,
  updateRoleName,
  migrateUsers,
} from "./actions";
import {
  fetchUserByAccessToken,
  fetchUserByCode,
  getInfo,
  handleAccessEvent,
  handleGuildEvent,
  handleRoleEvent,
  listServers,
  refreshAccessToken,
} from "./service";
import {
  AccessEventParams,
  CreateChannelParams,
  GuildEventParams,
  ResolveUserParams,
  RoleEventParams,
} from "./types";

const controller = {
  access: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const params: AccessEventParams[] = req.body;

    try {
      const results = await Promise.all(
        params.map(async (aep) => {
          try {
            const highPrio = params.length <= 2;
            if (!highPrio) {
              logger.verbose(
                `status update detected, first param: ${JSON.stringify(
                  params[0]
                )}`
              );
            }

            await handleAccessEvent(aep, highPrio);
            return { success: true };
          } catch (error) {
            logger.error(
              `accss action error: params: ${JSON.stringify(
                aep
              )} error: ${error}`
            );
            return { success: false, errorMsg: error.message };
          }
        })
      );
      res.status(200).json(results);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  guild: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const params: GuildEventParams = req.body;

    try {
      await hasNecessaryPermissions(params.platformGuildId);
      const result = await handleGuildEvent(params);
      res.status(200).json(result);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  role: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const params: RoleEventParams = req.body;

    try {
      await hasNecessaryPermissions(params.platformGuildId);
      const result = await handleRoleEvent(params);
      res.status(200).json(result);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  info: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const { platformGuildId } = req.params;

      const { name, inviteCode } = await getInfo(platformGuildId);

      res
        .status(200)
        .json({ name, invite: `https://discord.gg/${inviteCode}` });
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  healthcheck: async (_: Request, res: Response): Promise<void> => {
    try {
      const { status, health } = await Health.getHealth();

      res.status(status).json(health);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  healthcheckLive: async (_: Request, res: Response): Promise<void> => {
    try {
      const live = Health.isLive();

      if (live) {
        res.status(200).send({});
        return;
      }

      res.status(503).json({ message: "NOT_LIVE" });
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  healthcheckReady: async (_: Request, res: Response): Promise<void> => {
    try {
      const ready = Health.isReady();

      if (ready) {
        res.status(200).send({});
      } else {
        res.status(503).json({ message: "NOT_READY" });
      }
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  handleVoiceEvent: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const {
        guildId,
        poapId,
        action,
        timestamp,
      }: {
        guildId: number;
        poapId: number;
        action: string;
        timestamp: number;
      } = req.body;
      if (action === "START") {
        const result = await startVoiceEvent(guildId, poapId, timestamp);
        res.status(200).json(result);
      } else {
        const result = await stopVoiceEvent(guildId, poapId, timestamp);
        res.status(200).json(result);
      }
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  resetVoiceEvent: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const {
        guildId,
        poapId,
      }: {
        guildId: number;
        poapId: number;
      } = req.body;

      const result = await resetVoiceEvent(guildId, poapId);
      res.status(200).json(result);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  resolveUser: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      // eslint-disable-next-line camelcase
      const { access_token, code, redirect_url } =
        req.body as ResolveUserParams;
      const result = await ("access_token" in req.body
        ? fetchUserByAccessToken(access_token)
        : fetchUserByCode(code, redirect_url));

      res.status(200).json(result);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  refresh: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const result = await refreshAccessToken(req.body.refreshToken);
      res.status(200).json(result);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  listGateables: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const { platformUserId, platformUserData } = req.body;
      const serverList = await listServers(platformUserId, platformUserData);

      res.status(200).json(serverList);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  isMember: (req: Request, res: Response): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { serverId, platformUserId } = req.body;

    isMember(serverId, platformUserId)
      .then((result) => {
        res.status(200).json(result);
      })
      .catch((error) => {
        const errorMsg = getErrorResult(error);
        res.status(400).json(errorMsg);
      });
  },

  createRole: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      // eslint-disable-next-line no-unused-vars
      const { serverId, roleName, isGuarded, entryChannelId, gatedChannels } =
        req.body;

      const roleId = await createRole(
        serverId,
        roleName,
        isGuarded,
        entryChannelId
      );

      // await updateAccessedChannelsOfRole(
      //   serverId,
      //   roleId,
      //   gatedChannels,
      //   isGuarded,
      //   entryChannelId
      // );

      res.status(201).json(roleId);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  updateRole: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const {
        serverId,
        roleId,
        roleName,
        isGuarded,
        entryChannelId,
        // eslint-disable-next-line no-unused-vars
        gatedChannels,
      } = req.body;

      await updateRoleName(
        serverId,
        roleId,
        roleName,
        isGuarded,
        entryChannelId
      );

      // await updateAccessedChannelsOfRole(
      //   serverId,
      //   roleId,
      //   gatedChannels,
      //   isGuarded,
      //   entryChannelId
      // );

      res.status(200).send();
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  server: (req: Request, res: Response): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { guildId } = req.params;
    // const { includeDetails } = req.body;

    getServerInfo(guildId)
      .then((result) => res.status(200).json(result))
      .catch((error) => {
        const errorMsg = getErrorResult(error);
        res.status(400).json(errorMsg);
      });
  },

  administeredServers: (req: Request, res: Response): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { platformUserId } = req.params;

    listAdministeredServers(platformUserId)
      .then((result) => res.status(200).json(result))
      .catch((error) => {
        const errorMsg = getErrorResult(error);
        res.status(400).json(errorMsg);
      });
  },

  createChannel: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const params: CreateChannelParams = req.body;
      const createdChannel = await createChannel(params);

      res.status(200).json(createdChannel.id);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  getRoleNameByRoleId: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const { guildId, roleId } = req.params;
      const result = await getRole(guildId, roleId);

      res.status(200).json(result);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  sendDiscordButton: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const { guildId, channelId, ...buttonMetaData } = req.body;
      await hasNecessaryPermissions(guildId);
      const result = await sendDiscordButton(
        guildId,
        channelId,
        buttonMetaData
      );
      res.status(200).json(result);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  getUser: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const { platformUserId } = req.params;
      const result = await getUser(platformUserId);

      res.status(200).json(result);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  manageMigratedActions: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const {
        guildId,
        upgradeableUserIds,
        downgradeableUserIds,
        roleId,
        message,
      } = req.body;
      const result = await manageMigratedActions(
        guildId,
        upgradeableUserIds,
        downgradeableUserIds,
        roleId,
        message
      );
      res.status(200).json(result);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  getMembersByRole: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    try {
      const { roleId, serverId } = req.params;
      const members = await getMembersByRoleId(serverId, roleId);
      res.status(200).json(members);
    } catch (error) {
      const errorMsg = getErrorResult(error);
      res.status(400).json(errorMsg);
    }
  },

  createPoll: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const msgId = await sendPollMessage(req.body.channelId, req.body);

      res.status(200).json(msgId);
    } catch (err) {
      res.status(400).json(getErrorResult(err));
    }
  },

  getEmotes: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const guildId = req?.params?.guildId;
      const result = await getEmoteList(guildId);

      res.status(200).json(result);
    } catch (err) {
      res.status(400).json(getErrorResult(err));
    }
  },

  getChannels: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const guildId = req?.params?.guildId;
      const result = await getChannelList(guildId);

      res.status(200).json(result);
    } catch (err) {
      res.status(400).json(getErrorResult(err));
    }
  },

  getVoiceChannels: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const guildId = req?.params?.guildId;
      const result = await getVoiceChannelList(guildId);

      res.status(200).json(result);
    } catch (err) {
      res.status(400).json(getErrorResult(err));
    }
  },

  migrateUsers: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { guildId } = req.params;
      const result = await migrateUsers(guildId);

      res.status(200).json(result);
    } catch (err) {
      res.status(400).json(getErrorResult(err));
    }
  },

  heapSnapshot: async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const result = writeHeapSnapshot();
      res.status(200).json(result);
    } catch (err) {
      res.status(400).json(getErrorResult(err));
    }
  },
};

export default controller;
