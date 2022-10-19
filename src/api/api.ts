import express, { Request, Response } from "express";
import config from "../config";
import logger from "../utils/logger";
import { getErrorResult } from "../utils/utils";
import router from "./router";

const createApi = () => {
  const api = express();
  api.disable("x-powered-by");

  api.use((err: any, _req: Request, res: Response) => {
    res
      .status(err.type === "entity.too.large" ? 413 : 500)
      .json(getErrorResult(err.message));
  });

  api.use(express.json({ limit: "6mb" }));
  api.use(config.api.prefix, router());

  api.listen(config.api.port, () =>
    logger.info(`API listening on ${config.api.port}`)
  );

  return api;
};

export default createApi;
