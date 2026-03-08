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

    it("generates sensor configs for inverter", () => {
      const inverterSensors = configs.filter(
        (c) => c.component === "sensor" && c.nodeId === "givenergy_CE1234G567",
      );
      expect(inverterSensors.length).toBeGreaterThan(40);
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

    it("all inverter configs have device info", () => {
      const inverterConfigs = configs.filter(
        (c) => c.nodeId === "givenergy_CE1234G567",
      );
      for (const entity of inverterConfigs) {
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

    it("generates battery device discovery configs", () => {
      const batteryConfigs = configs.filter(
        (c) => c.nodeId === "givenergy_BT1234G567",
      );
      expect(batteryConfigs.length).toBe(7);

      // Check battery device has via_device
      const device = batteryConfigs[0].config.device as Record<string, unknown>;
      expect(device.via_device).toBe("givenergy_CE1234G567");
      expect(device.name).toBe("GivEnergy Battery BT1234G567");

      // Check specific sensors exist
      const objectIds = batteryConfigs.map((c) => c.objectId);
      expect(objectIds).toContain("soc");
      expect(objectIds).toContain("voltage");
      expect(objectIds).toContain("temp_max");
      expect(objectIds).toContain("temp_min");
      expect(objectIds).toContain("cycles");
      expect(objectIds).toContain("charge_energy_total");
      expect(objectIds).toContain("discharge_energy_total");
    });

    it("generates meter device discovery configs", () => {
      const meterConfigs = configs.filter(
        (c) => c.nodeId === "givenergy_meter_1",
      );
      expect(meterConfigs.length).toBe(6);

      // Check meter device has via_device
      const device = meterConfigs[0].config.device as Record<string, unknown>;
      expect(device.via_device).toBe("givenergy_CE1234G567");
      expect(device.name).toBe("GivEnergy Meter 1");

      // Check specific sensors exist
      const objectIds = meterConfigs.map((c) => c.objectId);
      expect(objectIds).toContain("active_power_total");
      expect(objectIds).toContain("apparent_power_total");
      expect(objectIds).toContain("frequency");
      expect(objectIds).toContain("import_energy");
      expect(objectIds).toContain("export_energy");
      expect(objectIds).toContain("power_factor_total");
    });

    it("new inverter sensors include power flows and new fields", () => {
      const objectIds = configs
        .filter((c) => c.nodeId === "givenergy_CE1234G567" && c.component === "sensor")
        .map((c) => c.objectId);

      // Power flow sensors
      expect(objectIds).toContain("solar_to_house");
      expect(objectIds).toContain("solar_to_battery");
      expect(objectIds).toContain("solar_to_grid");
      expect(objectIds).toContain("battery_to_house");
      expect(objectIds).toContain("battery_to_grid");
      expect(objectIds).toContain("grid_to_house");
      expect(objectIds).toContain("grid_to_battery");

      // New field sensors
      expect(objectIds).toContain("inverter_output_power");
      expect(objectIds).toContain("grid_apparent_power");
      expect(objectIds).toContain("eps_backup_power");
      expect(objectIds).toContain("charger_temp");
      expect(objectIds).toContain("system_time");
      expect(objectIds).toContain("hours_of_operation");
    });

    it("grid_apparent_power has apparent_power device class", () => {
      const sensor = configs.find((c) => c.objectId === "grid_apparent_power");
      expect(sensor!.config.device_class).toBe("apparent_power");
      expect(sensor!.config.unit_of_measurement).toBe("VA");
    });

    it("system_time has timestamp device class", () => {
      const sensor = configs.find((c) => c.objectId === "system_time");
      expect(sensor!.config.device_class).toBe("timestamp");
    });

    it("hours_of_operation has duration device class", () => {
      const sensor = configs.find((c) => c.objectId === "hours_of_operation");
      expect(sensor!.config.device_class).toBe("duration");
      expect(sensor!.config.unit_of_measurement).toBe("h");
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
          /^homeassistant\/(sensor|select|number|switch|button)\/givenergy_/,
        );
        expect(msg.topic).toMatch(/\/config$/);
        expect(msg.retain).toBe(true);
      }
    });

    it("uses nodeId for discovery topic path", async () => {
      const mqtt = createMockMqtt();
      await publishDiscovery(mqtt, "homeassistant", topics, snapshot);

      // Check inverter sensor topic
      const inverterTopic = mqtt.published.find(
        (p) => p.topic.includes("givenergy_CE1234G567/solar_power"),
      );
      expect(inverterTopic).toBeDefined();

      // Check battery sensor topic
      const batteryTopic = mqtt.published.find(
        (p) => p.topic.includes("givenergy_BT1234G567/soc"),
      );
      expect(batteryTopic).toBeDefined();

      // Check meter sensor topic
      const meterTopic = mqtt.published.find(
        (p) => p.topic.includes("givenergy_meter_1/active_power_total"),
      );
      expect(meterTopic).toBeDefined();
    });
  });
});
