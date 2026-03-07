import type { GivEnergyInverter, InverterMode } from "givenergy-modbus";
import type { MqttWrapper } from "./mqtt-client.js";
import type { TopicBuilder } from "./topics.js";
import { logger } from "./logger.js";

const VALID_MODES: InverterMode[] = ["eco", "timed_demand", "timed_export"];

type CommandHandler = (
  inverter: GivEnergyInverter,
  payload: string,
) => Promise<void>;

const COMMAND_HANDLERS: Record<string, CommandHandler> = {
  set_mode: async (inv, payload) => {
    const mode = payload as InverterMode;
    if (!VALID_MODES.includes(mode)) {
      throw new Error(
        `Invalid mode "${payload}". Must be one of: ${VALID_MODES.join(", ")}`,
      );
    }
    await inv.setMode(mode);
  },

  set_charge_target: async (inv, payload) => {
    const percent = parseInt(payload, 10);
    if (isNaN(percent) || percent < 4 || percent > 100) {
      throw new Error(`Invalid charge target "${payload}". Must be 4-100.`);
    }
    await inv.setChargeTarget(percent);
  },

  set_charge_rate: async (inv, payload) => {
    const watts = parseInt(payload, 10);
    if (isNaN(watts) || watts < 0) {
      throw new Error(`Invalid charge rate "${payload}". Must be >= 0.`);
    }
    await inv.setChargeRate(watts);
  },

  set_discharge_rate: async (inv, payload) => {
    const watts = parseInt(payload, 10);
    if (isNaN(watts) || watts < 0) {
      throw new Error(`Invalid discharge rate "${payload}". Must be >= 0.`);
    }
    await inv.setDischargeRate(watts);
  },

  set_battery_reserve: async (inv, payload) => {
    const percent = parseInt(payload, 10);
    if (isNaN(percent) || percent < 0 || percent > 100) {
      throw new Error(
        `Invalid battery reserve "${payload}". Must be 0-100.`,
      );
    }
    await inv.setBatteryReserve(percent);
  },

  set_charge_schedule_enabled: async (inv, payload) => {
    const enabled = payload === "true";
    if (payload !== "true" && payload !== "false") {
      throw new Error(
        `Invalid value "${payload}". Must be "true" or "false".`,
      );
    }
    await inv.setChargeScheduleEnabled(enabled);
  },

  set_discharge_schedule_enabled: async (inv, payload) => {
    const enabled = payload === "true";
    if (payload !== "true" && payload !== "false") {
      throw new Error(
        `Invalid value "${payload}". Must be "true" or "false".`,
      );
    }
    await inv.setDischargeScheduleEnabled(enabled);
  },

  set_charge_slot: async (inv, payload) => {
    const data = JSON.parse(payload);
    const { slot, start, end, targetStateOfCharge } = data;
    if (typeof slot !== "number" || !start || !end) {
      throw new Error(
        'Invalid charge slot. Requires {"slot":1,"start":"HH:MM","end":"HH:MM"}',
      );
    }
    await inv.setChargeSlot(slot - 1, { start, end, targetStateOfCharge });
  },

  set_discharge_slot: async (inv, payload) => {
    const data = JSON.parse(payload);
    const { slot, start, end } = data;
    if (typeof slot !== "number" || !start || !end) {
      throw new Error(
        'Invalid discharge slot. Requires {"slot":1,"start":"HH:MM","end":"HH:MM"}',
      );
    }
    await inv.setDischargeSlot(slot - 1, { start, end });
  },

  sync_datetime: async (inv) => {
    await inv.syncDateTime();
  },

  reboot: async (inv) => {
    await inv.reboot();
  },
};

export function setupCommander(
  mqtt: MqttWrapper,
  topics: TopicBuilder,
  inverter: GivEnergyInverter,
): void {
  mqtt.onMessage(async (topic: string, payload: Buffer) => {
    const commandPrefix = topics.command("");
    if (!topic.startsWith(commandPrefix)) return;

    const commandName = topic.slice(commandPrefix.length);
    const handler = COMMAND_HANDLERS[commandName];

    if (!handler) {
      logger.warn("Unknown command: %s", commandName);
      return;
    }

    const payloadStr = payload.toString().trim();
    logger.info("Received command: %s = %s", commandName, payloadStr);

    try {
      await handler(inverter, payloadStr);
      logger.info("Command %s executed successfully", commandName);
    } catch (err) {
      logger.error(
        "Command %s failed: %s",
        commandName,
        err instanceof Error ? err.message : String(err),
      );
    }
  });
}

export { COMMAND_HANDLERS };
