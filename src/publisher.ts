import type { InverterSnapshot, BatterySnapshot, MeterSnapshot } from "givenergy-modbus";
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
  // New state mappings
  {
    key: "inverter_output_power",
    extract: (s) => String(s.inverterOutputPower),
  },
  {
    key: "grid_apparent_power",
    extract: (s) => String(s.gridApparentPower),
  },
  { key: "eps_backup_power", extract: (s) => String(s.epsBackupPower) },
  { key: "eps_backup_voltage", extract: (s) => String(s.epsBackupVoltage) },
  {
    key: "eps_backup_frequency",
    extract: (s) => String(s.epsBackupFrequency),
  },
  { key: "pv_string_1_current", extract: (s) => String(s.pvString1Current) },
  { key: "pv_string_2_current", extract: (s) => String(s.pvString2Current) },
  { key: "inverter_current", extract: (s) => String(s.inverterCurrent) },
  { key: "battery_current", extract: (s) => String(s.batteryCurrent) },
  { key: "charger_temp", extract: (s) => String(s.chargerTemperature) },
  {
    key: "pv_string_1_energy_today",
    extract: (s) => String(s.pvString1EnergyTodayKwh),
  },
  {
    key: "pv_string_2_energy_today",
    extract: (s) => String(s.pvString2EnergyTodayKwh),
  },
  {
    key: "battery_charge_total",
    extract: (s) => String(s.batteryChargeEnergyTotalKwh),
  },
  {
    key: "battery_discharge_total",
    extract: (s) => String(s.batteryDischargeEnergyTotalKwh),
  },
  {
    key: "consumption_total",
    extract: (s) => String(s.consumptionEnergyTotalKwh),
  },
  {
    key: "battery_throughput_total",
    extract: (s) => String(s.batteryThroughputTotalKwh),
  },
  { key: "hours_of_operation", extract: (s) => String(s.hoursOfOperation) },
  { key: "system_time", extract: (s) => s.systemTime.toISOString() },
  {
    key: "solar_to_house",
    extract: (s) => String(s.powerFlows.solarToHouse),
  },
  {
    key: "solar_to_battery",
    extract: (s) => String(s.powerFlows.solarToBattery),
  },
  { key: "solar_to_grid", extract: (s) => String(s.powerFlows.solarToGrid) },
  {
    key: "battery_to_house",
    extract: (s) => String(s.powerFlows.batteryToHouse),
  },
  {
    key: "battery_to_grid",
    extract: (s) => String(s.powerFlows.batteryToGrid),
  },
  { key: "grid_to_house", extract: (s) => String(s.powerFlows.gridToHouse) },
  {
    key: "grid_to_battery",
    extract: (s) => String(s.powerFlows.gridToBattery),
  },
  {
    key: "charge_slots",
    extract: (s) => JSON.stringify(s.chargeSlots),
  },
  {
    key: "discharge_slots",
    extract: (s) => JSON.stringify(s.dischargeSlots),
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
  { key: "temp_min", extract: (b) => String(b.temperatureMin) },
  {
    key: "charge_energy_total",
    extract: (b) => String(b.chargeEnergyTotalKwh),
  },
  {
    key: "discharge_energy_total",
    extract: (b) => String(b.dischargeEnergyTotalKwh),
  },
  { key: "cell_voltages", extract: (b) => JSON.stringify(b.cellVoltages) },
];

const METER_MAPPINGS: Array<{
  key: string;
  extract: (m: MeterSnapshot) => string;
}> = [
  { key: "active_power_total", extract: (m) => String(m.activePowerTotal) },
  {
    key: "reactive_power_total",
    extract: (m) => String(m.reactivePowerTotal),
  },
  {
    key: "apparent_power_total",
    extract: (m) => String(m.apparentPowerTotal),
  },
  { key: "power_factor_total", extract: (m) => String(m.powerFactorTotal) },
  { key: "frequency", extract: (m) => String(m.frequency) },
  { key: "import_energy", extract: (m) => String(m.importActiveEnergyKwh) },
  { key: "export_energy", extract: (m) => String(m.exportActiveEnergyKwh) },
  { key: "voltage", extract: (m) => JSON.stringify(m.voltage) },
  { key: "current", extract: (m) => JSON.stringify(m.current) },
  { key: "active_power", extract: (m) => JSON.stringify(m.activePower) },
  { key: "reactive_power", extract: (m) => JSON.stringify(m.reactivePower) },
  { key: "apparent_power", extract: (m) => JSON.stringify(m.apparentPower) },
  { key: "power_factor", extract: (m) => JSON.stringify(m.powerFactor) },
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

  // Meter modules
  for (const meter of snapshot.meters) {
    for (const mapping of METER_MAPPINGS) {
      promises.push(
        mqtt.publish(
          topics.meter(String(meter.slaveAddress), mapping.key),
          mapping.extract(meter),
          true,
        ),
      );
    }
  }

  await Promise.all(promises);
  logger.debug("Published snapshot for %s", snapshot.serialNumber);
}

export { STATE_MAPPINGS, BATTERY_MAPPINGS, METER_MAPPINGS };
