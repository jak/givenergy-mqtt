import mqtt, { type MqttClient, type IClientOptions } from "mqtt";
import type { MqttConfig } from "./types.js";
import { logger } from "./logger.js";

export interface MqttWrapper {
  client: MqttClient;
  publish(topic: string, payload: string, retain?: boolean): Promise<void>;
  subscribe(topic: string): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
  onMessage(handler: (topic: string, payload: Buffer) => void): void;
  disconnect(): Promise<void>;
}

export function createMqttClient(
  config: MqttConfig,
  lwtTopic: string,
): Promise<MqttWrapper> {
  return new Promise((resolve, reject) => {
    const options: IClientOptions = {
      clientId: config.clientId,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 0, // Disable auto-reconnect for initial connection
      will: {
        topic: lwtTopic,
        payload: Buffer.from("offline"),
        qos: 1,
        retain: true,
      },
    };

    if (config.username) options.username = config.username;
    if (config.password) options.password = config.password;

    logger.info("Connecting to MQTT broker at %s", config.url);
    const client = mqtt.connect(config.url, options);

    const onConnect = () => {
      client.removeListener("error", onError);

      // Enable auto-reconnect after initial connection succeeds
      client.options.reconnectPeriod = 5000;

      logger.info("Connected to MQTT broker");

      const wrapper: MqttWrapper = {
        client,
        async publish(topic, payload, retain = false) {
          return new Promise<void>((res, rej) => {
            client.publish(topic, payload, { qos: 1, retain }, (err) => {
              if (err) rej(err);
              else res();
            });
          });
        },
        async subscribe(topic) {
          return new Promise<void>((res, rej) => {
            client.subscribe(topic, { qos: 1 }, (err) => {
              if (err) rej(err);
              else res();
            });
          });
        },
        async unsubscribe(topic) {
          return new Promise<void>((res, rej) => {
            client.unsubscribe(topic, (err) => {
              if (err) rej(err);
              else res();
            });
          });
        },
        onMessage(handler) {
          client.on("message", handler);
        },
        async disconnect() {
          return new Promise<void>((res) => {
            client.end(false, () => res());
          });
        },
      };

      resolve(wrapper);
    };

    const onError = (err: Error) => {
      client.removeListener("connect", onConnect);
      client.end(true);
      const detail = err.message || (err as any).code || String(err);
      reject(new Error(`Failed to connect to MQTT broker at ${config.url}: ${detail}`));
    };

    client.once("connect", onConnect);
    client.once("error", onError);

    client.on("reconnect", () => {
      logger.info("Reconnecting to MQTT broker...");
    });

    client.on("offline", () => {
      logger.warn("MQTT broker connection lost");
    });
  });
}
