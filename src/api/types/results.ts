export type UserResult = {
  username: string;
  discriminator: string;
  avatar: string;
  roles: string[];
};

export type InviteResult = {
  code: string;
};

export class ActionError {
  error: string;
}
