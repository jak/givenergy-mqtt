import { describe, it, expect } from "vitest";
import { TopicBuilder } from "../src/topics.js";

describe("TopicBuilder", () => {
  const topics = new TopicBuilder("givenergy", "CE1234G567");

  it("builds status topic", () => {
    expect(topics.status()).toBe("givenergy/CE1234G567/status");
  });

  it("builds snapshot topic", () => {
    expect(topics.snapshot()).toBe("givenergy/CE1234G567/state/snapshot");
  });

  it("builds state topics", () => {
    expect(topics.state("solar_power")).toBe(
      "givenergy/CE1234G567/state/solar_power",
    );
    expect(topics.state("battery_soc")).toBe(
      "givenergy/CE1234G567/state/battery_soc",
    );
  });

  it("builds battery topics", () => {
    expect(topics.battery("BT1234G567", "soc")).toBe(
      "givenergy/CE1234G567/battery/BT1234G567/soc",
    );
  });

  it("builds command topics", () => {
    expect(topics.command("set_mode")).toBe(
      "givenergy/CE1234G567/command/set_mode",
    );
  });

  it("builds command subscription wildcard", () => {
    expect(topics.commandSubscription()).toBe(
      "givenergy/CE1234G567/command/+",
    );
  });

  it("uses custom prefix", () => {
    const custom = new TopicBuilder("solar", "AB1234C567");
    expect(custom.status()).toBe("solar/AB1234C567/status");
  });
});
