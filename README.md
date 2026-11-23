# VAT Invoice Calculator

Calculate net/gross prices with configurable VAT rates, line items, and a printable invoice summary — entirely in your browser.

**Live:** [vat-invoice-calculator.itsjust.tools](https://vat-invoice-calculator.itsjust.tools)

## Features

- Add line items with description, quantity, and unit price
- Per-item net, VAT amount, and gross calculations
- Configurable VAT rate per line with presets (19%, 7%, 0%)
- Invoice subtotal, total VAT, and grand total summary
- Two calculation modes: add VAT to net, or extract VAT from gross
- Quantity multipliers with per-line remove and clear controls
- Currency selection (EUR, USD, GBP)
- Shareable invoice state via URL, `.itsjust.json` import/export and image/PDF export
- Amounts rounded to two decimals (half-up rounding at decimal boundaries)
- Printable invoice table of the whole invoice
- 100% client-side — no data ever leaves your browser

## Rounding notes

All amounts are rounded to two decimals using half-up rounding (for example `2.675 → 2.68`).
Rounding is applied per line and again when summing the invoice totals, so printed totals
always match the sum of the displayed line values.

## Development

```bash
npm install
npm run build -w @itsjust/core   # build shared core first
npm run dev
npm test
```

## Deployment

```bash
docker build -t itsjust-vat-invoice-calculator .
docker run -p 3000:3000 itsjust-vat-invoice-calculator
```

## License

MIT
