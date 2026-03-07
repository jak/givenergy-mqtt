import type { InverterSnapshot } from "givenergy-modbus";
import type { MqttWrapper } from "./mqtt-client.js";
import type { TopicBuilder } from "./topics.js";
import { logger } from "./logger.js";

interface HaDevice {
  identifiers: string[];
  name: string;
  manufacturer: string;
  model: string;
}

interface HaEntityConfig {
  component: string;
  objectId: string;
  config: Record<string, unknown>;
}

function makeDevice(snapshot: InverterSnapshot): HaDevice {
  return {
    identifiers: [`givenergy_${snapshot.serialNumber}`],
    name: `GivEnergy ${snapshot.serialNumber}`,
    manufacturer: "GivEnergy",
    model: `Inverter (${snapshot.generation})`,
  };
}

function sensorConfigs(
  topics: TopicBuilder,
  device: HaDevice,
  serial: string,
  availabilityTopic: string,
): HaEntityConfig[] {
  const sensors: Array<{
    objectId: string;
    name: string;
    stateKey: string;
    deviceClass?: string;
    stateClass?: string;
    unit?: string;
    icon?: string;
  }> = [
    {
      objectId: "solar_power",
      name: "Solar Power",
      stateKey: "solar_power",
      deviceClass: "power",
      stateClass: "measurement",
      unit: "W",
    },
    {
      objectId: "battery_power",
      name: "Battery Power",
      stateKey: "battery_power",
      deviceClass: "power",
      stateClass: "measurement",
      unit: "W",
    },
    {
      objectId: "grid_power",
      name: "Grid Power",
      stateKey: "grid_power",
      deviceClass: "power",
      stateClass: "measurement",
      unit: "W",
    },
    {
      objectId: "load_power",
      name: "Load Power",
      stateKey: "load_power",
      deviceClass: "power",
      stateClass: "measurement",
      unit: "W",
    },
    {
      objectId: "battery_soc",
      name: "Battery SOC",
      stateKey: "battery_soc",
      deviceClass: "battery",
      stateClass: "measurement",
      unit: "%",
    },
    {
      objectId: "pv_string_1_power",
      name: "PV String 1 Power",
      stateKey: "pv_string_1_power",
      deviceClass: "power",
      stateClass: "measurement",
      unit: "W",
    },
    {
      objectId: "pv_string_2_power",
      name: "PV String 2 Power",
      stateKey: "pv_string_2_power",
      deviceClass: "power",
      stateClass: "measurement",
      unit: "W",
    },
    {
      objectId: "pv_string_1_voltage",
      name: "PV String 1 Voltage",
      stateKey: "pv_string_1_voltage",
      deviceClass: "voltage",
      stateClass: "measurement",
      unit: "V",
    },
    {
      objectId: "pv_string_2_voltage",
      name: "PV String 2 Voltage",
      stateKey: "pv_string_2_voltage",
      deviceClass: "voltage",
      stateClass: "measurement",
      unit: "V",
    },
    {
      objectId: "grid_voltage",
      name: "Grid Voltage",
      stateKey: "grid_voltage",
      deviceClass: "voltage",
      stateClass: "measurement",
      unit: "V",
    },
    {
      objectId: "grid_frequency",
      name: "Grid Frequency",
      stateKey: "grid_frequency",
      deviceClass: "frequency",
      stateClass: "measurement",
      unit: "Hz",
    },
    {
      objectId: "battery_voltage",
      name: "Battery Voltage",
      stateKey: "battery_voltage",
      deviceClass: "voltage",
      stateClass: "measurement",
      unit: "V",
    },
    {
      objectId: "inverter_heatsink_temp",
      name: "Inverter Heatsink Temperature",
      stateKey: "inverter_heatsink_temp",
      deviceClass: "temperature",
      stateClass: "measurement",
      unit: "\u00b0C",
    },
    {
      objectId: "battery_temp",
      name: "Battery Temperature",
      stateKey: "battery_temp",
      deviceClass: "temperature",
      stateClass: "measurement",
      unit: "\u00b0C",
    },
    {
      objectId: "pv_energy_today",
      name: "PV Energy Today",
      stateKey: "pv_energy_today",
      deviceClass: "energy",
      stateClass: "total_increasing",
      unit: "kWh",
    },
    {
      objectId: "grid_import_today",
      name: "Grid Import Today",
      stateKey: "grid_import_today",
      deviceClass: "energy",
      stateClass: "total_increasing",
      unit: "kWh",
    },
    {
      objectId: "grid_export_today",
      name: "Grid Export Today",
      stateKey: "grid_export_today",
      deviceClass: "energy",
      stateClass: "total_increasing",
      unit: "kWh",
    },
    {
      objectId: "battery_charge_today",
      name: "Battery Charge Today",
      stateKey: "battery_charge_today",
      deviceClass: "energy",
      stateClass: "total_increasing",
      unit: "kWh",
    },
    {
      objectId: "battery_discharge_today",
      name: "Battery Discharge Today",
      stateKey: "battery_discharge_today",
      deviceClass: "energy",
      stateClass: "total_increasing",
      unit: "kWh",
    },
    {
      objectId: "consumption_today",
      name: "Consumption Today",
      stateKey: "consumption_today",
      deviceClass: "energy",
      stateClass: "total_increasing",
      unit: "kWh",
    },
    {
      objectId: "pv_energy_total",
      name: "PV Energy Total",
      stateKey: "pv_energy_total",
      deviceClass: "energy",
      stateClass: "total_increasing",
      unit: "kWh",
    },
    {
      objectId: "grid_import_total",
      name: "Grid Import Total",
      stateKey: "grid_import_total",
      deviceClass: "energy",
      stateClass: "total_increasing",
      unit: "kWh",
    },
    {
      objectId: "grid_export_total",
      name: "Grid Export Total",
      stateKey: "grid_export_total",
      deviceClass: "energy",
      stateClass: "total_increasing",
      unit: "kWh",
    },
    {
      objectId: "charge_target_soc",
      name: "Charge Target SOC",
      stateKey: "charge_target_soc",
      stateClass: "measurement",
      unit: "%",
      icon: "mdi:battery-charging",
    },
    {
      objectId: "enable_charge",
      name: "Charge Enabled",
      stateKey: "enable_charge",
      icon: "mdi:battery-plus",
    },
    {
      objectId: "enable_discharge",
      name: "Discharge Enabled",
      stateKey: "enable_discharge",
      icon: "mdi:battery-minus",
    },
  ];

  return sensors.map((s) => {
    const config: Record<string, unknown> = {
      name: s.name,
      unique_id: `givenergy_${serial}_${s.objectId}`,
      state_topic: topics.state(s.stateKey),
      availability_topic: availabilityTopic,
      device: device,
    };
    if (s.deviceClass) config.device_class = s.deviceClass;
    if (s.stateClass) config.state_class = s.stateClass;
    if (s.unit) config.unit_of_measurement = s.unit;
    if (s.icon) config.icon = s.icon;

    return {
      component: "sensor",
      objectId: s.objectId,
      config,
    };
  });
}

function controlConfigs(
  topics: TopicBuilder,
  device: HaDevice,
  serial: string,
  availabilityTopic: string,
): HaEntityConfig[] {
  const configs: HaEntityConfig[] = [];

  // Select: inverter mode
  configs.push({
    component: "select",
    objectId: "inverter_mode",
    config: {
      name: "Inverter Mode",
      unique_id: `givenergy_${serial}_inverter_mode`,
      command_topic: topics.command("set_mode"),
      state_topic: topics.state("snapshot"),
      value_template: "{{ value_json.inverterMode if value_json.inverterMode is defined else 'eco' }}",
      options: ["eco", "timed_demand", "timed_export"],
      availability_topic: availabilityTopic,
      device,
    },
  });

  // Number: charge target
  configs.push({
    component: "number",
    objectId: "charge_target",
    config: {
      name: "Charge Target SOC",
      unique_id: `givenergy_${serial}_charge_target`,
      command_topic: topics.command("set_charge_target"),
      state_topic: topics.state("charge_target_soc"),
      min: 4,
      max: 100,
      step: 1,
      unit_of_measurement: "%",
      icon: "mdi:battery-charging",
      availability_topic: availabilityTopic,
      device,
    },
  });

  // Number: charge rate
  configs.push({
    component: "number",
    objectId: "charge_rate",
    config: {
      name: "Charge Rate",
      unique_id: `givenergy_${serial}_charge_rate`,
      command_topic: topics.command("set_charge_rate"),
      min: 0,
      max: 6000,
      step: 100,
      unit_of_measurement: "W",
      icon: "mdi:lightning-bolt",
      availability_topic: availabilityTopic,
      device,
    },
  });

  // Number: discharge rate
  configs.push({
    component: "number",
    objectId: "discharge_rate",
    config: {
      name: "Discharge Rate",
      unique_id: `givenergy_${serial}_discharge_rate`,
      command_topic: topics.command("set_discharge_rate"),
      min: 0,
      max: 6000,
      step: 100,
      unit_of_measurement: "W",
      icon: "mdi:lightning-bolt",
      availability_topic: availabilityTopic,
      device,
    },
  });

  // Number: battery reserve
  configs.push({
    component: "number",
    objectId: "battery_reserve",
    config: {
      name: "Battery Reserve",
      unique_id: `givenergy_${serial}_battery_reserve`,
      command_topic: topics.command("set_battery_reserve"),
      min: 0,
      max: 100,
      step: 1,
      unit_of_measurement: "%",
      icon: "mdi:battery-lock",
      availability_topic: availabilityTopic,
      device,
    },
  });

  // Switch: charge schedule
  configs.push({
    component: "switch",
    objectId: "charge_schedule",
    config: {
      name: "Charge Schedule",
      unique_id: `givenergy_${serial}_charge_schedule`,
      command_topic: topics.command("set_charge_schedule_enabled"),
      payload_on: "true",
      payload_off: "false",
      icon: "mdi:calendar-clock",
      availability_topic: availabilityTopic,
      device,
    },
  });

  // Switch: discharge schedule
  configs.push({
    component: "switch",
    objectId: "discharge_schedule",
    config: {
      name: "Discharge Schedule",
      unique_id: `givenergy_${serial}_discharge_schedule`,
      command_topic: topics.command("set_discharge_schedule_enabled"),
      payload_on: "true",
      payload_off: "false",
      icon: "mdi:calendar-clock",
      availability_topic: availabilityTopic,
      device,
    },
  });

  // Button: sync datetime
  configs.push({
    component: "button",
    objectId: "sync_datetime",
    config: {
      name: "Sync Date/Time",
      unique_id: `givenergy_${serial}_sync_datetime`,
      command_topic: topics.command("sync_datetime"),
      icon: "mdi:clock-sync",
      availability_topic: availabilityTopic,
      device,
    },
  });

  // Button: reboot
  configs.push({
    component: "button",
    objectId: "reboot",
    config: {
      name: "Reboot Inverter",
      unique_id: `givenergy_${serial}_reboot`,
      command_topic: topics.command("reboot"),
      icon: "mdi:restart",
      availability_topic: availabilityTopic,
      device,
    },
  });

  return configs;
}

export function generateDiscoveryConfigs(
  topics: TopicBuilder,
  snapshot: InverterSnapshot,
): HaEntityConfig[] {
  const device = makeDevice(snapshot);
  const serial = snapshot.serialNumber;
  const availabilityTopic = topics.status();

  return [
    ...sensorConfigs(topics, device, serial, availabilityTopic),
    ...controlConfigs(topics, device, serial, availabilityTopic),
  ];
}

export async function publishDiscovery(
  mqtt: MqttWrapper,
  discoveryPrefix: string,
  topics: TopicBuilder,
  snapshot: InverterSnapshot,
): Promise<void> {
  const configs = generateDiscoveryConfigs(topics, snapshot);
  const serial = snapshot.serialNumber;

  const promises = configs.map((entity) => {
    const topic = `${discoveryPrefix}/${entity.component}/givenergy_${serial}/${entity.objectId}/config`;
    return mqtt.publish(topic, JSON.stringify(entity.config), true);
  });

  await Promise.all(promises);
  logger.info(
    "Published %d HA discovery configs for %s",
    configs.length,
    serial,
  );
}
