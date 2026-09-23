# SnackStation — Smart Food Shop Management App

Ionic + Angular (standalone components) mobile app, styled after the SnackStation
red/yellow brand artwork. Runs on Android, iOS, phone, and tablet from a single
responsive codebase. **All data is static JSON right now** — no backend calls yet —
so you can demo the full flow immediately and swap in your Node.js REST API later
without touching the pages.

## What's included (scoped from your SRD)

Picked the "majorly required" pieces from the full spec, left the rest for later phases:

- **Login** — mobile / email / PIN tabs + biometric button (UI only, static)
- **Dashboard** — today's revenue, bills, items sold, profit, top sellers, low-stock alerts, 7-day sales trend
- **Products** — searchable catalog, add/edit modal, GST %, min-stock, expiry
- **Categories** — grid view with icons + item counts
- **Billing** — fast product picker, cart with qty controls, GST calc, discount, split payment method selector (Cash/Card/UPI/Wallet), "Generate Invoice"
- **Sales Count** — tap-to-count tally screen: shows every active product, tap the card or the **+** to add one to today's count (e.g. tap French Fries, Burger, Pizza as orders come in), **–** to correct a miscount, running total up top. Counts now **persist across refreshes** (saved to `localStorage`), and a **"Submit Today's Sales"** button at the bottom registers the current tally into a permanent daily sales record (merges with any earlier submission for the same date, so you can submit multiple times a day) and clears the working tally for the next batch. A clock icon in the toolbar opens **Daily Sales History** to review everything submitted so far, by date.
- **Customers** — list, VIP/Regular/New groups, loyalty points, add customer
- **Reports** — payment method distribution, offers & coupons list, Excel/PDF/CSV export buttons (wired to a placeholder toast — hook to your API later)
- **Settings** — shop info, GST number, currency, dark mode, notifications, backup

Left out for now (flagged in the doc as "Recommended/Future" or lower priority): supplier
management, expense tracking, kitchen tracking, multi-shop, loyalty tiers, credit sales,
purchase orders. The `DataService` is structured so adding these later is just new JSON +
a new page.

## Where the "database" lives

**Now backed by Google Sheets — no server to buy or host.** Products, Categories,
Customers, and Offers load live from a Google Sheet through a small free Google
Apps Script Web App, and "Submit Today's Sales" in the Sales Count page writes
straight back to that same Sheet, shared across every device/person using it.

👉 **First-time setup**: follow `google-apps-script/SETUP.md` (create the Sheet,
paste the script, one click to seed demo data, deploy, paste the URL into
`src/environments/environment.ts`). Takes about 5 minutes, entirely free.

All of this goes through `src/app/services/data.service.ts`, which exposes RxJS
observables (`getProducts()`, `getCustomers()`, etc.) exactly like a real HTTP
service would — this is the **only file** to touch if you ever outgrow Google
Sheets and want to swap in Firebase, Supabase, PocketBase, or a real Node.js API.
No page component needs to change.

**What's still a static demo**: the Dashboard's revenue/bills/profit KPIs and
sales trend chart, and Billing's "Generate Invoice" (doesn't write a row yet).
See the table in `google-apps-script/SETUP.md` for the full breakdown.

## Theme

Colors and type were pulled straight from the SnackStation banner artwork:

- Primary Red `#E4141B` — toolbars, buttons, hero banner
- Accent Yellow `#FFD200` — headline "bubble" text with a white outline, matching the poster style
- Headings use **Baloo 2** (bold/rounded), body text uses **Poppins**
- Fully responsive: phone gets a bottom-collapsing side menu, tablet/desktop gets a
  persistent side rail (`ion-split-pane`) and wider card grids

## Running it

```bash
npm install
npm start        # serves at http://localhost:4200 in a browser
```

### Android

```bash
npx cap add android
npm run build
npx cap sync android
npx cap open android   # opens Android Studio
```

### iOS (on a Mac)

```bash
npx cap add ios
npm run build
npx cap sync ios
npx cap open ios        # opens Xcode
```

## Next steps when you're ready to go live

1. Stand up the Node.js (Express or NestJS) REST API from the SRD.
2. Replace the static arrays in `data.service.ts` with `HttpClient` calls.
3. Add real auth (JWT) in place of the demo login.
4. Wire Firebase for push notifications (Section 14 of the SRD).
5. Add the barcode/QR scanner plugin (`@capacitor-community/barcode-scanner` or ML Kit) to Billing and Products.
