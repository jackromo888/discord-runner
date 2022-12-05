import axios from "axios";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import Nano from "nano";
import { Colors, EmbedBuilder, WebhookClient } from "discord.js";
import {
  HealthCheckResponse,
  HealthCheckRunnerResponse,
  HealthReponse,
} from "../api/types";
import { couchDbClient, redisClient } from "../database";
import Main from "../Main";

import config from "../config";

dayjs.extend(duration);
dayjs.extend(relativeTime);

export default class Health {
  public static status = {
    runnerReady: false,
    interactionFail: false,
    couchDbReady: false,
    redisReady: false,
    noSigterm: true,
  };

  public static async sendNotification(): Promise<void> {
    const webhookClient = new WebhookClient({
      url: config.notificationWebhook,
    });

    const healthCheckErrorEmbed = new EmbedBuilder()
      .setTitle("Healthcheck Notification")
      .setColor(Colors.Red)
      .setDescription(`\`\`\`Interaction failed.\`\`\``)
      .setTimestamp()
      .setFooter({
        text: "Healthcheck Notification",
      });

    await webhookClient.send({
      content: `@everyone - Healthcheck Notification`,
      embeds: [healthCheckErrorEmbed],
    });
  }

  public static async checkHealth(fn: Function): Promise<HealthCheckResponse> {
    try {
      const start = performance.now();
      const healthy = await fn();
      const end = performance.now();

      return { healthy, latencyMs: end - start };
    } catch (e) {
      const error = e instanceof Error ? e.message : e;

      return { healthy: false, latencyMs: 0, error };
    }
  }

  public static async checkAPI(url: string): Promise<HealthCheckResponse> {
    try {
      const start = performance.now();
      const response = await axios.get(url);
      const end = performance.now();

      return {
        healthy: response.status === 200,
        latencyMs: end - start,
      };
    } catch (e) {
      const error = e instanceof Error ? e.message : e;

      return { healthy: false, latencyMs: 0, error };
    }
  }

  public static async checkRunner(): Promise<HealthCheckRunnerResponse> {
    if (this.status.interactionFail) {
      await this.sendNotification();

      return {
        healthy: false,
        runnerLatencyMs: 0,
        botGatewaylatencyMs: 0,
        error: "Interaction failed",
      };
    }

    if (Main.ready) {
      this.status.runnerReady = true;

      const start = performance.now();
      const discordBotGatewayPing = Main.client.ws.ping;
      const end = performance.now();
      const runnerLatency = end - start;

      return {
        healthy: true,
        runnerLatencyMs: runnerLatency,
        botGatewaylatencyMs: discordBotGatewayPing,
      };
    }

    return {
      healthy: false,
      runnerLatencyMs: 0,
      botGatewaylatencyMs: 0,
      error: "Runner is not ready",
    };
  }

  public static async getRunnerHealth(): Promise<object> {
    return {
      discord: await this.checkRunner(),
    };
  }

  public static async getServicesHealth(): Promise<
    object | HealthCheckResponse
  > {
    const apis: { name: string; healthCheckEndpoint: string }[] = [
      {
        name: "discordAPI",
        healthCheckEndpoint: `https://discord.com/api/v10/gateway`,
      },
    ];

    const results: { [key: string]: any } = {};
    await Promise.all(
      apis.map(async (api) => {
        results[api.name] = await this.checkAPI(api.healthCheckEndpoint);
      })
    );

    return results;
  }

  public static async checkRedis(): Promise<HealthCheckResponse> {
    try {
      const key = "healthcheck";
      const date = Date.now();

      const start = performance.now();

      await redisClient.set(key, date);
      const value = await redisClient.get(key);
      await redisClient.del(key);

      const end = performance.now();

      return {
        healthy: +value === date,
        latencyMs: end - start,
      };
    } catch (e: Error | any) {
      return {
        healthy: false,
        latencyMs: 0,
        error: e.message,
      };
    }
  }

  public static async checkCouch(): Promise<HealthCheckResponse> {
    const start = performance.now();

    let doc: Nano.DocumentGetResponse;

    try {
      doc = await couchDbClient.healthCheckDb.get("lastHealthCheck");
    } catch (e: Error | any) {
      // if the error is not a 404 (doc doesn't exist) then return a failed healthCheck
      if ((e as Nano.RequestError).statusCode !== 404) {
        return { healthy: false, latencyMs: 0, error: (e as Error).message };
      }

      // if the document doesn't exist, create it
      try {
        await couchDbClient.healthCheckDb.insert({
          _id: "lastHealthCheck",
          value: Date.now().toString(),
        });

        const end = performance.now();

        return { healthy: true, latencyMs: end - start };
      } catch (err: Error | any) {
        return { healthy: false, latencyMs: 0, error: err.message };
      }
    }

    // if the document exists, update it
    try {
      await couchDbClient.healthCheckDb.insert({
        ...doc,
        value: Date.now().toString(),
      });
      const end = performance.now();

      return { healthy: true, latencyMs: end - start };
    } catch (err: Error | any) {
      return { healthy: false, latencyMs: 0, error: err.message };
    }
  }

  public static async getDbHealth(): Promise<object> {
    return {
      redis: await this.checkRedis(),
      couchDb: await this.checkCouch(),
    };
  }

  public static isReady(): boolean {
    const { noSigterm, ...statuses } = this.status;

    const res = Object.values(statuses).every((v) => v === true);

    return res;
  }

  public static isLive(): boolean {
    return this.status.noSigterm;
  }

  public static async getHealth(): Promise<HealthReponse> {
    const upTime = `${dayjs.duration(process.uptime(), "s").humanize()} ago`;

    const runnerHealth: any = await this.getRunnerHealth();
    const dbsHealth: any = await this.getDbHealth();
    const servicesHealth: any = await this.getServicesHealth();

    const errors = Object.values(dbsHealth)
      .concat(Object.values(runnerHealth))
      .concat(Object.values(servicesHealth))
      .some((v: HealthCheckResponse) => v.healthy === false);

    return {
      status: errors ? 500 : 200,
      health: {
        ...config.instanceInfo,
        uptime: upTime,
        runner: runnerHealth.discord,
        dbs: dbsHealth,
        services: servicesHealth,
      },
    };
  }
}
