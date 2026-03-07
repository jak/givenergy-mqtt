export class TopicBuilder {
  constructor(
    private prefix: string,
    private serial: string,
  ) {}

  status(): string {
    return `${this.prefix}/${this.serial}/status`;
  }

  snapshot(): string {
    return `${this.prefix}/${this.serial}/state/snapshot`;
  }

  state(key: string): string {
    return `${this.prefix}/${this.serial}/state/${key}`;
  }

  battery(batterySerial: string, key: string): string {
    return `${this.prefix}/${this.serial}/battery/${batterySerial}/${key}`;
  }

  command(name: string): string {
    return `${this.prefix}/${this.serial}/command/${name}`;
  }

  commandSubscription(): string {
    return `${this.prefix}/${this.serial}/command/+`;
  }
}
