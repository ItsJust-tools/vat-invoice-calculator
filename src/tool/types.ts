export type VatMode = 'add' | 'extract';

export type Currency = 'EUR' | 'USD' | 'GBP';

export interface InvoiceLine {
  /** Line description. */
  description: string;
  /** Quantity as typed by the user. */
  quantity: string;
  /** Unit price (net, per unit) as typed by the user. */
  unitPrice: string;
  /** VAT rate percent, e.g. '19', '7', '0'. */
  vatRate: string;
}

export interface HistoryEntry {
  /** Short human readable description of the saved invoice. */
  text: string;
  /** ISO timestamp when the entry was saved. */
  createdAt: string;
}

export interface ToolState {
  /** Chosen display currency. */
  currency: Currency;
  /** 'add' = VAT added to net, 'extract' = VAT extracted from gross. */
  vatMode: VatMode;
  /** Invoice line items. */
  lines: InvoiceLine[];
  /** Saved invoice summaries, newest first. */
  history: HistoryEntry[];
}

export const DEFAULT_STATE: ToolState = {
  currency: 'EUR',
  vatMode: 'add',
  lines: [{ description: 'Consulting', quantity: '2', unitPrice: '50', vatRate: '19' }],
  history: [],
};

export const MAX_HISTORY = 20;
export const MAX_LINES = 100;
export const UNSET: string = '';

/** Common VAT rate presets in percent. */
export const VAT_PRESETS: number[] = [19, 7, 0];

export const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'EUR', label: 'EUR', symbol: '€' },
  { value: 'USD', label: 'USD', symbol: '$' },
  { value: 'GBP', label: 'GBP', symbol: '£' },
];

/** Currency symbol for a currency code. */
export function currencySymbol(currency: Currency): string {
  return CURRENCIES.find((c) => c.value === currency)?.symbol ?? currency;
}

/** Parse a plain decimal number; returns null for empty/unparseable input. */
export function parseNumber(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/**
 * Round to two decimals using half-up rounding at decimal boundaries.
 * Adds a tiny epsilon so values like 2.675 (which float-represent as
 * 2.67499999...) round up as the decimal math expects.
 */
export function round2(value: number): number {
  if (!Number.isFinite(value)) return value;
  const scaled = value * 100 + Number.EPSILON * Math.abs(value * 100);
  return Math.round(scaled) / 100;
}

/** Format a money amount with exactly two decimals. */
export function formatMoney(value: number | null, currency: Currency): string {
  const symbol = currencySymbol(currency);
  if (value === null || !Number.isFinite(value)) return `${symbol} —`;
  return `${symbol}${round2(value).toFixed(2)}`;
}

export interface LineTotals {
  /** Rounded net amount for the whole line (quantity × unit price). */
  net: number | null;
  /** Rounded VAT amount for the line. */
  vat: number | null;
  /** Rounded gross amount for the line. */
  gross: number | null;
  /** True when the line inputs could not be parsed. */
  invalid: boolean;
}

/** Compute net/VAT/gross for a single line item. */
export function lineTotals(line: InvoiceLine, vatMode: VatMode): LineTotals {
  const qty = parseNumber(line.quantity);
  const unit = parseNumber(line.unitPrice);
  const rate = parseNumber(line.vatRate);
  if (qty === null || unit === null || rate === null) {
    return { net: null, vat: null, gross: null, invalid: true };
  }
  const net = round2(qty * unit);
  if (vatMode === 'extract') {
    const gross = net;
    const netFromGross = rate === -100 ? null : round2((gross * 100) / (100 + rate));
    const vat = netFromGross === null ? null : round2(gross - netFromGross);
    return { net: netFromGross, vat, gross, invalid: false };
  }
  const vat = round2((net * rate) / 100);
  const gross = round2(net + vat);
  return { net, vat, gross, invalid: false };
}

export interface InvoiceTotals {
  /** Sum of valid line net amounts. */
  subtotal: number;
  /** Sum of valid line VAT amounts. */
  totalVat: number;
  /** Sum of valid line gross amounts. */
  grandTotal: number;
  /** Number of lines with unparseable inputs. */
  invalidLines: number;
  /** True when at least one line is fully valid. */
  hasValidLines: boolean;
}

/** Sum all line totals into an invoice summary. */
export function invoiceTotals(lines: InvoiceLine[], vatMode: VatMode): InvoiceTotals {
  let subtotal = 0;
  let totalVat = 0;
  let grandTotal = 0;
  let invalidLines = 0;
  let hasValidLines = false;
  for (const line of lines) {
    const t = lineTotals(line, vatMode);
    if (t.invalid) {
      invalidLines += 1;
      continue;
    }
    hasValidLines = true;
    subtotal += t.net ?? 0;
    totalVat += t.vat ?? 0;
    grandTotal += t.gross ?? 0;
  }
  return {
    subtotal: round2(subtotal),
    totalVat: round2(totalVat),
    grandTotal: round2(grandTotal),
    invalidLines,
    hasValidLines,
  };
}

/** Compact summary used by the status bar and copy actions. */
export function summaryText(state: ToolState): string {
  const totals = invoiceTotals(state.lines, state.vatMode);
  const symbol = currencySymbol(state.currency);
  if (!totals.hasValidLines) return 'Invoice: add at least one valid line';
  return `Invoice: ${totals.grandTotal.toFixed(2)} ${symbol} (net ${totals.subtotal.toFixed(
    2
  )}, VAT ${totals.totalVat.toFixed(2)})`;
}

/** Build a history entry text for the current state. */
export function historyText(state: ToolState): string {
  return summaryText(state);
}

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return typeof v.vatMode === 'string' && Array.isArray(v.lines);
}
