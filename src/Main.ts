/* eslint no-underscore-dangle: ["error", { "allowAfterThis": true }] */
import { Client } from "@typeit/discord";
import * as dotenv from "dotenv";
import { exit } from "process";

dotenv.config({ path: `${__dirname}/.env` });

export default class Main {
  private static _client: Client;

  private static _prefix: string;

  static get Client(): Client {
    return this._client;
  }

  static get prefix(): string {
    return this._prefix;
  }

  static start(): void {
    // TODO: prefix will come from the API
    this._prefix = process.env.PREFIX;
    if (!this._prefix) {
      console.error(
        "ERROR: You need to specify the bot's PREFIX in your .env file."
      );
      exit(1);
    }

    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      console.error(
        "ERROR: You need to specify the bot's DISCORD_TOKEN in your .env file."
      );
      exit(1);
    }

    this._client = new Client();
    this._client.login(token, `${__dirname}/*.ts`, `${__dirname}/*.js`);
  }
}

Main.start();
