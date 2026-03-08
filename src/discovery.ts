import type { InverterSnapshot } from "givenergy-modbus";
import type { MqttWrapper } from "./mqtt-client.js";
import type { TopicBuilder } from "./topics.js";
import { logger } from "./logger.js";

interface HaDevice {
  identifiers: string[];
  name: string;
  manufacturer: string;
  model: string;
  via_device?: string;
}

interface HaEntityConfig {
  component: string;
  objectId: string;
  nodeId: string;
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
    // New inverter sensors
    {
      objectId: "inverter_output_power",
      name: "Inverter Output Power",
      stateKey: "inverter_output_power",
      deviceClass: "power",
      stateClass: "measurement",
      unit: "W",
    },
    {
      objectId: "grid_apparent_power",
      name: "Grid Apparent Power",
      stateKey: "grid_apparent_power",
      deviceClass: "apparent_power",
      stateClass: "measurement",
      unit: "VA",
    },
    {
      objectId: "eps_backup_power",
      name: "EPS Backup Power",
      stateKey: "eps_backup_power",
      deviceClass: "power",
      stateClass: "measurement",
      unit: "W",
    },
    {
      objectId: "eps_backup_voltage",
      name: "EPS Backup Voltage",
      stateKey: "eps_backup_voltage",
      deviceClass: "voltage",
      stateClass: "measurement",
      unit: "V",
    },
    {
      objectId: "pv_string_1_current",
      name: "PV String 1 Current",
      stateKey: "pv_string_1_current",
      deviceClass: "current",
      stateClass: "measurement",
      unit: "A",
    },
    {
      objectId: "pv_string_2_current",
      name: "PV String 2 Current",
      stateKey: "pv_string_2_current",
      deviceClass: "current",
      stateClass: "measurement",
      unit: "A",
    },
    {
      objectId: "inverter_current",
      name: "Inverter Current",
      stateKey: "inverter_current",
      deviceClass: "current",
      stateClass: "measurement",
      unit: "A",
    },
    {
      objectId: "battery_current",
      name: "Battery Current",
      stateKey: "battery_current",
      deviceClass: "current",
      stateClass: "measurement",
      unit: "A",
    },
    {
      objectId: "eps_backup_frequency",
      name: "EPS Backup Frequency",
      stateKey: "eps_backup_frequency",
      deviceClass: "frequency",
      stateClass: "measurement",
      unit: "Hz",
    },
    {
      objectId: "charger_temp",
      name: "Charger Temperature",
      stateKey: "charger_temp",
      deviceClass: "temperature",
      stateClass: "measurement",
      unit: "\u00b0C",
    },
    {
      objectId: "pv_string_1_energy_today",
      name: "PV String 1 Energy Today",
      stateKey: "pv_string_1_energy_today",
      deviceClass: "energy",
      stateClass: "total_increasing",
      unit: "kWh",
    },
    {
      objectId: "pv_string_2_energy_today",
      name: "PV String 2 Energy Today",
      stateKey: "pv_string_2_energy_today",
      deviceClass: "energy",
      stateClass: "total_increasing",
      unit: "kWh",
    },
    {
      objectId: "battery_charge_total",
      name: "Battery Charge Total",
      stateKey: "battery_charge_total",
      deviceClass: "energy",
      stateClass: "total_increasing",
      unit: "kWh",
    },
    {
      objectId: "battery_discharge_total",
      name: "Battery Discharge Total",
      stateKey: "battery_discharge_total",
      deviceClass: "energy",
      stateClass: "total_increasing",
      unit: "kWh",
    },
    {
      objectId: "consumption_total",
      name: "Consumption Total",
      stateKey: "consumption_total",
      deviceClass: "energy",
      stateClass: "total_increasing",
      unit: "kWh",
    },
    {
      objectId: "battery_throughput_total",
      name: "Battery Throughput Total",
      stateKey: "battery_throughput_total",
      deviceClass: "energy",
      stateClass: "total_increasing",
      unit: "kWh",
    },
    {
      objectId: "hours_of_operation",
      name: "Hours of Operation",
      stateKey: "hours_of_operation",
      deviceClass: "duration",
      stateClass: "total_increasing",
      unit: "h",
    },
    {
      objectId: "system_time",
      name: "System Time",
      stateKey: "system_time",
      deviceClass: "timestamp",
    },
    // Power flow sensors
    {
      objectId: "solar_to_house",
      name: "Solar to House",
      stateKey: "solar_to_house",
      deviceClass: "power",
      stateClass: "measurement",
      unit: "W",
    },
    {
      objectId: "solar_to_battery",
      name: "Solar to Battery",
      stateKey: "solar_to_battery",
      deviceClass: "power",
      stateClass: "measurement",
      unit: "W",
    },
    {
      objectId: "solar_to_grid",
      name: "Solar to Grid",
      stateKey: "solar_to_grid",
      deviceClass: "power",
      stateClass: "measurement",
      unit: "W",
    },
    {
      objectId: "battery_to_house",
      name: "Battery to House",
      stateKey: "battery_to_house",
      deviceClass: "power",
      stateClass: "measurement",
      unit: "W",
    },
    {
      objectId: "battery_to_grid",
      name: "Battery to Grid",
      stateKey: "battery_to_grid",
      deviceClass: "power",
      stateClass: "measurement",
      unit: "W",
    },
    {
      objectId: "grid_to_house",
      name: "Grid to House",
      stateKey: "grid_to_house",
      deviceClass: "power",
      stateClass: "measurement",
      unit: "W",
    },
    {
      objectId: "grid_to_battery",
      name: "Grid to Battery",
      stateKey: "grid_to_battery",
      deviceClass: "power",
      stateClass: "measurement",
      unit: "W",
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
      nodeId: `givenergy_${serial}`,
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
  const nodeId = `givenergy_${serial}`;

  // Select: inverter mode
  configs.push({
    component: "select",
    objectId: "inverter_mode",
    nodeId,
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
    nodeId,
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
    nodeId,
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
    nodeId,
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
    nodeId,
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
    nodeId,
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
    nodeId,
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
    nodeId,
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
    nodeId,
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

function batterySensorConfigs(
  topics: TopicBuilder,
  inverterDevice: HaDevice,
  inverterSerial: string,
  batterySerial: string,
  availabilityTopic: string,
): HaEntityConfig[] {
  const device: HaDevice = {
    identifiers: [`givenergy_${batterySerial}`],
    name: `GivEnergy Battery ${batterySerial}`,
    manufacturer: "GivEnergy",
    model: "Battery",
    via_device: inverterDevice.identifiers[0],
  };
  const nodeId = `givenergy_${batterySerial}`;

  const sensors: Array<{
    objectId: string;
    name: string;
    key: string;
    deviceClass?: string;
    stateClass?: string;
    unit?: string;
  }> = [
    {
      objectId: "soc",
      name: "SOC",
      key: "soc",
      deviceClass: "battery",
      stateClass: "measurement",
      unit: "%",
    },
    {
      objectId: "voltage",
      name: "Voltage",
      key: "voltage",
      deviceClass: "voltage",
      stateClass: "measurement",
      unit: "V",
    },
    {
      objectId: "temp_max",
      name: "Temperature Max",
      key: "temp_max",
      deviceClass: "temperature",
      stateClass: "measurement",
      unit: "\u00b0C",
    },
    {
      objectId: "temp_min",
      name: "Temperature Min",
      key: "temp_min",
      deviceClass: "temperature",
      stateClass: "measurement",
      unit: "\u00b0C",
    },
    {
      objectId: "cycles",
      name: "Cycle Count",
      key: "cycles",
      stateClass: "total_increasing",
    },
    {
      objectId: "charge_energy_total",
      name: "Charge Energy Total",
      key: "charge_energy_total",
      deviceClass: "energy",
      stateClass: "total_increasing",
      unit: "kWh",
    },
    {
      objectId: "discharge_energy_total",
      name: "Discharge Energy Total",
      key: "discharge_energy_total",
      deviceClass: "energy",
      stateClass: "total_increasing",
      unit: "kWh",
    },
  ];

  return sensors.map((s) => {
    const config: Record<string, unknown> = {
      name: s.name,
      unique_id: `givenergy_${batterySerial}_${s.objectId}`,
      state_topic: topics.battery(batterySerial, s.key),
      availability_topic: availabilityTopic,
      device,
    };
    if (s.deviceClass) config.device_class = s.deviceClass;
    if (s.stateClass) config.state_class = s.stateClass;
    if (s.unit) config.unit_of_measurement = s.unit;

    return {
      component: "sensor",
      objectId: s.objectId,
      nodeId,
      config,
    };
  });
}

function meterSensorConfigs(
  topics: TopicBuilder,
  inverterDevice: HaDevice,
  meterAddress: number,
  availabilityTopic: string,
): HaEntityConfig[] {
  const meterAddrStr = String(meterAddress);
  const device: HaDevice = {
    identifiers: [`givenergy_meter_${meterAddrStr}`],
    name: `GivEnergy Meter ${meterAddrStr}`,
    manufacturer: "GivEnergy",
    model: "CT Meter",
    via_device: inverterDevice.identifiers[0],
  };
  const nodeId = `givenergy_meter_${meterAddrStr}`;

  const sensors: Array<{
    objectId: string;
    name: string;
    key: string;
    deviceClass?: string;
    stateClass?: string;
    unit?: string;
  }> = [
    {
      objectId: "active_power_total",
      name: "Active Power Total",
      key: "active_power_total",
      deviceClass: "power",
      stateClass: "measurement",
      unit: "W",
    },
    {
      objectId: "apparent_power_total",
      name: "Apparent Power Total",
      key: "apparent_power_total",
      deviceClass: "apparent_power",
      stateClass: "measurement",
      unit: "VA",
    },
    {
      objectId: "power_factor_total",
      name: "Power Factor",
      key: "power_factor_total",
      deviceClass: "power_factor",
      stateClass: "measurement",
    },
    {
      objectId: "frequency",
      name: "Frequency",
      key: "frequency",
      deviceClass: "frequency",
      stateClass: "measurement",
      unit: "Hz",
    },
    {
      objectId: "import_energy",
      name: "Import Energy",
      key: "import_energy",
      deviceClass: "energy",
      stateClass: "total_increasing",
      unit: "kWh",
    },
    {
      objectId: "export_energy",
      name: "Export Energy",
      key: "export_energy",
      deviceClass: "energy",
      stateClass: "total_increasing",
      unit: "kWh",
    },
  ];

  return sensors.map((s) => {
    const config: Record<string, unknown> = {
      name: s.name,
      unique_id: `givenergy_meter_${meterAddrStr}_${s.objectId}`,
      state_topic: topics.meter(meterAddrStr, s.key),
      availability_topic: availabilityTopic,
      device,
    };
    if (s.deviceClass) config.device_class = s.deviceClass;
    if (s.stateClass) config.state_class = s.stateClass;
    if (s.unit) config.unit_of_measurement = s.unit;

    return {
      component: "sensor",
      objectId: s.objectId,
      nodeId,
      config,
    };
  });
}

export function generateDiscoveryConfigs(
  topics: TopicBuilder,
  snapshot: InverterSnapshot,
): HaEntityConfig[] {
  const device = makeDevice(snapshot);
  const serial = snapshot.serialNumber;
  const availabilityTopic = topics.status();

  const configs: HaEntityConfig[] = [
    ...sensorConfigs(topics, device, serial, availabilityTopic),
    ...controlConfigs(topics, device, serial, availabilityTopic),
  ];

  for (const battery of snapshot.batteries) {
    configs.push(
      ...batterySensorConfigs(
        topics,
        device,
        serial,
        battery.serialNumber,
        availabilityTopic,
      ),
    );
  }

  for (const meter of snapshot.meters) {
    configs.push(
      ...meterSensorConfigs(
        topics,
        device,
        meter.slaveAddress,
        availabilityTopic,
      ),
    );
  }

  return configs;
}

export async function publishDiscovery(
  mqtt: MqttWrapper,
  discoveryPrefix: string,
  topics: TopicBuilder,
  snapshot: InverterSnapshot,
): Promise<void> {
  const configs = generateDiscoveryConfigs(topics, snapshot);

  const promises = configs.map((entity) => {
    const topic = `${discoveryPrefix}/${entity.component}/${entity.nodeId}/${entity.objectId}/config`;
    return mqtt.publish(topic, JSON.stringify(entity.config), true);
  });

  await Promise.all(promises);
  logger.info(
    "Published %d HA discovery configs for %s",
    configs.length,
    snapshot.serialNumber,
  );
}
