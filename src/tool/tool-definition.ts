import type { DeserializeResult } from '@itsjust/core';
import { round2 } from './types';

export { round2 };

import type { Tool } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  MAX_HISTORY,
  MAX_LINES,
  currencySymbol,
  historyText,
  invoiceTotals,
  lineTotals,
  formatMoney,
  parseNumber,
  round2 as round2dup,
  summaryText,
  type Currency,
  type HistoryEntry,
  type InvoiceLine,
  type ToolState,
  type VatMode,
} from './types';

const VALID_MODES: VatMode[] = ['add', 'extract'];
const VALID_CURRENCIES: Currency[] = ['EUR', 'USD', 'GBP'];

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    vatMode: state.vatMode,
    currency: state.currency,
    lines: state.lines,
    history: state.history,
  });
}

function validLines(value: unknown): InvoiceLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (line): line is InvoiceLine =>
        typeof line === 'object' &&
        line !== null &&
        typeof (line as InvoiceLine).description === 'string' &&
        typeof (line as InvoiceLine).quantity === 'string' &&
        typeof (line as InvoiceLine).unitPrice === 'string' &&
        typeof (line as InvoiceLine).vatRate === 'string'
    )
    .slice(0, MAX_LINES);
}

function validHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as HistoryEntry).text === 'string' &&
        typeof (entry as HistoryEntry).createdAt === 'string'
    )
    .slice(0, MAX_HISTORY);
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected VAT invoice calculator state object',
    };
  }
  const v = data as Record<string, unknown>;
  const vatMode: VatMode = VALID_MODES.includes(v.vatMode as VatMode)
    ? (v.vatMode as VatMode)
    : DEFAULT_STATE.vatMode;
  const currency: Currency = VALID_CURRENCIES.includes(v.currency as Currency)
    ? (v.currency as Currency)
    : DEFAULT_STATE.currency;
  const state: ToolState = {
    vatMode,
    currency,
    lines: validLines(v.lines),
    history: validHistory(v.history),
  };
  return { success: true, data: state };
}

/** Append a history entry to state, capped at MAX_HISTORY, newest first. */
export function withHistory(state: ToolState, text: string, now = new Date()): ToolState {
  const entry: HistoryEntry = { text, createdAt: now.toISOString() };
  return { ...state, history: [entry, ...state.history].slice(0, MAX_HISTORY) };
}

/** Canonical JSON with recursively sorted object keys. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return (
      restored.success &&
      JSON.stringify(canonicalize(restored.data)) === JSON.stringify(canonicalize(state))
    );
  } catch {
    return false;
  }
}

const numberOrNull = (value: string): number | null => parseNumber(value);

export const vatInvoiceCalculatorTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};

export {
  currencySymbol,
  formatMoney,
  historyText,
  invoiceTotals,
  lineTotals,
  numberOrNull,
  parseNumber,
  round2dup,
  summaryText,
};
