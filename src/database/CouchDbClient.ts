import Nano from "nano";
import { VoiceEvents, VoiceParticipation } from "../api/types";
import config from "../config";
import Health from "../services/healthService";
import logger from "../utils/logger";

const dbNames = {
  healthCheck: "health-check",
  voiceParticipation: "voice-participation",
  voiceEvents: "voice-events",
};

export default class CouchDbClient {
  nano: Nano.ServerScope;

  healthCheckDb: Nano.DocumentScope<{ value: string }>;

  voiceParticipation: Nano.DocumentScope<VoiceParticipation>;

  voiceEvents: Nano.DocumentScope<VoiceEvents>;

  constructor() {
    this.nano = Nano({ url: config.couchDbUrl });

    this.nano.db.list().then((dbList) => {
      Promise.all(
        Object.values(dbNames).map(async (dbName) => {
          if (!dbList.some((db) => db === dbName)) {
            await this.nano.db.create(dbName);
            logger.info(`CouchDB created: ${dbName}`);
          }
        })
      ).then(() => {
        this.healthCheckDb = this.nano.db.use(dbNames.healthCheck);
        this.voiceParticipation = this.nano.db.use(dbNames.voiceParticipation);
        this.voiceEvents = this.nano.db.use(dbNames.voiceEvents);

        Health.status.couchDbReady = true;
      });
    });
  }
}
