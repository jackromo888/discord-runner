export type UserResult = {
  username: string;
  discriminator: string;
  avatar: string;
  roles: string[];
};

export type InviteResult = {
  code: string;
  error: string;
};

export class ActionError {
  error: string;
}
