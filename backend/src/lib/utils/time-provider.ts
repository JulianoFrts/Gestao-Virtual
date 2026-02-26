export interface TimeProvider {
  now(): Date;
  toISOString(): string;
}

export class SystemTimeProvider implements TimeProvider {
  now(): Date {
    return new Date() /* deterministic-bypass */ /* bypass-audit */;
  }

  toISOString(): string {
    return new Date() /* deterministic-bypass */ /* bypass-audit */.toISOString();
  }
}
