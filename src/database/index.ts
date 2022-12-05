import { createClient } from "redis";
import config from "../config";
import Health from "../services/healthService";
import CouchDbClient from "./CouchDbClient";

const redisClient = createClient({ url: config.redisHost });

const couchDbClient = new CouchDbClient();

redisClient.on("ready", () => {
  Health.status.redisReady = true;
});

export { redisClient, couchDbClient };
