export interface InverterConfig {
  host: string;
  port: number;
  pollIntervalMs: number;
}

export interface MqttConfig {
  url: string;
  username: string;
  password: string;
  clientId: string;
  topicPrefix: string;
}

export interface HomeAssistantConfig {
  enabled: boolean;
  discoveryPrefix: string;
}

export interface LogConfig {
  level: LogLevel;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface AppConfig {
  inverter: InverterConfig;
  mqtt: MqttConfig;
  homeassistant: HomeAssistantConfig;
  log: LogConfig;
}

export const DEFAULT_CONFIG: Omit<AppConfig, "inverter"> & {
  inverter: Omit<InverterConfig, "host"> & { host?: string };
} = {
  inverter: {
    port: 8899,
    pollIntervalMs: 15000,
  },
  mqtt: {
    url: "mqtt://localhost:1883",
    username: "",
    password: "",
    clientId: "givenergy-mqtt",
    topicPrefix: "givenergy",
  },
  homeassistant: {
    enabled: true,
    discoveryPrefix: "homeassistant",
  },
  log: {
    level: "info",
  },
};
