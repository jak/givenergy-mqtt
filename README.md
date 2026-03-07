# givenergy-mqtt

[![CI](https://github.com/jak/givenergy-mqtt/actions/workflows/ci.yml/badge.svg)](https://github.com/jak/givenergy-mqtt/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/givenergy-mqtt)](https://www.npmjs.com/package/givenergy-mqtt)
[![node](https://img.shields.io/node/v/givenergy-mqtt)](https://www.npmjs.com/package/givenergy-mqtt)
[![license](https://img.shields.io/npm/l/givenergy-mqtt)](https://github.com/jak/givenergy-mqtt/blob/main/LICENSE)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/jak?label=sponsor)](https://github.com/sponsors/jak)
[![Buy Me a Coffee](https://img.shields.io/badge/buy%20me%20a%20coffee-donate-yellow)](https://buymeacoffee.com/jakio)

A lightweight MQTT bridge for GivEnergy solar inverters. Connects directly to your inverter over your local network and publishes real-time data to an MQTT broker, with automatic Home Assistant discovery. Built on [`givenergy-modbus`](https://github.com/jak/givenergy-modbus).

No cloud. No API keys. No polling delays. Just fast, local, real-time data from your inverter straight into MQTT.

## Features

- **Local-only** -- connects directly to your inverter via LAN, no cloud dependency
- **Home Assistant auto-discovery** -- entities appear automatically, correctly typed with proper device classes
- **Full monitoring** -- solar, battery, grid, load power, energy counters, temperatures, voltages
- **Inverter control** -- change modes, set charge targets, manage schedules via MQTT commands
- **Per-battery module data** -- SOC, voltage, temperature, and cycle count for each battery
- **Resilient** -- automatic reconnection for both MQTT and inverter connections
- **Zero config possible** -- auto-discovers your inverter on the local network

## Quick Start

You need Node.js 20+ and an MQTT broker (like [Mosquitto](https://mosquitto.org/)).

```bash
npx givenergy-mqtt --host 192.168.1.100
```

That's it. Your inverter data is now streaming to MQTT and Home Assistant will discover it automatically.

### Auto-discovery

If you don't know your inverter's IP:

```bash
npx givenergy-mqtt --discover
```

### With an MQTT broker that needs credentials

```bash
npx givenergy-mqtt --host 192.168.1.100 --mqtt-url mqtt://broker:1883 --mqtt-username user --mqtt-password pass
```

## Installation

### Run directly (no install)

```bash
npx givenergy-mqtt --host 192.168.1.100
```

### Install globally

```bash
npm install -g givenergy-mqtt
givenergy-mqtt --host 192.168.1.100
```

### Install as a project dependency

```bash
npm install givenergy-mqtt
```

## Configuration

Configuration is loaded in layers, with each layer overriding the previous:

**Defaults** --> **Config file** --> **Environment variables** --> **CLI arguments**

### Config File

Create `givenergy-mqtt.yml` in the working directory, or specify a path with `--config`:

```yaml
inverter:
  host: 192.168.1.100       # Your inverter's IP address
  port: 8899                 # Default Modbus port
  pollIntervalMs: 15000      # How often to poll (milliseconds)

mqtt:
  url: mqtt://localhost:1883  # MQTT broker URL
  username: ""
  password: ""
  clientId: givenergy-mqtt
  topicPrefix: givenergy      # Prefix for all MQTT topics

homeassistant:
  enabled: true               # Publish HA discovery configs
  discoveryPrefix: homeassistant

log:
  level: info                 # debug, info, warn, error
```

### Environment Variables

Useful for Docker or systemd deployments:

| Variable | Description |
|----------|-------------|
| `GIVENERGY_HOST` | Inverter IP address |
| `GIVENERGY_PORT` | Inverter port |
| `GIVENERGY_POLL_INTERVAL` | Poll interval in ms |
| `MQTT_URL` | MQTT broker URL |
| `MQTT_USERNAME` | MQTT username |
| `MQTT_PASSWORD` | MQTT password |
| `MQTT_CLIENT_ID` | MQTT client ID |
| `MQTT_TOPIC_PREFIX` | Topic prefix |
| `HA_DISCOVERY_ENABLED` | `true` or `false` |
| `HA_DISCOVERY_PREFIX` | HA discovery prefix |
| `LOG_LEVEL` | Log level |

### CLI Arguments

```
Options:
  -c, --config         Path to config file         [default: "givenergy-mqtt.yml"]
  -h, --host           Inverter IP address
      --port           Inverter port
      --poll-interval  Poll interval in milliseconds
      --mqtt-url       MQTT broker URL
      --mqtt-username  MQTT username
      --mqtt-password  MQTT password
      --client-id      MQTT client ID
      --topic-prefix   MQTT topic prefix
      --ha-discovery   Enable Home Assistant discovery
      --ha-prefix      Home Assistant discovery prefix
      --log-level      Log level                   [debug, info, warn, error]
      --discover       Auto-discover inverter on local network
      --help           Show help
      --version        Show version number
```

## MQTT Topics

All state topics are published with QoS 1 and the retain flag set. The topic prefix and inverter serial number are used to namespace everything.

### Status

| Topic | Payload | Description |
|-------|---------|-------------|
| `givenergy/{serial}/status` | `online` / `offline` | Connection status (LWT) |

### Power (watts)

| Topic | Description |
|-------|-------------|
| `givenergy/{serial}/state/solar_power` | Total solar generation |
| `givenergy/{serial}/state/battery_power` | Battery power (positive = discharging, negative = charging) |
| `givenergy/{serial}/state/grid_power` | Grid power (positive = exporting, negative = importing) |
| `givenergy/{serial}/state/load_power` | House consumption |
| `givenergy/{serial}/state/pv_string_1_power` | PV string 1 power |
| `givenergy/{serial}/state/pv_string_2_power` | PV string 2 power |

### Battery & Grid

| Topic | Unit | Description |
|-------|------|-------------|
| `givenergy/{serial}/state/battery_soc` | % | Battery state of charge |
| `givenergy/{serial}/state/battery_voltage` | V | Battery voltage |
| `givenergy/{serial}/state/grid_voltage` | V | Grid voltage |
| `givenergy/{serial}/state/grid_frequency` | Hz | Grid frequency |
| `givenergy/{serial}/state/pv_string_1_voltage` | V | PV string 1 voltage |
| `givenergy/{serial}/state/pv_string_2_voltage` | V | PV string 2 voltage |

### Temperatures

| Topic | Unit | Description |
|-------|------|-------------|
| `givenergy/{serial}/state/inverter_heatsink_temp` | C | Inverter heatsink |
| `givenergy/{serial}/state/battery_temp` | C | Battery pack |

### Energy Counters

| Topic | Unit | Description |
|-------|------|-------------|
| `givenergy/{serial}/state/pv_energy_today` | kWh | Solar generation today |
| `givenergy/{serial}/state/grid_import_today` | kWh | Grid import today |
| `givenergy/{serial}/state/grid_export_today` | kWh | Grid export today |
| `givenergy/{serial}/state/battery_charge_today` | kWh | Battery charge today |
| `givenergy/{serial}/state/battery_discharge_today` | kWh | Battery discharge today |
| `givenergy/{serial}/state/consumption_today` | kWh | Consumption today |
| `givenergy/{serial}/state/pv_energy_total` | kWh | Lifetime solar generation |
| `givenergy/{serial}/state/grid_import_total` | kWh | Lifetime grid import |
| `givenergy/{serial}/state/grid_export_total` | kWh | Lifetime grid export |

### Inverter State

| Topic | Values | Description |
|-------|--------|-------------|
| `givenergy/{serial}/state/enable_charge` | `ON` / `OFF` | Charging enabled |
| `givenergy/{serial}/state/enable_discharge` | `ON` / `OFF` | Discharging enabled |
| `givenergy/{serial}/state/charge_target_soc` | 4-100 | Target SOC (%) |

### Per-Battery Module

Each battery module publishes its own data under its serial number:

| Topic | Unit | Description |
|-------|------|-------------|
| `givenergy/{serial}/battery/{battery_serial}/soc` | % | State of charge |
| `givenergy/{serial}/battery/{battery_serial}/voltage` | V | Voltage |
| `givenergy/{serial}/battery/{battery_serial}/temp_max` | C | Max cell temperature |
| `givenergy/{serial}/battery/{battery_serial}/cycles` | count | Charge cycle count |

### Full Snapshot

The complete inverter state is also published as a single JSON object:

```
givenergy/{serial}/state/snapshot
```

### Commands

Publish to these topics to control the inverter. Commands use QoS 1 and are not retained.

| Topic | Payload | Description |
|-------|---------|-------------|
| `givenergy/{serial}/command/set_mode` | `eco`, `timed_demand`, `timed_export` | Set inverter mode |
| `givenergy/{serial}/command/set_charge_target` | `4`-`100` | Set charge target SOC |
| `givenergy/{serial}/command/set_charge_rate` | watts (e.g. `2600`) | Set charge power limit |
| `givenergy/{serial}/command/set_discharge_rate` | watts (e.g. `2600`) | Set discharge power limit |
| `givenergy/{serial}/command/set_battery_reserve` | `0`-`100` | Set minimum battery SOC |
| `givenergy/{serial}/command/set_charge_schedule_enabled` | `true` / `false` | Enable/disable charge schedule |
| `givenergy/{serial}/command/set_discharge_schedule_enabled` | `true` / `false` | Enable/disable discharge schedule |
| `givenergy/{serial}/command/set_charge_slot` | JSON (see below) | Set a charge time slot |
| `givenergy/{serial}/command/set_discharge_slot` | JSON (see below) | Set a discharge time slot |
| `givenergy/{serial}/command/sync_datetime` | any | Sync inverter clock to system time |
| `givenergy/{serial}/command/reboot` | any | Reboot the inverter |

#### Time Slot JSON Format

```json
{"slot": 1, "start": "00:30", "end": "04:30", "targetStateOfCharge": 100}
```

- `slot`: Slot number (1-based)
- `start` / `end`: 24-hour time strings
- `targetStateOfCharge`: Optional, Gen3 inverters only

## Home Assistant

When Home Assistant discovery is enabled (the default), entities are automatically registered on your MQTT broker. They appear as a single device named "GivEnergy {serial}" with:

**26 sensors** -- solar power, battery power, grid power, load power, battery SOC, PV string voltages and power, grid voltage and frequency, battery voltage, temperatures, and all energy counters with correct `device_class` and `state_class` for the HA Energy dashboard.

**9 controls:**
- **Select** -- Inverter mode (eco / timed demand / timed export)
- **Numbers** -- Charge target SOC, charge rate, discharge rate, battery reserve
- **Switches** -- Charge schedule, discharge schedule
- **Buttons** -- Sync date/time, reboot inverter

All entities include availability tracking via the bridge's LWT topic.

## Running as a Service

### systemd

Create `/etc/systemd/system/givenergy-mqtt.service`:

```ini
[Unit]
Description=GivEnergy MQTT Bridge
After=network-online.target mosquitto.service
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/npx givenergy-mqtt
WorkingDirectory=/etc/givenergy-mqtt
Restart=always
RestartSec=10

Environment=GIVENERGY_HOST=192.168.1.100
Environment=MQTT_URL=mqtt://localhost:1883

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now givenergy-mqtt
```

### Docker

```dockerfile
FROM node:22-slim
RUN npm install -g givenergy-mqtt
CMD ["givenergy-mqtt"]
```

```bash
docker run -d --name givenergy-mqtt \
  -e GIVENERGY_HOST=192.168.1.100 \
  -e MQTT_URL=mqtt://broker:1883 \
  --restart unless-stopped \
  givenergy-mqtt
```

## Important Notes

- **One client at a time.** The inverter's data adapter only supports a single Modbus TCP connection on port 8899. Don't run this alongside GivTCP or other local integrations.
- **Supported inverters.** Works with Gen2, Gen3, and three-phase GivEnergy inverters. The correct protocol is auto-detected from the serial number.
- **Poll interval.** Data is polled every 15 seconds by default. You can adjust this with `--poll-interval`, but going below 10 seconds is not recommended.

## License

GPL-3.0 -- see [LICENSE](LICENSE) for details.
