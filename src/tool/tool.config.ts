import type { ToolConfig } from '@itsjust/core';

export const toolConfig: ToolConfig = {
  id: 'vat-invoice-calculator',
  name: 'VAT Invoice Calculator',
  description:
    'Calculate net/gross prices with VAT rates, line items, and a printable invoice summary.',
  version: '1.0.0',
  exportFormats: ['json', 'png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: false,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    brand: 'ItsJust Tools',
    brandUrl: 'https://itsjust.tools',
  },
};

export default toolConfig;
