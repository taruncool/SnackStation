# SnackStation — Google Sheets Backend Setup

No server, no hosting bill. Your Google Sheet becomes the database, and a small
free Google Apps Script turns it into a JSON API the app talks to.

## 1. Create the Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank spreadsheet.
2. Name it something like **SnackStation Data**.

## 2. Add the script

1. In the Sheet, go to **Extensions > Apps Script**.
2. Delete whatever is in the default `Code.gs` file.
3. Open `google-apps-script/Code.gs` from this project, copy all of it, and paste it into the Apps Script editor.
4. Click the **Save** icon (or Ctrl/Cmd+S).

## 3. Seed the starter data (one click, from the Sheet itself)

1. Back in the Apps Script editor, click the **Save** icon (or Ctrl/Cmd+S) if you haven't already.
2. Switch to your actual **Google Sheet tab** in the browser (not the Apps Script tab) and **reload the page** (F5 / Cmd+R).
3. Look at the menu bar at the very top of the Sheet — the row with **File, Edit, View, Insert...** — there should now be a new menu called **SnackStation** at the end of that row.
   - Don't see it? Reload the Sheet tab once more — this menu only appears after the script has fully loaded.
4. Click **SnackStation > Seed Demo Data**.
5. First time only: a permissions popup appears. Click **Continue** (or **Review permissions**) → pick your Google account → you'll see "Google hasn't verified this app" → click **Advanced** (small link, bottom left) → **Go to project (unsafe)** → **Allow**. This warning is normal — it just means this is your own script, not a published one.
6. Click **SnackStation > Seed Demo Data** again (the permissions step sometimes cancels the first click — just retry).
7. You should see a popup: "SnackStation sheet tabs created and seeded ✅".
8. Look at the tabs along the bottom of the Sheet — you should now see 5: **Products, Categories, Customers, Offers, SalesHistory**, with the first four pre-filled with demo data.

## 4. Deploy as a Web App

1. Back in the Apps Script editor, click **Deploy > New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set:
   - **Execute as**: Me (your account)
   - **Who has access**: Anyone
4. Click **Deploy**, authorize again if prompted.
5. Copy the **Web app URL** it gives you (ends in `/exec`).

## 5. Point the app at it

Open `src/environments/environment.ts` in the Angular project and paste your URL:

```ts
export const environment = {
  sheetsApiUrl: 'https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXX/exec',
};
```

Save, then `npm start` — Products, Categories, Customers, and Offers now load
live from your Google Sheet, and every add/edit writes back to it.

## What's wired up vs. what isn't (yet)

| Data | Source |
|---|---|
| Products (list, add, edit) | ✅ Google Sheet, live |
| Categories | ✅ Google Sheet, read |
| Customers (list, add) | ✅ Google Sheet, live |
| Offers | ✅ Google Sheet, read |
| Sales Count → "Submit Today's Sales" | ✅ Writes rows to the SalesHistory sheet tab |
| Sales History (the clock-icon modal) | ✅ Reads and aggregates from SalesHistory tab, so it's shared across every device/person using the same Sheet |
| Dashboard KPIs (revenue, bills, profit, sales trend) | ⚠️ Still static demo numbers — computing these live from real sales would need either sheet formulas or a small aggregation step. Ask if you'd like this wired up next. |
| Billing "Generate Invoice" | ⚠️ Still a local demo toast — doesn't write an invoice row to the sheet yet |

## Good to know

- **Working tally stays local.** Tapping products in Sales Count updates a
  local (per-device) running count instantly — no network round trip per tap,
  so it stays snappy even on a slow connection. Only tapping **"Submit
  Today's Sales"** sends data to the Sheet.
- **Free tier limits.** Apps Script Web Apps have generous free quotas (20,000
  requests/day on a personal Google account), which is far more than a single
  shop needs. If you ever outgrow it, the same `DataService` pattern makes it
  a small edit to swap in Firebase, Supabase, or PocketBase instead.
- **Multiple people editing at once**: Sheets handles concurrent reads fine.
  Concurrent *writes* (e.g. two people editing the same product row within
  the same second) aren't conflict-resolved — the last write wins. Fine for
  a single-shop team; worth knowing if you scale to multiple branches.
