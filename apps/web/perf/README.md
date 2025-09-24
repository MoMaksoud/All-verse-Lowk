# Performance Measurement & Optimization

This directory contains performance measurement tools and reports for the Next.js marketplace application.

## Bundle Analysis

Run bundle analysis:
```bash
npm run analyze
```

This generates:
- `perf/bundle-report.html` - Interactive bundle analyzer
- `perf/bundle-stats.json` - Raw bundle statistics

## Lighthouse Reports

Run Lighthouse audits:
```bash
npm run lighthouse
```

This generates:
- `perf/lighthouse-home.json` - Home page audit
- `perf/lighthouse-sell.json` - Sell page audit  
- `perf/lighthouse-listing.json` - Listing detail audit
- `perf/lighthouse-*.png` - Screenshots

## Performance Targets

### Bundle Size Targets
- Client JS (gzipped): ↓ ≥40% on Home page
- Initial bundle: <200KB gzipped

### Lighthouse Targets (Mobile)
- LCP: ↓ ≥30% (target <2.5s)
- TTI: ↓ ≥30% (target <3.5s)
- CLS: <0.05

### Route Transition Targets
- Desktop: <150ms median
- Mobile: <250ms median

## Route Transition Monitoring

Client-side route transitions are automatically measured using `performance.mark/measure` in development mode. Check browser console for timing data.

## Optimization Checklist

- [ ] Client JS (gz) ↓ ≥40% on Home
- [ ] Lighthouse Mobile: LCP & TTI ↓ ≥30% on `/`
- [ ] All non-interactive components are Server Components
- [ ] Heavy widgets/maps/AI UIs load via `next/dynamic`
- [ ] next/image everywhere with proper sizes/placeholders; CLS < 0.05
- [ ] Fonts via `next/font`; only needed weights
- [ ] Firebase imports are modular; no compat; client SDK only where necessary
- [ ] Caching headers set; hashed assets immutable
- [ ] Bundle analyzer report and Lighthouse artifacts in /apps/web/perf/
