export interface TimeProvider {
  now(): Date;
  toISOString(): string;
}

export class SystemTimeProvider implements TimeProvider {
  now(): Date {
    return new Date();
  }

  toISOString(): string {
    return new Date().toISOString();
  }
}
