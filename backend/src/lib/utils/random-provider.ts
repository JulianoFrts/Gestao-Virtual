/**
 * RandomProvider - Abstração para geração de dados randômicos
 * Essencial para testabilidade determinística.
 */

export interface RandomProvider {
  nextString(length?: number): string;
  nextNumber(min?: number, max?: number): number;
}

export class SystemRandomProvider implements RandomProvider {
  private readonly ALPHANUMERIC_BASE = 36;

  nextString(length: number = 10): string {
    return Math.random()
      .toString(this.ALPHANUMERIC_BASE)
      .substring(2, length + 2);
  }

  nextNumber(min: number = 0, max: number = 1): number {
    return Math.random() * (max - min) + min;
  }
}
