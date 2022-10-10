/* eslint-disable no-unused-vars */
import axios from "axios";
import dayjs from "dayjs";
import { VoiceState } from "discord.js";
import { PoapResponse } from "../api/types";
import config from "../config";
import { couchDbClient } from "../database";
import Main from "../Main";
import logger from "./logger";

const hasUserBeenDeafened = (
  oldState: VoiceState,
  newState: VoiceState
): boolean => !newState.selfDeaf && oldState.selfDeaf;

const hasUserBeenUnDeafened = (
  oldState: VoiceState,
  newState: VoiceState
): boolean => newState.selfDeaf && !oldState.selfDeaf;

const hasUserChangedChannels = (
  oldState: VoiceState,
  newState: VoiceState
): boolean => newState.channelId !== oldState.channelId;

const updateVoiceParticipationWhenEventStarts = async (
  poapId: number,
  voiceChannelId: string,
  guildId: string
) => {
  logger.verbose(
    `updateVoiceParticipationWhenEventStarts - ${poapId}  ${voiceChannelId}`
  );
  try {
    const guild = await Main.client.guilds.fetch(guildId);
    const voiceChannel = await guild.channels.fetch(voiceChannelId);

    await Promise.all(
      Object.values(voiceChannel.members).map(async (user) => {
        await couchDbClient.voiceParticipation.insert({
          _id: `${user.id}:${poapId}`,
          discordId: user.id,
          discordTag: user.user.tag,
          joinedAt: user.voice.selfDeaf ? 0 : dayjs().unix(),
          participated: 0,
          poapId,
        });
      })
    );
  } catch (error) {
    logger.error(
      `updateVoiceParticipationWhenEventStarts error - ${poapId} ${error.message}`
    );
  }
};

const updateParticipationdWhenEventEnds = async (
  poapId: number,
  endedAt: number
) => {
  logger.verbose(`updateParticipationdWhenEventEnds - ${poapId}  ${endedAt}`);
  try {
    const updateableUsers = await couchDbClient.voiceParticipation.find({
      selector: {
        joinedAt: { $ne: 0 },
      },
      limit: 100000,
    });
    await Promise.all(
      updateableUsers.docs.map(async (userResult) => {
        const { _rev, joinedAt, discordId, discordTag, participated } =
          userResult;
        try {
          await couchDbClient.voiceParticipation.insert({
            _id: `${discordId}:${poapId}`,
            // eslint-disable-next-line no-underscore-dangle
            _rev,
            discordId,
            discordTag,
            joinedAt: 0,
            participated: participated + (dayjs().unix() - joinedAt),
            poapId,
          });
        } catch (error) {
          logger.verbose(`updateParc - userResultUpdate - ${error.message}`);
        }
      })
    );
  } catch (error) {
    logger.error(
      `updateParticipationdWhenEventEnds error - ${poapId} ${error.message}`
    );
    throw new Error(
      `Update user participation when event ends failed with the given POAP (${poapId}).`
    );
  }
};

const getPoapIdIfChannelHasActiveVoiceEvent = async (
  voiceChannelId: string
): Promise<number | null> => {
  try {
    const activeEvent = await couchDbClient.voiceEvents.find({
      selector: {
        voiceChannelId: { $eq: voiceChannelId },
        isActive: { $eq: true },
      },
    });
    return activeEvent?.docs[0]?.isActive ? activeEvent?.docs[0]?.poapId : null;
  } catch (error) {
    logger.error(`isChannelHasActiveVoiceEvent error - ${error.message}`);
    return null;
  }
};

const updateUserVoiceParticipation = async (
  userDiscordId: string,
  poapId: number,
  isUserJoined: boolean
): Promise<void> => {
  try {
    logger.verbose(
      `updateUserVoiceParticipation - ${userDiscordId} ${poapId}  ${isUserJoined}`
    );
    const couchResult = await couchDbClient.voiceParticipation.get(
      `${userDiscordId}:${poapId}`
    );
    if (couchResult) {
      const { _rev, joinedAt, discordId, discordTag, participated } =
        couchResult;

      if (isUserJoined) {
        await couchDbClient.voiceParticipation.insert({
          _id: `${userDiscordId}:${poapId}`,
          // eslint-disable-next-line no-underscore-dangle
          _rev,
          discordId,
          discordTag,
          joinedAt: dayjs().unix(),
          participated,
          poapId,
        });
      } else {
        await couchDbClient.voiceParticipation.insert({
          _id: `${userDiscordId}:${poapId}`,
          // eslint-disable-next-line no-underscore-dangle
          _rev,
          discordId,
          discordTag,
          joinedAt: 0,
          participated: participated + (dayjs().unix() - joinedAt),
          poapId,
        });
      }
    }
  } catch (error) {
    logger.verbose(
      `updateUserVoiceParticipation - couchdb get not not found  ${userDiscordId}:${poapId} - inserting.`
    );
    const user = await Main.client.users.fetch(userDiscordId);
    await couchDbClient.voiceParticipation.insert({
      _id: `${userDiscordId}:${poapId}`,
      // eslint-disable-next-line no-underscore-dangle
      discordId: userDiscordId,
      discordTag: user.tag,
      participated: 0,
      joinedAt: dayjs().unix(),
      poapId,
    });
  }
};

const startVoiceEvent = async (
  guildId: number,
  poapId: number,
  timestamp?: number
): Promise<{ started: boolean }> => {
  try {
    const { data: poapResponse }: { data: PoapResponse } = await axios.get(
      `${config.backendUrl}/assets/poap/eventDetails/${poapId}`
    );

    const { voiceChannelId, discordServerId } = poapResponse;

    await couchDbClient.voiceEvents.insert({
      _id: `${guildId}:${poapId}`,
      startedAt: timestamp || dayjs().unix(),
      voiceChannelId,
      poapId,
      isActive: true,
    });

    // if there is timestamp, the request came from the frontend through be
    if (!timestamp) {
      await axios.post(`${config.backendUrl}/assets/poap/setTimestamp`, {
        poapId,
        action: "START",
        timestamp: dayjs().unix(),
      });
    }

    await updateVoiceParticipationWhenEventStarts(
      poapId,
      voiceChannelId,
      discordServerId
    );

    return { started: true };
  } catch (error) {
    logger.error(
      `startVoiceEvent failed to insert into CouchDB ${error.message}`
    );
    throw new Error(
      "Unfortunately, the startVoiceEvent has failed, please try again later or contact us!"
    );
  }
};

const stopVoiceEvent = async (
  guildId: number,
  poapId: number,
  timestamp?: number
): Promise<{ stopped: true }> => {
  try {
    const couchResult = await couchDbClient.voiceEvents.get(
      `${guildId}:${poapId}`
    );
    if (couchResult) {
      const { _rev, startedAt, voiceChannelId } = couchResult;
      const endedAt = timestamp || dayjs().unix();

      const { data: poapResponse }: { data: PoapResponse } = await axios.get(
        `${config.backendUrl}/assets/poap/eventDetails/${poapId}`
      );

      await couchDbClient.voiceEvents.insert({
        _id: `${guildId}:${poapId}`,
        // eslint-disable-next-line no-underscore-dangle
        _rev,
        startedAt,
        voiceChannelId,
        poapId,
        endedAt,
        isActive: false,
      });

      // if there is timestamp, the request came from the frontend through be
      if (!timestamp) {
        await axios.post(`${config.backendUrl}/assets/poap/setTimestamp`, {
          poapId,
          action: "STOP",
          timestamp: dayjs().unix(),
        });
      }

      await updateParticipationdWhenEventEnds(poapId, endedAt);

      // todo batchrequest? - participatedUsers save all?
      await axios.post(
        `${config.backendUrl}/assets/poap/evaluateVoiceParticipation`,
        {
          poapId,
          guildId,
        }
      );
    }
    return { stopped: true };
  } catch (error) {
    logger.error(
      `stopVoiceEvent - Invalid voice event identifier ${guildId}:${poapId}.`
    );
    throw new Error(
      "Unfortunately, the stopVoiceEvent has failed. There might be noone participated in your event."
    );
  }
};

const resetVoiceEvent = async (
  guildId: number,
  poapId: number
): Promise<boolean> => {
  try {
    const couchResult = await couchDbClient.voiceEvents.get(
      `${guildId}:${poapId}`
    );
    if (couchResult) {
      const { _rev, _id } = couchResult;

      await couchDbClient.voiceEvents.destroy(_id, _rev);

      return true;
    }
    return false;
  } catch (error) {
    logger.error(
      `resetVoiceEvent - failed voice event reset ${guildId}:${poapId}.`
    );
    return false;
  }
};

const handleUserStateDuringVoiceEvent = async (
  oldState: VoiceState,
  newState: VoiceState
): Promise<any> => {
  logger.verbose(
    `handleUserStateDuringVoiceEvent - ${oldState.selfDeaf} ${newState.selfDeaf}`
  );

  // User joined or changed voiceChannels deafened
  if (
    (oldState.channelId === null && newState.selfDeaf) ||
    (oldState.selfDeaf !== null && oldState.selfDeaf && newState.selfDeaf)
  ) {
    logger.verbose("nothing because deafened");
    return;
  }

  if (hasUserBeenDeafened(oldState, newState)) {
    // participating
    const activePoapId = await getPoapIdIfChannelHasActiveVoiceEvent(
      newState.channelId
    );
    if (activePoapId) {
      // start joinedAt
      logger.verbose(`beenDeafened && activeEvent && update joinedAt`);
      await updateUserVoiceParticipation(
        newState.member.id,
        activePoapId,
        true
      );
    }
  }

  if (hasUserBeenUnDeafened(oldState, newState)) {
    const activePoapId = await getPoapIdIfChannelHasActiveVoiceEvent(
      newState.channelId
    );
    if (activePoapId) {
      logger.verbose(`beenUnDeafened && activeEvent && update leftAt`);
      await updateUserVoiceParticipation(
        newState.member.id,
        activePoapId,
        false
      );
    }
  }

  if (hasUserChangedChannels(oldState, newState)) {
    if (oldState.channelId !== null) {
      const activePoapId = await getPoapIdIfChannelHasActiveVoiceEvent(
        oldState.channelId
      );
      if (activePoapId) {
        logger.verbose(`update leftAt activeEvent`);
        await updateUserVoiceParticipation(
          oldState.member.id,
          activePoapId,
          false
        );
      }
    }
    if (newState.channelId !== null && !newState.selfDeaf) {
      const activePoapId = await getPoapIdIfChannelHasActiveVoiceEvent(
        newState.channelId
      );
      if (activePoapId) {
        // participating
        logger.verbose(`update joinedAt activeEvent`);
        await updateUserVoiceParticipation(
          newState.member.id,
          activePoapId,
          true
        );
      }
    }
  }
};

export {
  startVoiceEvent,
  stopVoiceEvent,
  resetVoiceEvent,
  handleUserStateDuringVoiceEvent,
};
