import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { loadConfig, type CliArgs } from "./config.js";
import { Bridge } from "./bridge.js";
import { logger } from "./logger.js";
import type { LogLevel } from "./types.js";

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option("config", {
      alias: "c",
      type: "string",
      describe: "Path to config file",
      default: "givenergy-mqtt.yml",
    })
    .option("host", {
      alias: "h",
      type: "string",
      describe: "Inverter IP address",
    })
    .option("port", {
      type: "number",
      describe: "Inverter port",
    })
    .option("poll-interval", {
      type: "number",
      describe: "Poll interval in milliseconds",
    })
    .option("mqtt-url", {
      type: "string",
      describe: "MQTT broker URL",
    })
    .option("mqtt-username", {
      type: "string",
      describe: "MQTT username",
    })
    .option("mqtt-password", {
      type: "string",
      describe: "MQTT password",
    })
    .option("client-id", {
      type: "string",
      describe: "MQTT client ID",
    })
    .option("topic-prefix", {
      type: "string",
      describe: "MQTT topic prefix",
    })
    .option("ha-discovery", {
      type: "boolean",
      describe: "Enable Home Assistant discovery",
    })
    .option("ha-prefix", {
      type: "string",
      describe: "Home Assistant discovery prefix",
    })
    .option("log-level", {
      type: "string",
      choices: ["debug", "info", "warn", "error"] as const,
      describe: "Log level",
    })
    .option("discover", {
      type: "boolean",
      describe: "Auto-discover inverter on local network",
    })
    .help()
    .version()
    .parse();

  const cliArgs: CliArgs = {
    config: argv.config,
    host: argv.host,
    port: argv.port,
    pollInterval: argv.pollInterval as number | undefined,
    mqttUrl: argv.mqttUrl as string | undefined,
    mqttUsername: argv.mqttUsername as string | undefined,
    mqttPassword: argv.mqttPassword as string | undefined,
    clientId: argv.clientId as string | undefined,
    topicPrefix: argv.topicPrefix as string | undefined,
    haDiscovery: argv.haDiscovery as boolean | undefined,
    haPrefix: argv.haPrefix as string | undefined,
    logLevel: argv.logLevel as LogLevel | undefined,
    discover: argv.discover as boolean | undefined,
  };

  // If --discover flag is set and no host, leave host undefined for auto-discovery
  if (cliArgs.discover && !cliArgs.host) {
    // host will be resolved via discover() in bridge.ts
  }

  const config = loadConfig(cliArgs);
  const bridge = new Bridge(config);

  const shutdown = async () => {
    await bridge.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await bridge.start();
  } catch (err) {
    logger.error(
      "Failed to start bridge: %s",
      err instanceof Error ? err.message : String(err),
    );
    process.exit(1);
  }
}

main();
