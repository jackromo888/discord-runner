type AccessEventParams = {
  action: "ADD" | "REMOVE";
  platformUserId: string;
  platformGuildId: string;
  guildName: string;
  platformGuildData: { inviteChannel: string };
  roles: {
    roleName: string;
    platformRoleId: string;
    platformRoleData?: {
      isGuarded?: boolean;
    };
  }[];
};

type GuildEventParams = {
  action: "CREATE" | "UPDATE" | "DELETE";
  guildName: string;
  platformGuildId: string;
  platformGuildData?: { inviteChannel?: string };
};

type GuildEventResponse =
  | {
      platformGuildId: string;
      platformGuildData: { inviteChannel: string };
    }
  | { success: boolean };

type RoleEventParams = {
  action: "CREATE" | "UPDATE" | "DELETE";
  roleName: string;
  platformGuildId: string;
  platformGuildData: { inviteChannel: string };
  platformRoleId?: string;
  platformRoleData?: { isGuarded?: boolean; gatedChannels?: string[] };
};

type RoleEventResponse =
  | {
      platformGuildData: { inviteChannel: string };
      platformRoleId: string;
    }
  | { success: boolean };

type CreateChannelParams = {
  guildId: string;
  channelName: string;
};

type DeleteChannelAndRoleParams = {
  guildId: string;
  roleId: string;
  channelId: string;
};

type UserResult = {
  username: string;
  discriminator: string;
  avatar: string;
  roles: string[];
};

type ErrorResult = {
  errors: { msg: string; value: string[] }[];
};

class ActionError extends Error {
  ids: string[];

  constructor(message: string, ids: string[]) {
    super(message);
    this.ids = ids;
  }
}

type CreateRoleResult = {
  id: string;
};

type DiscordChannel = {
  id: string;
  name: string;
};

type InviteData = {
  code: string;
  inviteChannelId: string;
};

type SelectMenuOption = {
  label: string;
  description: string;
  value: string;
};

type NewPoll = {
  roles: SelectMenuOption[];
  requirements: SelectMenuOption[];
  requirementId: number;
  channelId: string;
  question: string;
  options: string[];
  reactions: string[];
  expDate: string;
};

type Poll = {
  id: number;
  question: string;
  startDate: number;
  expDate: number;
  options: string[];
  reactions: string[];
};

type Reaction = {
  name: string;
  users: string[];
};

type Vote = {
  platform: "DISCORD" | "TELEGRAM";
  pollId: number;
  platformUserId: string;
  optionIndex: number;
};
type SendJoinMeta = Partial<{
  title: string;
  description: string;
  button: string;
}>;

type Emote = {
  name: string;
  id: string;
  image: string;
  animated: boolean;
};

type ChannelObj = {
  name: string;
  id: string;
};

type ResolveUserResopnse = {
  platformUserId: string;
  platformUserData: {
    access_token: string;
  };
};

export {
  SendJoinMeta,
  CreateChannelParams,
  DeleteChannelAndRoleParams,
  UserResult,
  ErrorResult,
  ActionError,
  CreateRoleResult,
  DiscordChannel,
  InviteData,
  SelectMenuOption,
  NewPoll,
  Poll,
  Reaction,
  Vote,
  Emote,
  ChannelObj,
  AccessEventParams,
  GuildEventParams,
  GuildEventResponse,
  RoleEventParams,
  RoleEventResponse,
  ResolveUserResopnse,
};
