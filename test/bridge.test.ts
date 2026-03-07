import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import type { AppConfig } from "../src/types.js";
import { createMockSnapshot, createMockMqtt } from "./helpers.js";

// Mock givenergy-modbus
const mockSnapshot = createMockSnapshot();
const mockInverter = Object.assign(new EventEmitter(), {
  getData: vi.fn().mockReturnValue(mockSnapshot),
  stop: vi.fn().mockResolvedValue(undefined),
});

vi.mock("givenergy-modbus", () => ({
  GivEnergyInverter: {
    connect: vi.fn().mockResolvedValue(mockInverter),
  },
  discover: vi.fn().mockResolvedValue([{ host: "192.168.1.100" }]),
}));

// Mock mqtt-client
const mockMqtt = createMockMqtt();
mockMqtt.client = Object.assign(new EventEmitter(), {}) as any;

vi.mock("../src/mqtt-client.js", () => ({
  createMqttClient: vi.fn().mockResolvedValue(mockMqtt),
}));

// Import after mocks
const { Bridge } = await import("../src/bridge.js");

const TEST_CONFIG: AppConfig = {
  inverter: {
    host: "192.168.1.100",
    port: 8899,
    pollIntervalMs: 15000,
  },
  mqtt: {
    url: "mqtt://localhost:1883",
    username: "",
    password: "",
    clientId: "givenergy-mqtt",
    topicPrefix: "givenergy",
  },
  homeassistant: {
    enabled: true,
    discoveryPrefix: "homeassistant",
  },
  log: {
    level: "error", // suppress logs in tests
  },
};

describe("Bridge", () => {
  beforeEach(() => {
    mockMqtt.published.length = 0;
    mockMqtt.subscribed.length = 0;
    mockMqtt.unsubscribed.length = 0;
    mockMqtt.messageHandlers.length = 0;
    mockInverter.removeAllListeners();
    vi.clearAllMocks();
    mockInverter.getData.mockReturnValue(mockSnapshot);
  });

  it("starts and publishes discovery, snapshot, and online status", async () => {
    const bridge = new Bridge(TEST_CONFIG);
    await bridge.start();

    // Should have published HA discovery configs (retained)
    const discoveryMsgs = mockMqtt.published.filter((p) =>
      p.topic.startsWith("homeassistant/"),
    );
    expect(discoveryMsgs.length).toBeGreaterThan(0);

    // Should have published snapshot state topics
    const stateMsgs = mockMqtt.published.filter((p) =>
      p.topic.includes("/state/"),
    );
    expect(stateMsgs.length).toBeGreaterThan(0);

    // Should have published online status
    const statusMsg = mockMqtt.published.find(
      (p) => p.topic === "givenergy/CE1234G567/status",
    );
    expect(statusMsg).toBeDefined();
    expect(statusMsg!.payload).toBe("online");
    expect(statusMsg!.retain).toBe(true);

    // Should have subscribed to commands
    expect(mockMqtt.subscribed).toContain(
      "givenergy/CE1234G567/command/+",
    );

    await bridge.stop();
  });

  it("publishes data on inverter data events", async () => {
    const bridge = new Bridge(TEST_CONFIG);
    await bridge.start();

    const countBefore = mockMqtt.published.length;
    mockInverter.emit("data", mockSnapshot);

    // Wait for async handler
    await new Promise((r) => setTimeout(r, 10));

    expect(mockMqtt.published.length).toBeGreaterThan(countBefore);

    await bridge.stop();
  });

  it("publishes offline on inverter lost", async () => {
    const bridge = new Bridge(TEST_CONFIG);
    await bridge.start();

    mockInverter.emit("lost", new Error("connection lost"));
    await new Promise((r) => setTimeout(r, 10));

    const offlineMsg = mockMqtt.published
      .filter((p) => p.topic === "givenergy/CE1234G567/status")
      .pop();
    expect(offlineMsg!.payload).toBe("offline");

    await bridge.stop();
  });

  it("publishes online on inverter reconnect", async () => {
    const bridge = new Bridge(TEST_CONFIG);
    await bridge.start();

    mockMqtt.published.length = 0;
    mockInverter.emit("reconnected");
    await new Promise((r) => setTimeout(r, 10));

    const onlineMsg = mockMqtt.published.find(
      (p) => p.topic === "givenergy/CE1234G567/status",
    );
    expect(onlineMsg!.payload).toBe("online");

    await bridge.stop();
  });

  it("stops gracefully", async () => {
    const bridge = new Bridge(TEST_CONFIG);
    await bridge.start();
    await bridge.stop();

    expect(mockMqtt.unsubscribed).toContain(
      "givenergy/CE1234G567/command/+",
    );
    const lastStatus = mockMqtt.published
      .filter((p) => p.topic === "givenergy/CE1234G567/status")
      .pop();
    expect(lastStatus!.payload).toBe("offline");
    expect(mockInverter.stop).toHaveBeenCalled();
  });

  it("skips HA discovery when disabled", async () => {
    const config = {
      ...TEST_CONFIG,
      homeassistant: { ...TEST_CONFIG.homeassistant, enabled: false },
    };
    const bridge = new Bridge(config);
    await bridge.start();

    const discoveryMsgs = mockMqtt.published.filter((p) =>
      p.topic.startsWith("homeassistant/"),
    );
    expect(discoveryMsgs.length).toBe(0);

    await bridge.stop();
  });
});
