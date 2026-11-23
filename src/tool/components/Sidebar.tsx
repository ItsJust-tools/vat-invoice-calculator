'use client';

import React from 'react';
import { CURRENCIES, type ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="vat-invoice-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Currencies</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {CURRENCIES.map((c) => (
            <li key={c.value} className="flex justify-between gap-2">
              <span>{c.label}</span>
              <span className="text-gray-500 dark:text-gray-400">{c.symbol}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">VAT mode</h3>
        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={state.vatMode === 'extract'}
            onChange={(e) => onChange({ ...state, vatMode: e.target.checked ? 'extract' : 'add' })}
            data-testid="sidebar-mode-extract"
          />
          Extract VAT from gross prices
        </label>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          {state.vatMode === 'add'
            ? 'Net × (1 + rate) = gross.'
            : 'Gross ÷ (1 + rate) = net; VAT = gross − net.'}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved invoices</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} entr{state.history.length === 1 ? 'y' : 'ies'} in history
          {state.history.length > 0 ? ' (newest first)' : ''}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Rounding</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          All amounts are rounded to two decimals with half-up rounding (2.675 → 2.68) applied at
          each line and in the invoice totals.
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current invoice; open it to
          restore the invoice state.
        </p>
      </div>
    </div>
  );
};
