import { readFileSync, existsSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import type { AppConfig, LogLevel } from "./types.js";
import { DEFAULT_CONFIG } from "./types.js";

function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };
  for (const key of Object.keys(source) as Array<keyof T>) {
    const val = source[key];
    if (
      val !== undefined &&
      val !== null &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        val as Record<string, unknown>,
      ) as T[keyof T];
    } else if (val !== undefined) {
      result[key] = val as T[keyof T];
    }
  }
  return result;
}

function loadConfigFile(path: string): Partial<AppConfig> {
  if (!existsSync(path)) return {};
  const content = readFileSync(path, "utf-8");
  return (parseYaml(content) as Partial<AppConfig>) ?? {};
}

function loadEnvVars(): Partial<AppConfig> {
  const config: Record<string, unknown> = {};
  const env = process.env;

  if (env.GIVENERGY_HOST)
    set(config, "inverter.host", env.GIVENERGY_HOST);
  if (env.GIVENERGY_PORT)
    set(config, "inverter.port", parseInt(env.GIVENERGY_PORT, 10));
  if (env.GIVENERGY_POLL_INTERVAL)
    set(
      config,
      "inverter.pollIntervalMs",
      parseInt(env.GIVENERGY_POLL_INTERVAL, 10),
    );
  if (env.MQTT_URL) set(config, "mqtt.url", env.MQTT_URL);
  if (env.MQTT_USERNAME) set(config, "mqtt.username", env.MQTT_USERNAME);
  if (env.MQTT_PASSWORD) set(config, "mqtt.password", env.MQTT_PASSWORD);
  if (env.MQTT_CLIENT_ID) set(config, "mqtt.clientId", env.MQTT_CLIENT_ID);
  if (env.MQTT_TOPIC_PREFIX)
    set(config, "mqtt.topicPrefix", env.MQTT_TOPIC_PREFIX);
  if (env.HA_DISCOVERY_ENABLED)
    set(
      config,
      "homeassistant.enabled",
      env.HA_DISCOVERY_ENABLED === "true",
    );
  if (env.HA_DISCOVERY_PREFIX)
    set(config, "homeassistant.discoveryPrefix", env.HA_DISCOVERY_PREFIX);
  if (env.LOG_LEVEL)
    set(config, "log.level", env.LOG_LEVEL as LogLevel);

  return config as Partial<AppConfig>;
}

function set(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current) || typeof current[parts[i]] !== "object") {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

export interface CliArgs {
  config?: string;
  host?: string;
  port?: number;
  pollInterval?: number;
  mqttUrl?: string;
  mqttUsername?: string;
  mqttPassword?: string;
  clientId?: string;
  topicPrefix?: string;
  haDiscovery?: boolean;
  haPrefix?: string;
  logLevel?: LogLevel;
  discover?: boolean;
}

function cliArgsToConfig(args: CliArgs): Partial<AppConfig> {
  const config: Record<string, unknown> = {};

  if (args.host) set(config, "inverter.host", args.host);
  if (args.port) set(config, "inverter.port", args.port);
  if (args.pollInterval)
    set(config, "inverter.pollIntervalMs", args.pollInterval);
  if (args.mqttUrl) set(config, "mqtt.url", args.mqttUrl);
  if (args.mqttUsername) set(config, "mqtt.username", args.mqttUsername);
  if (args.mqttPassword) set(config, "mqtt.password", args.mqttPassword);
  if (args.clientId) set(config, "mqtt.clientId", args.clientId);
  if (args.topicPrefix) set(config, "mqtt.topicPrefix", args.topicPrefix);
  if (args.haDiscovery !== undefined)
    set(config, "homeassistant.enabled", args.haDiscovery);
  if (args.haPrefix)
    set(config, "homeassistant.discoveryPrefix", args.haPrefix);
  if (args.logLevel) set(config, "log.level", args.logLevel);

  return config as Partial<AppConfig>;
}

export function loadConfig(args: CliArgs = {}): AppConfig {
  const configPath = args.config ?? "givenergy-mqtt.yml";
  const fileConfig = loadConfigFile(configPath);
  const envConfig = loadEnvVars();
  const cliConfig = cliArgsToConfig(args);

  const merged = deepMerge(
    deepMerge(deepMerge(DEFAULT_CONFIG as unknown as AppConfig, fileConfig), envConfig),
    cliConfig,
  );

  return merged;
}
