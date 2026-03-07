import { GivEnergyInverter, discover } from "givenergy-modbus";
import type { InverterSnapshot } from "givenergy-modbus";
import type { AppConfig } from "./types.js";
import { TopicBuilder } from "./topics.js";
import { createMqttClient, type MqttWrapper } from "./mqtt-client.js";
import { publishSnapshot } from "./publisher.js";
import { setupCommander } from "./commander.js";
import { publishDiscovery } from "./discovery.js";
import { logger } from "./logger.js";

export class Bridge {
  private mqtt: MqttWrapper | null = null;
  private inverter: GivEnergyInverter | null = null;
  private topics: TopicBuilder | null = null;
  private stopping = false;

  constructor(private config: AppConfig) {
    logger.setLevel(config.log.level);
  }

  async start(): Promise<void> {
    const host = await this.resolveHost();
    logger.info("Connecting to inverter at %s:%d", host, this.config.inverter.port);

    // Connect to inverter first to get serial number
    this.inverter = await GivEnergyInverter.connect({
      host,
      port: this.config.inverter.port,
      pollIntervalMs: this.config.inverter.pollIntervalMs,
      autoReconnect: true,
    });

    const snapshot = this.inverter.getData();
    const serial = snapshot.serialNumber;
    this.topics = new TopicBuilder(this.config.mqtt.topicPrefix, serial);

    logger.info(
      "Connected to inverter %s (%s)",
      serial,
      snapshot.generation,
    );

    // Connect to MQTT with LWT
    this.mqtt = await createMqttClient(
      this.config.mqtt,
      this.topics.status(),
    );

    // Publish HA discovery if enabled
    if (this.config.homeassistant.enabled) {
      await publishDiscovery(
        this.mqtt,
        this.config.homeassistant.discoveryPrefix,
        this.topics,
        snapshot,
      );
    }

    // Publish initial snapshot
    await publishSnapshot(this.mqtt, this.topics, snapshot);

    // Subscribe to commands
    await this.mqtt.subscribe(this.topics.commandSubscription());
    setupCommander(this.mqtt, this.topics, this.inverter);

    // Publish online status
    await this.mqtt.publish(this.topics.status(), "online", true);

    // Wire up data events
    this.inverter.on("data", async (snap: InverterSnapshot) => {
      if (this.stopping || !this.mqtt || !this.topics) return;
      try {
        await publishSnapshot(this.mqtt, this.topics, snap);
      } catch (err) {
        logger.error(
          "Failed to publish snapshot: %s",
          err instanceof Error ? err.message : String(err),
        );
      }
    });

    // Wire up inverter connection events
    this.inverter.on("lost", async () => {
      if (this.stopping || !this.mqtt || !this.topics) return;
      logger.warn("Inverter connection lost");
      try {
        await this.mqtt.publish(this.topics.status(), "offline", true);
      } catch {
        // MQTT may also be disconnected
      }
    });

    this.inverter.on("reconnected", async () => {
      if (this.stopping || !this.mqtt || !this.topics || !this.inverter) return;
      logger.info("Inverter reconnected");
      try {
        await this.mqtt.publish(this.topics.status(), "online", true);
        const snap = this.inverter.getData();
        await publishSnapshot(this.mqtt, this.topics, snap);
      } catch (err) {
        logger.error(
          "Failed to publish after reconnect: %s",
          err instanceof Error ? err.message : String(err),
        );
      }
    });

    // Re-publish discovery on MQTT reconnect
    this.mqtt.client.on("connect", async () => {
      if (this.stopping || !this.mqtt || !this.topics || !this.inverter) return;
      logger.info("MQTT reconnected, re-publishing discovery and state");
      try {
        if (this.config.homeassistant.enabled) {
          const snap = this.inverter.getData();
          await publishDiscovery(
            this.mqtt,
            this.config.homeassistant.discoveryPrefix,
            this.topics,
            snap,
          );
        }
        await this.mqtt.subscribe(this.topics.commandSubscription());
        await this.mqtt.publish(this.topics.status(), "online", true);
      } catch (err) {
        logger.error(
          "Failed to re-publish on MQTT reconnect: %s",
          err instanceof Error ? err.message : String(err),
        );
      }
    });

    logger.info("Bridge started for inverter %s", serial);
  }

  async stop(): Promise<void> {
    this.stopping = true;
    logger.info("Stopping bridge...");

    if (this.mqtt && this.topics) {
      try {
        await this.mqtt.unsubscribe(this.topics.commandSubscription());
        await this.mqtt.publish(this.topics.status(), "offline", true);
        await this.mqtt.disconnect();
      } catch {
        // Best-effort cleanup
      }
    }

    if (this.inverter) {
      try {
        await this.inverter.stop();
      } catch {
        // Best-effort cleanup
      }
    }

    logger.info("Bridge stopped");
  }

  private async resolveHost(): Promise<string> {
    if (this.config.inverter.host) {
      return this.config.inverter.host;
    }

    logger.info("No host configured, discovering inverters on local network...");
    const devices = await discover();
    if (devices.length === 0) {
      throw new Error(
        "No inverters found on local network. Specify --host or inverter.host in config.",
      );
    }
    logger.info("Found inverter at %s", devices[0].host);
    return devices[0].host;
  }
}
