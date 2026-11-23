'use client';

import React from 'react';
import {
  CURRENCIES,
  formatMoney,
  lineTotals,
  type Currency,
  type InvoiceLine,
  type ToolState,
} from '../types';
import { VAT_RATES } from '../ui-shared';
import { currencySymbol, invoiceTotals, summaryText } from '../tool-definition';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const inputClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

const selectClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Copy value"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function EmptyLine(): InvoiceLine {
  return { description: '', quantity: '1', unitPrice: '0', vatRate: '19' };
}

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const symbol = currencySymbol(state.currency);
  const totals = invoiceTotals(state.lines, state.vatMode);

  const patchLine = (index: number, patch: Partial<InvoiceLine>) => {
    const lines = state.lines.map((line, i) => (i === index ? { ...line, ...patch } : line));
    update({ lines });
  };

  const removeLine = (index: number) => {
    update({ lines: state.lines.filter((_, i) => i !== index) });
  };

  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 text-gray-900 dark:text-gray-100"
      data-testid="vat-canvas"
    >
      <header className="text-center">
        <h2 className="text-xl font-semibold" data-testid="canvas-title">
          VAT Invoice Calculator
        </h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Add line items, choose per-line VAT rates, and get a printable invoice summary.
        </p>
      </header>

      <section
        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/50"
        data-testid="invoice-settings"
      >
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Invoice settings
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Currency
            <select
              value={state.currency}
              onChange={(e) => update({ currency: e.target.value as Currency })}
              data-testid="select-currency"
              className={selectClass}
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label} ({c.symbol})
                </option>
              ))}
            </select>
          </label>
          <div className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Mode
            <div className="mt-1 flex gap-2" role="group" aria-label="VAT mode">
              <button
                type="button"
                onClick={() => update({ vatMode: 'add' })}
                data-testid="btn-mode-add"
                className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium ${
                  state.vatMode === 'add'
                    ? 'border-violet-500 bg-violet-500 text-white'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                Add to net
              </button>
              <button
                type="button"
                onClick={() => update({ vatMode: 'extract' })}
                data-testid="btn-mode-extract"
                className={`flex-1 rounded-md border px-3 py-2 text-xs font-medium ${
                  state.vatMode === 'extract'
                    ? 'border-violet-500 bg-violet-500 text-white'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                Subtract from gross
              </button>
            </div>
            <p
              className="mt-1 text-[11px] text-gray-500 dark:text-gray-400"
              data-testid="mode-hint"
            >
              {state.vatMode === 'add'
                ? 'Unit price is net; VAT is added on top.'
                : 'Unit price is gross; VAT is extracted from it.'}
            </p>
          </div>
        </div>
      </section>

      <section
        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/50"
        data-testid="line-items"
      >
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Line items
        </h3>
        {state.lines.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="lines-empty">
            No line items yet. Add one to get started.
          </p>
        ) : (
          <ul className="space-y-3" data-testid="lines-list">
            {state.lines.map((line, index) => {
              const t = lineTotals(line, state.vatMode);
              return (
                <li
                  key={index}
                  className="grid grid-cols-1 gap-3 rounded-md border border-gray-200 p-3 sm:grid-cols-12 dark:border-gray-800"
                  data-testid={`line-${index}`}
                >
                  <label className="text-xs font-medium text-gray-700 sm:col-span-4 dark:text-gray-300">
                    Description
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => patchLine(index, { description: e.target.value })}
                      data-testid={`line-${index}-description`}
                      className={inputClass}
                    />
                  </label>
                  <label className="text-xs font-medium text-gray-700 sm:col-span-2 dark:text-gray-300">
                    Quantity
                    <input
                      type="text"
                      inputMode="decimal"
                      value={line.quantity}
                      onChange={(e) => patchLine(index, { quantity: e.target.value })}
                      data-testid={`line-${index}-quantity`}
                      className={inputClass}
                    />
                  </label>
                  <label className="text-xs font-medium text-gray-700 sm:col-span-2 dark:text-gray-300">
                    Unit price
                    <input
                      type="text"
                      inputMode="decimal"
                      value={line.unitPrice}
                      onChange={(e) => patchLine(index, { unitPrice: e.target.value })}
                      data-testid={`line-${index}-unit-price`}
                      className={inputClass}
                    />
                  </label>
                  <label className="text-xs font-medium text-gray-700 sm:col-span-2 dark:text-gray-300">
                    VAT rate
                    <select
                      value={line.vatRate}
                      onChange={(e) => patchLine(index, { vatRate: e.target.value })}
                      data-testid={`line-${index}-vat-rate`}
                      className={selectClass}
                    >
                      {VAT_RATES.map((rate) => (
                        <option key={rate.label} value={String(rate.value)}>
                          {rate.label}
                        </option>
                      ))}
                      {!VAT_RATES.some((r) => String(r.value) === line.vatRate) ? (
                        <option value={line.vatRate}>{line.vatRate}%</option>
                      ) : null}
                    </select>
                  </label>
                  <div className="flex items-end justify-between gap-2 sm:col-span-2">
                    <span
                      className="text-xs text-gray-700 dark:text-gray-300"
                      data-testid={`line-${index}-total`}
                    >
                      {t.invalid ? '—' : `${symbol}${(t.gross ?? 0).toFixed(2)}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      data-testid={`line-${index}-remove`}
                      className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      aria-label={`Remove line ${index + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <button
          type="button"
          onClick={() => update({ lines: [...state.lines, EmptyLine()] })}
          data-testid="btn-add-line"
          className="mt-3 rounded-md bg-violet-500 px-4 py-2 text-xs font-medium text-white hover:bg-violet-600"
        >
          + Add line item
        </button>
      </section>

      <section
        className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50"
        data-testid="result-card"
      >
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Invoice summary
        </h3>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-2" data-testid="summary-subtotal">
            <dt className="text-gray-600 dark:text-gray-400">Subtotal (net)</dt>
            <dd className="font-mono">{formatMoney(totals.subtotal, state.currency)}</dd>
          </div>
          <div className="flex justify-between gap-2" data-testid="summary-vat">
            <dt className="text-gray-600 dark:text-gray-400">Total VAT</dt>
            <dd className="font-mono">{formatMoney(totals.totalVat, state.currency)}</dd>
          </div>
          <div
            className="flex justify-between gap-2 border-t border-gray-200 pt-1 dark:border-gray-700"
            data-testid="summary-total"
          >
            <dt className="font-medium">Grand total</dt>
            <dd className="font-mono font-semibold">
              {formatMoney(totals.grandTotal, state.currency)}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400" data-testid="result-main">
          {totals.invalidLines > 0
            ? `${totals.invalidLines} line${totals.invalidLines === 1 ? '' : 's'} invalid — enter valid quantity, unit price and VAT rate.`
            : summaryText(state)}
        </p>
        {totals.hasValidLines ? (
          <button
            type="button"
            data-testid="btn-save-history"
            onClick={() => onSaveHistory?.(summaryText(state))}
            className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Save to history
          </button>
        ) : null}
      </section>

      <section className="print:block">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Printable invoice
        </h3>
        <div
          className="rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-800 dark:bg-gray-900/50"
          data-testid="printable-invoice"
        >
          <table className="w-full text-left text-xs" data-testid="invoice-table">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="py-1">Description</th>
                <th className="py-1 text-right">Quantity</th>
                <th className="py-1 text-right">Unit price</th>
                <th className="py-1 text-right">VAT %</th>
                <th className="py-1 text-right">Net</th>
                <th className="py-1 text-right">VAT</th>
                <th className="py-1 text-right">Gross</th>
              </tr>
            </thead>
            <tbody>
              {state.lines.map((line, index) => {
                const t = lineTotals(line, state.vatMode);
                return (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-1">{line.description || `Item ${index + 1}`}</td>
                    <td className="py-1 text-right">{line.quantity}</td>
                    <td className="py-1 text-right">{line.unitPrice}</td>
                    <td className="py-1 text-right">{line.vatRate}%</td>
                    <td className="py-1 text-right">{t.invalid ? '—' : (t.net ?? 0).toFixed(2)}</td>
                    <td className="py-1 text-right">{t.invalid ? '—' : (t.vat ?? 0).toFixed(2)}</td>
                    <td className="py-1 text-right">
                      {t.invalid ? '—' : (t.gross ?? 0).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="py-1 text-right font-medium">
                  Subtotal (net)
                </td>
                <td colSpan={3} className="py-1 text-right font-mono">
                  {totals.subtotal.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="py-1 text-right font-medium">
                  Total VAT
                </td>
                <td colSpan={3} className="py-1 text-right font-mono">
                  {totals.totalVat.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="py-1 text-right font-semibold">
                  Grand total
                </td>
                <td colSpan={3} className="py-1 text-right font-mono font-semibold">
                  {totals.grandTotal.toFixed(2)} {symbol}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          History
        </h3>
        {state.history.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="history-empty">
            No saved invoices yet.
          </p>
        ) : (
          <ul className="space-y-1" data-testid="history-list">
            {state.history.map((entry, i) => (
              <li
                key={`${entry.createdAt}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-800"
              >
                <span className="text-gray-700 dark:text-gray-300">{entry.text}</span>
                <CopyButton value={entry.text} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        All calculations run locally in your browser; nothing is uploaded. Amounts are rounded to
        two decimals using half-up rounding.
      </p>
    </div>
  );
};
