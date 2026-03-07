import { describe, it, expect } from "vitest";
import {
  generateDiscoveryConfigs,
  publishDiscovery,
} from "../src/discovery.js";
import { TopicBuilder } from "../src/topics.js";
import { createMockSnapshot, createMockMqtt } from "./helpers.js";

describe("discovery", () => {
  const topics = new TopicBuilder("givenergy", "CE1234G567");
  const snapshot = createMockSnapshot();

  describe("generateDiscoveryConfigs", () => {
    const configs = generateDiscoveryConfigs(topics, snapshot);

    it("generates sensor configs", () => {
      const sensors = configs.filter((c) => c.component === "sensor");
      expect(sensors.length).toBeGreaterThan(20);
    });

    it("generates control configs", () => {
      const selects = configs.filter((c) => c.component === "select");
      const numbers = configs.filter((c) => c.component === "number");
      const switches = configs.filter((c) => c.component === "switch");
      const buttons = configs.filter((c) => c.component === "button");

      expect(selects.length).toBe(1); // inverter_mode
      expect(numbers.length).toBe(4); // charge_target, charge_rate, discharge_rate, battery_reserve
      expect(switches.length).toBe(2); // charge_schedule, discharge_schedule
      expect(buttons.length).toBe(2); // sync_datetime, reboot
    });

    it("all configs have device info", () => {
      for (const entity of configs) {
        const device = entity.config.device as Record<string, unknown>;
        expect(device.identifiers).toEqual(["givenergy_CE1234G567"]);
        expect(device.manufacturer).toBe("GivEnergy");
        expect(device.name).toBe("GivEnergy CE1234G567");
      }
    });

    it("all configs have unique_id", () => {
      const ids = configs.map((c) => c.config.unique_id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("all configs have availability_topic", () => {
      for (const entity of configs) {
        expect(entity.config.availability_topic).toBe(
          "givenergy/CE1234G567/status",
        );
      }
    });

    it("sensors have correct device_class for power sensors", () => {
      const solarPower = configs.find((c) => c.objectId === "solar_power");
      expect(solarPower!.config.device_class).toBe("power");
      expect(solarPower!.config.unit_of_measurement).toBe("W");
      expect(solarPower!.config.state_class).toBe("measurement");
    });

    it("energy sensors have total_increasing state_class", () => {
      const pvEnergy = configs.find((c) => c.objectId === "pv_energy_today");
      expect(pvEnergy!.config.device_class).toBe("energy");
      expect(pvEnergy!.config.unit_of_measurement).toBe("kWh");
      expect(pvEnergy!.config.state_class).toBe("total_increasing");
    });

    it("temperature sensors have correct device_class", () => {
      const temp = configs.find(
        (c) => c.objectId === "inverter_heatsink_temp",
      );
      expect(temp!.config.device_class).toBe("temperature");
      expect(temp!.config.unit_of_measurement).toBe("\u00b0C");
    });

    it("inverter_mode select has correct options", () => {
      const mode = configs.find((c) => c.objectId === "inverter_mode");
      expect(mode!.component).toBe("select");
      expect(mode!.config.options).toEqual([
        "eco",
        "timed_demand",
        "timed_export",
      ]);
    });
  });

  describe("publishDiscovery", () => {
    it("publishes all configs as retained to discovery prefix", async () => {
      const mqtt = createMockMqtt();
      await publishDiscovery(mqtt, "homeassistant", topics, snapshot);

      const configs = generateDiscoveryConfigs(topics, snapshot);
      expect(mqtt.published.length).toBe(configs.length);

      for (const msg of mqtt.published) {
        expect(msg.topic).toMatch(
          /^homeassistant\/(sensor|select|number|switch|button)\/givenergy_CE1234G567\//,
        );
        expect(msg.topic).toMatch(/\/config$/);
        expect(msg.retain).toBe(true);
      }
    });
  });
});
