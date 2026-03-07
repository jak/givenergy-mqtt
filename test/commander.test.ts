import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupCommander, COMMAND_HANDLERS } from "../src/commander.js";
import { TopicBuilder } from "../src/topics.js";
import { createMockMqtt } from "./helpers.js";

function createMockInverter() {
  return {
    setMode: vi.fn().mockResolvedValue(undefined),
    setChargeTarget: vi.fn().mockResolvedValue(undefined),
    setChargeRate: vi.fn().mockResolvedValue(undefined),
    setDischargeRate: vi.fn().mockResolvedValue(undefined),
    setBatteryReserve: vi.fn().mockResolvedValue(undefined),
    setChargeScheduleEnabled: vi.fn().mockResolvedValue(undefined),
    setDischargeScheduleEnabled: vi.fn().mockResolvedValue(undefined),
    setChargeSlot: vi.fn().mockResolvedValue(undefined),
    setDischargeSlot: vi.fn().mockResolvedValue(undefined),
    syncDateTime: vi.fn().mockResolvedValue(undefined),
    reboot: vi.fn().mockResolvedValue(undefined),
  };
}

describe("commander", () => {
  const topics = new TopicBuilder("givenergy", "CE1234G567");
  let mqtt: ReturnType<typeof createMockMqtt>;
  let inverter: ReturnType<typeof createMockInverter>;

  beforeEach(() => {
    mqtt = createMockMqtt();
    inverter = createMockInverter();
    setupCommander(mqtt, topics, inverter as any);
  });

  function simulateMessage(command: string, payload: string) {
    const topic = topics.command(command);
    for (const handler of mqtt.messageHandlers) {
      handler(topic, Buffer.from(payload));
    }
  }

  it("routes set_mode to inverter", async () => {
    simulateMessage("set_mode", "eco");
    await vi.waitFor(() => {
      expect(inverter.setMode).toHaveBeenCalledWith("eco");
    });
  });

  it("routes set_charge_target to inverter", async () => {
    simulateMessage("set_charge_target", "80");
    await vi.waitFor(() => {
      expect(inverter.setChargeTarget).toHaveBeenCalledWith(80);
    });
  });

  it("routes set_charge_rate to inverter", async () => {
    simulateMessage("set_charge_rate", "2600");
    await vi.waitFor(() => {
      expect(inverter.setChargeRate).toHaveBeenCalledWith(2600);
    });
  });

  it("routes set_discharge_rate to inverter", async () => {
    simulateMessage("set_discharge_rate", "2600");
    await vi.waitFor(() => {
      expect(inverter.setDischargeRate).toHaveBeenCalledWith(2600);
    });
  });

  it("routes set_battery_reserve to inverter", async () => {
    simulateMessage("set_battery_reserve", "4");
    await vi.waitFor(() => {
      expect(inverter.setBatteryReserve).toHaveBeenCalledWith(4);
    });
  });

  it("routes set_charge_schedule_enabled to inverter", async () => {
    simulateMessage("set_charge_schedule_enabled", "true");
    await vi.waitFor(() => {
      expect(inverter.setChargeScheduleEnabled).toHaveBeenCalledWith(true);
    });
  });

  it("routes set_discharge_schedule_enabled to inverter", async () => {
    simulateMessage("set_discharge_schedule_enabled", "false");
    await vi.waitFor(() => {
      expect(inverter.setDischargeScheduleEnabled).toHaveBeenCalledWith(false);
    });
  });

  it("routes set_charge_slot with JSON payload", async () => {
    const payload = JSON.stringify({
      slot: 1,
      start: "00:30",
      end: "04:30",
      targetStateOfCharge: 100,
    });
    simulateMessage("set_charge_slot", payload);
    await vi.waitFor(() => {
      expect(inverter.setChargeSlot).toHaveBeenCalledWith(0, {
        start: "00:30",
        end: "04:30",
        targetStateOfCharge: 100,
      });
    });
  });

  it("routes set_discharge_slot with JSON payload", async () => {
    const payload = JSON.stringify({
      slot: 1,
      start: "00:30",
      end: "04:30",
    });
    simulateMessage("set_discharge_slot", payload);
    await vi.waitFor(() => {
      expect(inverter.setDischargeSlot).toHaveBeenCalledWith(0, {
        start: "00:30",
        end: "04:30",
      });
    });
  });

  it("routes sync_datetime to inverter", async () => {
    simulateMessage("sync_datetime", "");
    await vi.waitFor(() => {
      expect(inverter.syncDateTime).toHaveBeenCalled();
    });
  });

  it("routes reboot to inverter", async () => {
    simulateMessage("reboot", "");
    await vi.waitFor(() => {
      expect(inverter.reboot).toHaveBeenCalled();
    });
  });

  it("ignores non-command topics", () => {
    for (const handler of mqtt.messageHandlers) {
      handler("givenergy/CE1234G567/state/solar_power", Buffer.from("100"));
    }
    expect(inverter.setMode).not.toHaveBeenCalled();
  });

  describe("validation", () => {
    it("rejects invalid mode", async () => {
      const handler = COMMAND_HANDLERS["set_mode"];
      await expect(handler(inverter as any, "invalid")).rejects.toThrow(
        "Invalid mode",
      );
    });

    it("rejects out of range charge target", async () => {
      const handler = COMMAND_HANDLERS["set_charge_target"];
      await expect(handler(inverter as any, "3")).rejects.toThrow(
        "Must be 4-100",
      );
      await expect(handler(inverter as any, "101")).rejects.toThrow(
        "Must be 4-100",
      );
    });

    it("rejects invalid schedule enabled value", async () => {
      const handler = COMMAND_HANDLERS["set_charge_schedule_enabled"];
      await expect(handler(inverter as any, "yes")).rejects.toThrow(
        'Must be "true" or "false"',
      );
    });
  });
});
