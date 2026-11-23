import { describe, it, expect } from 'vitest';
import {
  round2,
  lineTotals,
  invoiceTotals,
  summaryText,
  formatMoney,
  currencySymbol,
  parseNumber,
  MAX_HISTORY,
  DEFAULT_STATE,
  type InvoiceLine,
  type ToolState,
} from '@/tool/types';
import {
  serializeState,
  deserializeState,
  roundTrips,
  numberOrNull,
  withHistory,
  vatInvoiceCalculatorTool,
} from '@/tool/tool-definition';

/** Canonical JSON string with sorted object keys. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

const line = (over: Partial<InvoiceLine> = {}): InvoiceLine => ({
  description: 'Item',
  quantity: '1',
  unitPrice: '100',
  vatRate: '19',
  ...over,
});

const state = (over: Partial<ToolState> = {}): ToolState => ({
  ...DEFAULT_STATE,
  ...over,
});

describe('round2', () => {
  it('rounds to two decimals half-up', () => {
    expect(round2(2.675)).toBe(2.68);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(10.005)).toBe(10.01);
    expect(round2(0.005)).toBe(0.01);
    expect(round2(1.234)).toBe(1.23);
    expect(round2(1.235)).toBe(1.24);
  });

  it('handles negatives and zero', () => {
    expect(round2(0)).toBe(0);
    expect(round2(-2.675)).toBe(-2.67); // ties round toward +infinity (half-up)
    expect(round2(-1.004)).toBe(-1);
  });

  it('returns non-finite input unchanged', () => {
    expect(round2(Infinity)).toBe(Infinity);
    expect(round2(NaN)).toBeNaN();
  });
});

describe('lineTotals (add mode)', () => {
  it('computes net, VAT and gross for multiple quantities', () => {
    const t = lineTotals(line({ quantity: '3', unitPrice: '49.99', vatRate: '19' }), 'add');
    expect(t.net).toBe(149.97);
    expect(t.vat).toBe(28.49);
    expect(t.gross).toBe(178.46);
    expect(t.invalid).toBe(false);
  });

  it('computes reduced and zero rates', () => {
    expect(lineTotals(line({ quantity: '2', unitPrice: '10', vatRate: '7' }), 'add')).toMatchObject(
      {
        net: 20,
        vat: 1.4,
        gross: 21.4,
      }
    );
    expect(lineTotals(line({ quantity: '5', unitPrice: '8', vatRate: '0' }), 'add')).toMatchObject({
      net: 40,
      vat: 0,
      gross: 40,
    });
  });

  it('handles zero quantity', () => {
    const t = lineTotals(line({ quantity: '0' }), 'add');
    expect(t.net).toBe(0);
    expect(t.vat).toBe(0);
    expect(t.gross).toBe(0);
    expect(t.invalid).toBe(false);
  });

  it('flags invalid parsing', () => {
    for (const over of [
      { quantity: 'abc' },
      { unitPrice: '' },
      { vatRate: 'x' },
      { quantity: '1e', unitPrice: ' ' },
    ]) {
      expect(lineTotals(line(over), 'add').invalid).toBe(true);
      expect(lineTotals(line(over), 'add').net).toBeNull();
    }
  });
});

describe('lineTotals (extract mode)', () => {
  it('extracts VAT from a gross unit price', () => {
    const t = lineTotals(line({ quantity: '1', unitPrice: '119', vatRate: '19' }), 'extract');
    expect(t.gross).toBe(119);
    expect(t.net).toBe(100);
    expect(t.vat).toBe(19);
  });

  it('extracts VAT for multiple quantities with rounding', () => {
    const t = lineTotals(line({ quantity: '2', unitPrice: '59', vatRate: '19' }), 'extract');
    expect(t.gross).toBe(118);
    expect(t.net).toBe(99.16); // 118 / 1.19 = 99.1596...
    expect(t.vat).toBe(18.84);
  });

  it('handles zero rate (VAT equals gross minus net)', () => {
    const t = lineTotals(line({ quantity: '3', unitPrice: '20', vatRate: '0' }), 'extract');
    expect(t.net).toBe(60);
    expect(t.vat).toBe(0);
    expect(t.gross).toBe(60);
  });
});

describe('invoiceTotals', () => {
  it('sums valid lines and counts invalid ones', () => {
    const lines = [
      line({ quantity: '1', unitPrice: '100', vatRate: '19' }),
      line({ description: 'Book', quantity: '2', unitPrice: '25', vatRate: '7' }),
      line({ description: 'Free', quantity: '1', unitPrice: '10', vatRate: '0' }),
    ];
    const t = invoiceTotals(lines, 'add');
    expect(t.subtotal).toBe(160);
    expect(t.totalVat).toBe(22.5); // 19 + 3.5 + 0
    expect(t.grandTotal).toBe(182.5);
    expect(t.invalidLines).toBe(0);
    expect(t.hasValidLines).toBe(true);
  });

  it('is empty-safe: zero lines yield zero totals', () => {
    const t = invoiceTotals([], 'add');
    expect(t.subtotal).toBe(0);
    expect(t.totalVat).toBe(0);
    expect(t.grandTotal).toBe(0);
    expect(t.hasValidLines).toBe(false);
  });

  it('counts invalid lines without breaking totals', () => {
    const t = invoiceTotals([line(), line({ quantity: 'oops' })], 'add');
    expect(t.invalidLines).toBe(1);
    expect(t.grandTotal).toBe(119);
    expect(t.hasValidLines).toBe(true);
  });

  it('add vs extract produce different totals for same gross input', () => {
    const lines = [line({ unitPrice: '119', vatRate: '19' })];
    const add = invoiceTotals(lines, 'add');
    const extract = invoiceTotals(lines, 'extract');
    expect(add.grandTotal).toBe(141.61); // 119 * 1.19
    expect(extract.grandTotal).toBe(119);
    expect(extract.totalVat).toBe(19);
  });
});

describe('parseNumber and numberOrNull', () => {
  it('accepts plain decimals and rejects junk', () => {
    expect(parseNumber('19')).toBe(19);
    expect(parseNumber(' .5 ')).toBe(0.5);
    expect(parseNumber('2.75')).toBe(2.75);
    expect(parseNumber('-4')).toBe(-4);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('1.2.3')).toBeNull();
    expect(parseNumber('NaN')).toBeNull();
    expect(numberOrNull('42')).toBe(42);
    expect(numberOrNull('nope')).toBeNull();
  });
});

describe('money formatting', () => {
  it('formats with currency symbols', () => {
    expect(formatMoney(119, 'EUR')).toBe('€119.00');
    expect(formatMoney(9.5, 'USD')).toBe('$9.50');
    expect(formatMoney(0.4, 'GBP')).toBe('£0.40');
    expect(formatMoney(null, 'EUR')).toBe('€ —');
    expect(currencySymbol('EUR')).toBe('€');
    expect(currencySymbol('USD')).toBe('$');
    expect(currencySymbol('GBP')).toBe('£');
  });
});

describe('serialize / deserialize round trip', () => {
  it('round-trips full state accurately', () => {
    const s = state({
      currency: 'GBP',
      vatMode: 'extract',
      lines: [
        line({ description: 'Widget', quantity: '3', unitPrice: '10.5', vatRate: '7' }),
        line({ description: '', quantity: '0', unitPrice: '0', vatRate: '0' }),
      ],
      history: [{ text: 'Invoice: 34.05 £', createdAt: '2026-11-23T10:00:00.000Z' }],
    });
    expect(roundTrips(s)).toBe(true);
    const restored = deserializeState(JSON.parse(serializeState(s)));
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(JSON.stringify(canonical(restored.data))).toBe(JSON.stringify(canonical(s)));
    }
  });

  it('recovers invalid payloads with defaults', () => {
    const broken = deserializeState('not an object');
    expect(broken.success).toBe(false);
    const junk = deserializeState({ lines: 'nope', vatMode: 'x', currency: 'CHF', history: 5 });
    expect(junk.success).toBe(true);
    if (junk.success) {
      expect(junk.data.vatMode).toBe('add');
      expect(junk.data.currency).toBe('EUR');
      expect(junk.data.lines).toEqual([]);
      expect(junk.data.history).toEqual([]);
    }
  });

  it('caps serialized lines and history', () => {
    const many = Array.from({ length: 500 }, (_, i) => line({ description: `L${i}` }));
    const restored = deserializeState({ ...DEFAULT_STATE, lines: many });
    if (!restored.success) throw new Error('expected success');
    expect(restored.data.lines.length).toBeGreaterThanOrEqual(0);
    expect(restored.data.lines.length).toBeLessThanOrEqual(500);
    const hist = Array.from({ length: 40 }, (_, i) => ({
      text: `t${i}`,
      createdAt: '2026-11-23T00:00:00.000Z',
    }));
    const withCap = deserializeState({ ...DEFAULT_STATE, history: hist });
    if (!withCap.success) throw new Error('expected success');
    expect(withCap.data.history.length).toBe(MAX_HISTORY);
  });
});

describe('tool contract', () => {
  it('matches the configured id and initial state', () => {
    expect(vatInvoiceCalculatorTool.id).toBe('vat-invoice-calculator');
    expect(vatInvoiceCalculatorTool.name).toBe('VAT Invoice Calculator');
    expect(vatInvoiceCalculatorTool.initialState).toEqual(DEFAULT_STATE);
    expect(vatInvoiceCalculatorTool.serialize(DEFAULT_STATE)).toBe(serializeState(DEFAULT_STATE));
  });
});

describe('history helpers', () => {
  it('withHistory prepends and caps entries', () => {
    let s = state({ history: [] });
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      s = withHistory(s, `inv-${i}`, new Date(2026, 10, 23, 12, 0, i));
    }
    expect(s.history.length).toBe(MAX_HISTORY);
    expect(s.history[0]?.text).toBe(`inv-${MAX_HISTORY + 4}`);
  });

  it('summaryText describes a valid invoice', () => {
    const s = state({ lines: [line({ unitPrice: '100' })] });
    expect(summaryText(s)).toBe('Invoice: 119.00 € (net 100.00, VAT 19.00)');
    expect(summaryText(state({ lines: [] }))).toBe('Invoice: add at least one valid line');
  });
});
