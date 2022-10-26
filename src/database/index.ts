import { createClient } from "redis";
import config from "../config";
import CouchDbClient from "./CouchDbClient";

const redisClient = createClient({ url: config.redisHost });

const couchDbClient = new CouchDbClient();

export { redisClient, couchDbClient };
