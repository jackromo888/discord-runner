export type ManageRolesParams = {
  guildId: string;
  userId: string;
  roleIds: string[];
  message: string;
};

export type UserResult = {
  username: string;
  discriminator: string;
  avatar: string;
  roles: string[];
};

export type InviteResult = {
  code: string;
};

export type ErrorResult = {
  errors: { msg: string; value: string[] }[];
};

export class ActionError extends Error {
  ids: string[];

  constructor(message: string, ids: string[]) {
    super(message);
    this.ids = ids;
  }
}
