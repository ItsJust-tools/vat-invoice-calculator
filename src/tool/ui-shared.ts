import { CURRENCIES, VAT_PRESETS, type ToolState } from './types';

export { VAT_PRESETS };

export const VAT_RATES: { value: number; label: string; hint: string }[] = [
  { value: 19, label: '19%', hint: 'standard rate' },
  { value: 7, label: '7%', hint: 'reduced rate' },
  { value: 0, label: '0%', hint: 'zero rate / VAT-free' },
];

export function isState(value: unknown): value is ToolState {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as ToolState).lines) &&
    CURRENCIES.length > 0 &&
    VAT_PRESETS.length > 0
  );
}
