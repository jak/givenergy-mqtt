import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns defaults when no config file, env, or args", () => {
    const config = loadConfig();
    expect(config.inverter.port).toBe(8899);
    expect(config.inverter.pollIntervalMs).toBe(15000);
    expect(config.mqtt.url).toBe("mqtt://localhost:1883");
    expect(config.mqtt.topicPrefix).toBe("givenergy");
    expect(config.homeassistant.enabled).toBe(true);
    expect(config.homeassistant.discoveryPrefix).toBe("homeassistant");
    expect(config.log.level).toBe("info");
  });

  it("cli args override defaults", () => {
    const config = loadConfig({
      host: "10.0.0.1",
      port: 9999,
      topicPrefix: "solar",
      logLevel: "debug",
    });
    expect(config.inverter.host).toBe("10.0.0.1");
    expect(config.inverter.port).toBe(9999);
    expect(config.mqtt.topicPrefix).toBe("solar");
    expect(config.log.level).toBe("debug");
  });

  it("env vars override defaults", () => {
    process.env.GIVENERGY_HOST = "192.168.1.50";
    process.env.MQTT_URL = "mqtt://broker:1883";
    process.env.LOG_LEVEL = "warn";

    const config = loadConfig();
    expect(config.inverter.host).toBe("192.168.1.50");
    expect(config.mqtt.url).toBe("mqtt://broker:1883");
    expect(config.log.level).toBe("warn");
  });

  it("cli args override env vars", () => {
    process.env.GIVENERGY_HOST = "192.168.1.50";

    const config = loadConfig({ host: "10.0.0.1" });
    expect(config.inverter.host).toBe("10.0.0.1");
  });

  it("loads config from specified file", () => {
    const config = loadConfig({ config: "/nonexistent/path.yml" });
    // Should not throw, just use defaults
    expect(config.inverter.port).toBe(8899);
  });

  it("preserves unset defaults when partially overriding", () => {
    const config = loadConfig({ host: "10.0.0.1" });
    expect(config.mqtt.clientId).toBe("givenergy-mqtt");
    expect(config.homeassistant.enabled).toBe(true);
  });
});
