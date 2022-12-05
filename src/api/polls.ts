/* eslint no-return-await: "off" */
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { ChannelType, CommandInteraction, TextChannel } from "discord.js";
import config from "../config";
import Main from "../Main";
import logger from "../utils/logger";
import pollStorage from "./pollStorage";
import { NewPoll, Poll } from "./types";

const createPollText = async (
  poll: NewPoll | Poll,
  results = undefined
): Promise<string> => {
  const { options, reactions, expDate } = poll;

  const [pollResults, numOfVoters] = results
    ? results.data
    : [options.map(() => 0), 0];

  const allVotes = pollResults.reduce((a, b) => a + b, 0);

  const optionsText = options
    .map((option, idx) => {
      const perc = (pollResults[idx] / (allVotes || 1)) * 100;

      return `${reactions[idx]} ${option}\n▫️${
        Number.isInteger(perc) ? perc : perc.toFixed(2)
      }%`;
    })
    .join("\n\n");

  dayjs.extend(utc);

  const dateText = dayjs().isAfter(dayjs.unix(+expDate))
    ? "Poll has already ended."
    : `Poll ends on <t:${expDate}>`;

  const votersText = `👥 ${numOfVoters} person${
    numOfVoters === 1 ? "" : "s"
  } voted so far.`;

  return `${optionsText}\n\n${dateText}\n\n${votersText}`;
};

const createPoll = async (poll: NewPoll): Promise<boolean> => {
  try {
    const channel = Main.client.channels.cache.get(
      poll.channelId
    ) as TextChannel;

    await axios.post(
      `${config.backendUrl}/poll`,
      {
        platform: config.platform,
        platformId: channel.guildId,
        startDate: dayjs().unix(),
        ...poll,
      },
      { timeout: 150000 }
    );

    return true;
  } catch (e) {
    logger.error(e);
  }

  return false;
};

const pollBuildResponse = async (
  interaction: CommandInteraction
): Promise<boolean> => {
  const poll = pollStorage.getPoll(interaction.user.id);

  if (poll) {
    if (poll.requirementId === 0) {
      interaction.reply({
        content: "You must choose a token for weighting.",
        ephemeral: interaction.channel.type === ChannelType.GuildText,
      });

      return true;
    }
    if (poll.question === "") {
      interaction.reply({
        content: "The poll must have a question.",
        ephemeral: interaction.channel.type === ChannelType.GuildText,
      });

      return true;
    }
    if (poll.options.length <= 1) {
      interaction.reply({
        content: "The poll must have at least two options.",
        ephemeral: interaction.channel.type === ChannelType.GuildText,
      });

      return true;
    }
    if (poll.options.length !== poll.reactions.length) {
      interaction.reply({
        content: "The amount of options and reactions must be the same.",
        ephemeral: interaction.channel.type === ChannelType.GuildText,
      });

      return true;
    }
    if (poll.expDate === "") {
      interaction.reply({
        content: "The poll must have an expriation date.",
        ephemeral: interaction.channel.type === ChannelType.GuildText,
      });

      return true;
    }
  } else {
    interaction.reply({
      content: "You don't have an active poll creation process.",
      ephemeral: interaction.channel.type === ChannelType.GuildText,
    });

    return true;
  }

  return false;
};

export { createPollText, createPoll, pollBuildResponse };
