# Contributing to givenergy-mqtt

Thanks for your interest in contributing! This guide covers everything you need to get up and running.

## Prerequisites

- Node.js 20 or later
- npm
- An MQTT broker for manual testing (e.g. [Mosquitto](https://mosquitto.org/))
- Optionally, a GivEnergy inverter on your local network

## Getting Started

```bash
git clone git@github.com:jak/givenergy-mqtt.git
cd givenergy-mqtt
npm install
```

## Development Workflow

### Running Tests

```bash
npm test              # Run once
npm run test:watch    # Watch mode
```

Tests use [Vitest](https://vitest.dev/) and run entirely with mocks -- no inverter or MQTT broker needed.

### Building

```bash
npm run build
```

This produces `dist/cli.js` (with shebang) and `dist/bridge.js` via [tsup](https://tsup.egoist.dev/). The build targets Node 20 and outputs ESM.

### Running Locally

Against a real inverter:

```bash
npm run dev -- --host 192.168.1.100
```

This uses `tsx` for direct TypeScript execution without a build step.

## Project Structure

```
src/
  cli.ts          CLI entry point (yargs, signal handling)
  config.ts       Config loading: defaults -> YAML -> env -> CLI args
  bridge.ts       Orchestrator: connects inverter and MQTT, wires events
  mqtt-client.ts  MQTT wrapper with LWT and reconnect
  publisher.ts    Maps inverter snapshots to individual MQTT topics
  commander.ts    Routes MQTT command messages to inverter methods
  discovery.ts    Generates Home Assistant MQTT Discovery payloads
  topics.ts       Topic path builder
  logger.ts       Simple leveled console logger
  types.ts        Config interfaces and defaults

test/
  helpers.ts      Mock inverter snapshots and MQTT client
  bridge.test.ts  Bridge lifecycle, event wiring, reconnection
  publisher.test.ts  Topic mapping, retain flags, value formatting
  commander.test.ts  Command routing, payload validation
  discovery.test.ts  Entity generation, device classes, availability
  config.test.ts  Config merge order, defaults, env overrides
  topics.test.ts  Topic path construction
```

### How Data Flows

```
Inverter (LAN)
  |
  | givenergy-modbus (Modbus TCP, polls every ~15s)
  |
  v
bridge.ts  <-- orchestrates everything
  |
  |-- publisher.ts --> MQTT state topics (retained)
  |-- commander.ts <-- MQTT command topics --> inverter methods
  |-- discovery.ts --> HA discovery configs (retained)
  |
  v
MQTT Broker --> Home Assistant / other clients
```

1. `bridge.ts` connects to the inverter and MQTT broker
2. On each `data` event from the inverter (~15s), `publisher.ts` publishes all state topics
3. `commander.ts` subscribes to command topics and routes them to inverter methods
4. `discovery.ts` publishes HA discovery configs on connect and reconnect

### Key Design Decisions

**Individual topics over JSON blobs.** Each sensor value gets its own retained topic. This makes HA integration simpler and lets lightweight MQTT clients subscribe to exactly the data they need.

**Thin MQTT wrapper.** `mqtt-client.ts` wraps `mqtt.js` with promise-based publish/subscribe. The underlying `mqtt.js` client handles reconnection natively.

**Declarative mappings.** Both `publisher.ts` (state mappings) and `commander.ts` (command handlers) use declarative maps rather than long if/else chains. Adding a new sensor or command means adding one entry to an array.

## Adding a New Sensor

1. Add the mapping to `STATE_MAPPINGS` in `src/publisher.ts`:

```typescript
{ key: "my_new_sensor", extract: (s) => String(s.someField) },
```

2. Add a HA discovery entry in `src/discovery.ts` in the `sensorConfigs` function, specifying the correct `device_class`, `state_class`, and `unit_of_measurement`.

3. Add a test assertion in `test/publisher.test.ts` and `test/discovery.test.ts`.

4. Run `npm test` to verify.

## Adding a New Command

1. Add a handler to `COMMAND_HANDLERS` in `src/commander.ts`:

```typescript
my_command: async (inv, payload) => {
  // Validate payload
  // Call inverter method
  await inv.someMethod(parsedValue);
},
```

2. If it should appear in HA, add a control config in `src/discovery.ts` in the `controlConfigs` function.

3. Add test cases in `test/commander.test.ts` covering both the happy path and validation errors.

## Testing Approach

- All tests use mocks -- `test/helpers.ts` provides `createMockSnapshot()` and `createMockMqtt()`
- `createMockSnapshot()` returns a realistic `InverterSnapshot` with typical values
- `createMockMqtt()` records all published messages, subscriptions, and message handlers for assertions
- The bridge test mocks both `givenergy-modbus` and `mqtt-client.ts` at the module level

When writing tests, prefer specific assertions over snapshot tests. Check exact topic names, payload values, and retain flags.

## CI

GitHub Actions runs on every push and PR against Node 20, 22, and 24:

```bash
npm ci
npm test
npm run build
```

All three must pass before merging.

## Commit Style

Use concise commit messages that describe what changed and why. One logical change per commit.

## Submitting Changes

1. Fork the repo and create a branch from `main`
2. Make your changes with tests
3. Run `npm test` and `npm run build` locally
4. Open a pull request against `main`
