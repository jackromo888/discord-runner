import tracer from "dd-trace";
import express, { Application } from "express";
import config from "../config";
import logger from "../utils/logger";
import router from "./router";

if (config.nodeEnv === "production") {
  tracer.init({ profiling: true });
}

export default class API {
  private api: Application;

  private portNumber: string | number;

  constructor() {
    this.api = express();
    this.portNumber = config.api.port;

    this.setup();
  }

  private setup(): void {
    this.api.disable("x-powered-by");
    this.api.set("json spaces", 2);

    this.api.use(express.json({ limit: "6mb" }));
    this.api.use(config.api.prefix, router());

    this.start();
  }

  private start(): void {
    this.api.listen(this.portNumber, () =>
      logger.info(`API listening on ${config.api.port}`)
    );
  }
}
