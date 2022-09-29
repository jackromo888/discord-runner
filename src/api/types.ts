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
      platformGuildData: { inviteChannel: string; joinButton?: boolean };
    }
  | { success: boolean };

type RoleEventParams = {
  action: "CREATE" | "UPDATE" | "DELETE";
  roleName: string;
  platformGuildId: string;
  platformGuildData: { inviteChannel: string };
  platformRoleId?: string;
  platformRoleData?: {
    isGuarded?: boolean;
    gatedChannels?: string[];
    grantAccessToExistingUsers: boolean;
  };
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
type ButtonMetaData = Partial<{
  title: string;
  description: string;
  button: string;
  isJoinButton: boolean;
}>;

type Platform = {
  id: number;
  isGuarded: boolean;
  platformId: string;
  type: string;
  platformName: string;
};

type Role = {
  id: number;
  name: string;
  platforms: {
    roleId: number;
    platformId: number;
    inviteChannel: string;
    discordRoleId: string;
  }[];
};

type GuildOfServer = {
  id: number;
  name: string;
  urlName: string;
  description: string;
  imageUrl: string;
  platforms: Platform[];
  roles: Role[];
  poaps: any[];
};

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

type TokenExchangeResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
};

type ResolveUserParams =
  | {
      access_token: string;
      code: undefined;
      redirect_url: undefined;
    }
  | { access_token: undefined; code: string; redirect_url: string };

type ResolveUserResopnse = {
  platformUserId: string;
  platformUserData: {
    accessToken: string;
    expiresIn?: number;
    refreshToken?: string;
  };
};

type DiscordServerData = {
  id: string;
  name: string;
  icon: string;
  owner: boolean;
  permissions: number;
  features: string[];
  permissions_new: string;
};

type VoiceEvents = {
  isActive: boolean;
  startedAt?: number;
  endedAt?: number;
  voiceChannelId: string;
  poapId: number;
};

type VoiceParticipation = {
  discordId: string;
  discordTag: string;
  joinedAt: number;
  participated: number;
  poapId: number;
};

type VoiceRequirement =
  | {
      percent: number;
      minute?: never;
    }
  | {
      percent?: never;
      minute: number;
    };

type PoapResponse = {
  poapIdentifier: number;
  voiceChannelId: string;
  voiceRequirement: VoiceRequirement;
  discordServerId: string;
};

export {
  ButtonMetaData,
  CreateChannelParams,
  DeleteChannelAndRoleParams,
  UserResult,
  ErrorResult,
  ActionError,
  CreateRoleResult,
  DiscordChannel,
  SelectMenuOption,
  NewPoll,
  Poll,
  Reaction,
  Vote,
  GuildOfServer,
  Emote,
  ChannelObj,
  AccessEventParams,
  GuildEventParams,
  GuildEventResponse,
  RoleEventParams,
  RoleEventResponse,
  ResolveUserResopnse,
  VoiceEvents,
  VoiceParticipation,
  PoapResponse,
  ResolveUserParams,
  TokenExchangeResponse,
  DiscordServerData,
};
