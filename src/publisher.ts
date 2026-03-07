import type { InverterSnapshot, BatterySnapshot } from "givenergy-modbus";
import type { MqttWrapper } from "./mqtt-client.js";
import { TopicBuilder } from "./topics.js";
import { logger } from "./logger.js";

interface StateMapping {
  key: string;
  extract: (s: InverterSnapshot) => string;
}

const STATE_MAPPINGS: StateMapping[] = [
  { key: "solar_power", extract: (s) => String(s.solarPower) },
  { key: "battery_power", extract: (s) => String(s.batteryPower) },
  { key: "battery_soc", extract: (s) => String(s.stateOfCharge) },
  { key: "grid_power", extract: (s) => String(s.gridPower) },
  { key: "load_power", extract: (s) => String(s.loadPower) },
  { key: "pv_string_1_power", extract: (s) => String(s.pvString1Power) },
  { key: "pv_string_2_power", extract: (s) => String(s.pvString2Power) },
  { key: "pv_string_1_voltage", extract: (s) => String(s.pvString1Voltage) },
  { key: "pv_string_2_voltage", extract: (s) => String(s.pvString2Voltage) },
  { key: "grid_voltage", extract: (s) => String(s.gridVoltage) },
  { key: "grid_frequency", extract: (s) => String(s.gridFrequency) },
  { key: "battery_voltage", extract: (s) => String(s.batteryVoltage) },
  {
    key: "inverter_heatsink_temp",
    extract: (s) => String(s.inverterHeatsinkTemp),
  },
  { key: "battery_temp", extract: (s) => String(s.batteryTemperature) },
  {
    key: "enable_charge",
    extract: (s) => (s.enableCharge ? "ON" : "OFF"),
  },
  {
    key: "enable_discharge",
    extract: (s) => (s.enableDischarge ? "ON" : "OFF"),
  },
  {
    key: "charge_target_soc",
    extract: (s) => String(s.chargeTargetStateOfCharge),
  },
  { key: "pv_energy_today", extract: (s) => String(s.pvEnergyTodayKwh) },
  {
    key: "grid_import_today",
    extract: (s) => String(s.gridImportEnergyTodayKwh),
  },
  {
    key: "grid_export_today",
    extract: (s) => String(s.gridExportEnergyTodayKwh),
  },
  {
    key: "battery_charge_today",
    extract: (s) => String(s.batteryChargeEnergyTodayKwh),
  },
  {
    key: "battery_discharge_today",
    extract: (s) => String(s.batteryDischargeEnergyTodayKwh),
  },
  {
    key: "consumption_today",
    extract: (s) => String(s.consumptionEnergyTodayKwh),
  },
  { key: "pv_energy_total", extract: (s) => String(s.pvEnergyTotalKwh) },
  {
    key: "grid_import_total",
    extract: (s) => String(s.gridImportEnergyTotalKwh),
  },
  {
    key: "grid_export_total",
    extract: (s) => String(s.gridExportEnergyTotalKwh),
  },
];

const BATTERY_MAPPINGS: Array<{
  key: string;
  extract: (b: BatterySnapshot) => string;
}> = [
  { key: "soc", extract: (b) => String(b.stateOfCharge) },
  { key: "voltage", extract: (b) => String(b.voltage) },
  { key: "temp_max", extract: (b) => String(b.temperatureMax) },
  { key: "cycles", extract: (b) => String(b.cycleCount) },
];

export async function publishSnapshot(
  mqtt: MqttWrapper,
  topics: TopicBuilder,
  snapshot: InverterSnapshot,
): Promise<void> {
  const promises: Promise<void>[] = [];

  // Full snapshot JSON
  promises.push(mqtt.publish(topics.snapshot(), JSON.stringify(snapshot), true));

  // Individual state topics
  for (const mapping of STATE_MAPPINGS) {
    promises.push(
      mqtt.publish(topics.state(mapping.key), mapping.extract(snapshot), true),
    );
  }

  // Battery modules
  for (const battery of snapshot.batteries) {
    for (const mapping of BATTERY_MAPPINGS) {
      promises.push(
        mqtt.publish(
          topics.battery(battery.serialNumber, mapping.key),
          mapping.extract(battery),
          true,
        ),
      );
    }
  }

  await Promise.all(promises);
  logger.debug("Published snapshot for %s", snapshot.serialNumber);
}

export { STATE_MAPPINGS, BATTERY_MAPPINGS };
