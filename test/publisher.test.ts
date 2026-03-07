import { describe, it, expect, beforeEach } from "vitest";
import { publishSnapshot, STATE_MAPPINGS, BATTERY_MAPPINGS } from "../src/publisher.js";
import { TopicBuilder } from "../src/topics.js";
import { createMockSnapshot, createMockMqtt } from "./helpers.js";

describe("publishSnapshot", () => {
  const topics = new TopicBuilder("givenergy", "CE1234G567");
  let mqtt: ReturnType<typeof createMockMqtt>;
  const snapshot = createMockSnapshot();

  beforeEach(() => {
    mqtt = createMockMqtt();
  });

  it("publishes full snapshot JSON as retained", async () => {
    await publishSnapshot(mqtt, topics, snapshot);
    const snapshotMsg = mqtt.published.find(
      (p) => p.topic === "givenergy/CE1234G567/state/snapshot",
    );
    expect(snapshotMsg).toBeDefined();
    expect(snapshotMsg!.retain).toBe(true);
    expect(JSON.parse(snapshotMsg!.payload)).toEqual(
      JSON.parse(JSON.stringify(snapshot)),
    );
  });

  it("publishes all individual state topics as retained", async () => {
    await publishSnapshot(mqtt, topics, snapshot);
    for (const mapping of STATE_MAPPINGS) {
      const msg = mqtt.published.find(
        (p) => p.topic === `givenergy/CE1234G567/state/${mapping.key}`,
      );
      expect(msg, `Missing topic for ${mapping.key}`).toBeDefined();
      expect(msg!.retain).toBe(true);
      expect(msg!.payload).toBe(mapping.extract(snapshot));
    }
  });

  it("publishes correct power values", async () => {
    await publishSnapshot(mqtt, topics, snapshot);
    const find = (key: string) =>
      mqtt.published.find(
        (p) => p.topic === `givenergy/CE1234G567/state/${key}`,
      );
    expect(find("solar_power")!.payload).toBe("3500");
    expect(find("battery_power")!.payload).toBe("-1000");
    expect(find("grid_power")!.payload).toBe("500");
    expect(find("battery_soc")!.payload).toBe("85");
  });

  it("publishes boolean states as ON/OFF", async () => {
    await publishSnapshot(mqtt, topics, snapshot);
    const find = (key: string) =>
      mqtt.published.find(
        (p) => p.topic === `givenergy/CE1234G567/state/${key}`,
      );
    expect(find("enable_charge")!.payload).toBe("ON");
    expect(find("enable_discharge")!.payload).toBe("ON");
  });

  it("publishes battery module data", async () => {
    await publishSnapshot(mqtt, topics, snapshot);
    for (const mapping of BATTERY_MAPPINGS) {
      const msg = mqtt.published.find(
        (p) =>
          p.topic === `givenergy/CE1234G567/battery/BT1234G567/${mapping.key}`,
      );
      expect(msg, `Missing battery topic for ${mapping.key}`).toBeDefined();
      expect(msg!.retain).toBe(true);
    }
  });

  it("publishes correct battery values", async () => {
    await publishSnapshot(mqtt, topics, snapshot);
    const find = (key: string) =>
      mqtt.published.find(
        (p) => p.topic === `givenergy/CE1234G567/battery/BT1234G567/${key}`,
      );
    expect(find("soc")!.payload).toBe("85");
    expect(find("voltage")!.payload).toBe("51.2");
    expect(find("temp_max")!.payload).toBe("23.5");
    expect(find("cycles")!.payload).toBe("450");
  });

  it("publishes correct total count of messages", async () => {
    await publishSnapshot(mqtt, topics, snapshot);
    // 1 snapshot + STATE_MAPPINGS + (1 battery * BATTERY_MAPPINGS)
    const expected =
      1 + STATE_MAPPINGS.length + snapshot.batteries.length * BATTERY_MAPPINGS.length;
    expect(mqtt.published.length).toBe(expected);
  });
});
