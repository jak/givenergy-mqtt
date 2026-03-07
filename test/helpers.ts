import type { InverterSnapshot, BatterySnapshot } from "givenergy-modbus";
import type { MqttWrapper } from "../src/mqtt-client.js";

export function createMockSnapshot(
  overrides: Partial<InverterSnapshot> = {},
): InverterSnapshot {
  return {
    serialNumber: "CE1234G567",
    modelCode: 8000,
    generation: "gen2",
    solarPower: 3500,
    pvString1Power: 2000,
    pvString2Power: 1500,
    batteryPower: -1000,
    gridPower: 500,
    loadPower: 2000,
    inverterOutputPower: 2500,
    gridApparentPower: 510,
    epsBackupPower: 0,
    pvString1Voltage: 350.1,
    pvString2Voltage: 340.2,
    pvString1Current: 5.7,
    pvString2Current: 4.4,
    stateOfCharge: 85,
    batteryVoltage: 51.2,
    batteryCurrent: 19.5,
    gridVoltage: 242.5,
    gridFrequency: 50.01,
    inverterCurrent: 10.3,
    epsBackupVoltage: 0,
    epsBackupFrequency: 0,
    inverterHeatsinkTemp: 35.5,
    chargerTemperature: 28.0,
    batteryTemperature: 22.3,
    pvEnergyTotalKwh: 12500.5,
    pvEnergyTodayKwh: 18.3,
    pvString1EnergyTodayKwh: 10.5,
    pvString2EnergyTodayKwh: 7.8,
    batteryChargeEnergyTotalKwh: 5000.2,
    batteryChargeEnergyTodayKwh: 8.1,
    batteryDischargeEnergyTotalKwh: 4800.7,
    batteryDischargeEnergyTodayKwh: 6.5,
    gridImportEnergyTotalKwh: 3200.1,
    gridImportEnergyTodayKwh: 2.4,
    gridExportEnergyTotalKwh: 8500.3,
    gridExportEnergyTodayKwh: 12.7,
    consumptionEnergyTotalKwh: 9200.0,
    consumptionEnergyTodayKwh: 14.2,
    batteryThroughputTotalKwh: 9800.9,
    hoursOfOperation: 8760,
    systemTime: new Date("2026-03-07T12:00:00Z"),
    enableCharge: true,
    enableDischarge: true,
    chargeTargetStateOfCharge: 100,
    powerFlows: {
      solarToHouse: 2000,
      solarToBattery: 1000,
      solarToGrid: 500,
      batteryToHouse: 0,
      batteryToGrid: 0,
      gridToHouse: 0,
      gridToBattery: 0,
    },
    batteries: [
      {
        serialNumber: "BT1234G567",
        stateOfCharge: 85,
        voltage: 51.2,
        dischargeEnergyTotalKwh: 4800,
        chargeEnergyTotalKwh: 5000,
        temperatureMax: 23.5,
        temperatureMin: 21.2,
        cycleCount: 450,
        cellVoltages: Array(16).fill(3.2),
      } as BatterySnapshot,
    ],
    meters: [],
    chargeSlots: [],
    dischargeSlots: [],
    ...overrides,
  } as InverterSnapshot;
}

export function createMockMqtt(): MqttWrapper & {
  published: Array<{ topic: string; payload: string; retain: boolean }>;
  subscribed: string[];
  unsubscribed: string[];
  messageHandlers: Array<(topic: string, payload: Buffer) => void>;
} {
  const mock = {
    published: [] as Array<{ topic: string; payload: string; retain: boolean }>,
    subscribed: [] as string[],
    unsubscribed: [] as string[],
    messageHandlers: [] as Array<(topic: string, payload: Buffer) => void>,
    client: {} as any,

    async publish(topic: string, payload: string, retain = false) {
      mock.published.push({ topic, payload, retain });
    },
    async subscribe(topic: string) {
      mock.subscribed.push(topic);
    },
    async unsubscribe(topic: string) {
      mock.unsubscribed.push(topic);
    },
    onMessage(handler: (topic: string, payload: Buffer) => void) {
      mock.messageHandlers.push(handler);
    },
    async disconnect() {},
  };
  return mock;
}
