import React, { useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type MaskType = 'cpf' | 'cnpj' | 'phone' | 'cep' | 'currency';

export interface MaskedInputProps extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value'> {
  mask: MaskType;
  value: string;
  onValueChange: (rawValue: string, formattedValue: string) => void;
}

// --- MASK CONFIGURATION ---
const MASKS: Record<MaskType, { pattern: string; placeholder: string; maxLength: number }> = {
  cpf: { pattern: '###.###.###-##', placeholder: '000.000.000-00', maxLength: 14 },
  cnpj: { pattern: '##.###.###/####-##', placeholder: '00.000.000/0000-00', maxLength: 18 },
  phone: { pattern: '(##) #####-####', placeholder: '(00) 00000-0000', maxLength: 15 },
  cep: { pattern: '#####-###', placeholder: '00000-000', maxLength: 9 },
  currency: { pattern: '', placeholder: 'R$ 0,00', maxLength: 20 }, // Currency is handled specially
};

// Helper: Apply mask to raw value
const applyMask = (value: string, mask: MaskType): string => {
  const digits = value.replace(/\D/g, '');

  if (mask === 'currency') {
    // Currency formatting (BRL)
    if (!digits) return '';
    const numericValue = parseInt(digits, 10) / 100;
    return numericValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  const { pattern } = MASKS[mask];
  let formatted = '';
  let digitIndex = 0;

  for (let i = 0; i < pattern.length && digitIndex < digits.length; i++) {
    if (pattern[i] === '#') {
      formatted += digits[digitIndex];
      digitIndex++;
    } else {
      formatted += pattern[i];
    }
  }
  return formatted;
};

// Helper: Extract raw value (only digits)
const getRawValue = (value: string): string => value.replace(/\D/g, '');

/**
 * MaskedInput Component
 * A controlled input that applies formatting masks for CPF, CNPJ, Phone, CEP, and Currency.
 *
 * @example
 * <MaskedInput mask="cpf" value={cpf} onValueChange={(raw, formatted) => setCpf(raw)} />
 */
export const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, value, onValueChange, className, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const combinedRef = (ref as React.RefObject<HTMLInputElement>) || inputRef;

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        const rawValue = getRawValue(inputValue);
        const formattedValue = applyMask(rawValue, mask);
        onValueChange(rawValue, formattedValue);
      },
      [mask, onValueChange]
    );

    const formattedValue = applyMask(value, mask);
    const { placeholder, maxLength } = MASKS[mask];

    return (
      <Input
        ref={combinedRef}
        type="text"
        inputMode={mask === 'currency' ? 'decimal' : 'numeric'}
        value={formattedValue}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={maxLength}
        className={cn('industrial-input', className)}
        {...props}
      />
    );
  }
);

MaskedInput.displayName = 'MaskedInput';
