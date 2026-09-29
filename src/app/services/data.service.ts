import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, retry } from 'rxjs';
import { environment } from '../../environments/environment';
import dashboardData from '../data/dashboard.json';

export interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  costPrice: number;
  sellingPrice: number;
  gst: number;
  unit: string;
  stockQty: number;
  minStock: number;
  expiryDate: string;
  status: string;
  image: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  productCount: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  loyaltyPoints: number;
  outstandingAmount: number;
  group: string;
  totalOrders: number;
}

export interface Offer {
  id: string;
  title: string;
  type: string;
  description: string;
  value: string;
  active: boolean;
}

/** A one-off or recurring spend: raw material/ingredients, kitchen
 *  appliances/equipment, store expenses, salaries, transport, utilities,
 *  or anything else that should reduce net income for its month. */
export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD — purchase date / month depreciation starts from
  category:
    | 'Raw Material'
    | 'Kitchen Appliances'
    | 'Store Expenses'
    | 'Salaries'
    | 'Transport Charges'
    | 'Utility'
    | 'Miscellaneous';
  name: string;
  amount: number;
  notes: string;
  /** Months to spread this cost over (depreciation), starting from `date`'s
   *  month. Omitted/1 = hits Net Income in full in the purchase month, which
   *  is right for Raw Material/Salaries/etc. Kitchen Appliances (equipment)
   *  default to 36 (3 years) so one big purchase doesn't wipe out a single
   *  month's profit. */
  usefulLifeMonths?: number;
}

export interface CartItem {
  product: Product;
  qty: number;
}

export interface BillItem {
  productId: string;
  name: string;
  qty: number;
  price: number; // selling price per unit at the time of the bill
}

/** One customer order from the Billing page (a row in the Bills tab). */
export interface Bill {
  id: string; // bill number, e.g. SS260929-154233-07
  date: string; // YYYY-MM-DD, local
  createdAt: string; // ISO timestamp
  customerName: string;
  customerPhone: string;
  items: BillItem[];
  itemCount: number;
  subtotal: number;
  discountPercent: number; // 5 / 10 / 15 / 20, or 0 for none / a custom amount
  discount: number; // rupees taken off the subtotal
  total: number;
  paymentMethod: string;
}

export type BillResult =
  | { status: 'saved'; bill: Bill; billRecordSaved: boolean }
  | { status: 'failed'; reason: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface DailySalesRecord {
  date: string; // YYYY-MM-DD
  submittedAt: string; // ISO timestamp of last submit for this date
  items: { productId: string; productName: string; qty: number }[];
  totalItems: number;
  totalRevenue: number;
  totalProfit: number;
}

/** Today's date (YYYY-MM-DD) on this device's clock. toISOString() would give
 *  the UTC date, which in India only rolls over at 5:30 AM — so early
 *  sales landed under yesterday and the counter reset at the wrong time. */
export function localDateKey(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export type SubmitResult =
  | { status: 'saved'; record: DailySalesRecord }
  | { status: 'nothing' } // every tap is already in the Sheet
  | { status: 'failed'; reason: string };

// Only the Sales Count *working tally* stays in localStorage (per device,
// instant taps, no network round trip) — everything else below now lives in
// your Google Sheet, see the class comment.
const STORAGE_WORKING = 'snackstation_sales_working';
// Which calendar day the working tally above belongs to — lets the tally
// (and what's already been submitted) reset automatically at midnight
// instead of silently carrying into a new day.
const STORAGE_WORKING_DATE = 'snackstation_sales_working_date';
// How much of the working tally has already been sent to SalesHistory —
// lets the displayed count stay visible after "Submit Today's Sales"
// (rather than resetting to 0) while still only submitting each tap once.
const STORAGE_SUBMITTED_BASELINE = 'snackstation_sales_submitted_baseline';
// The last submit whose rows weren't confirmed as saved: their ids and the
// per-product qty they carried. If those ids later turn up in SalesHistory
// (the write landed, only the reply was lost), that qty counts as submitted.
const STORAGE_PENDING_SUBMIT = 'snackstation_sales_pending_submit';
interface PendingSubmit {
  ids: string[];
  deltas: Record<string, number>;
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage unavailable — fail silently
  }
}

/** Coerce values coming back from Google Sheets (which are often strings/blank cells)
 *  into the right JS types for our interfaces. */
function coerce<T extends Record<string, any>>(row: any, numberKeys: string[], boolKeys: string[] = []): T {
  const out = { ...row };
  for (const k of numberKeys) out[k] = row[k] === '' || row[k] == null ? 0 : Number(row[k]);
  for (const k of boolKeys) out[k] = row[k] === true || row[k] === 'true' || row[k] === 'TRUE';
  return out as T;
}

/**
 * Talks to a Google Sheet through a Google Apps Script Web App (see
 * google-apps-script/Code.gs + SETUP.md) for EVERY data type below —
 * Products, Categories, Customers, Offers, Sales History and Expenses all
 * live as tabs in the same Sheet now. This is a stand-in for a real
 * server/database: no hosting cost, and it's already shared across every
 * device that opens the app (unlike localStorage, which was per-browser).
 * Every page in the app only ever calls the public methods below
 * (getProducts(), addExpense(), etc.) — this is the ONE file to touch if
 * you ever swap Google Sheets for a real Node.js API/database later.
 *
 * The Sales Count *working tally* stays in localStorage for instant taps
 * with no network round trip; only "Submit Today's Sales" writes to the
 * Sheet, into the SalesHistory tab (and deducts stock in Products).
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  private products$ = new BehaviorSubject<Product[]>([]);
  /** 'loading' until the first Products fetch finishes, so pages can show a
   *  loader instead of a misleading empty state. A later failed refresh keeps
   *  the last good data and stays 'loaded'. */
  private productsStatus$ = new BehaviorSubject<'loading' | 'loaded' | 'error'>('loading');
  private customersStatus$ = new BehaviorSubject<'loading' | 'loaded' | 'error'>('loading');
  private expensesStatus$ = new BehaviorSubject<'loading' | 'loaded' | 'error'>('loading');
  private salesHistoryStatus$ = new BehaviorSubject<'loading' | 'loaded' | 'error'>('loading');
  private categories$ = new BehaviorSubject<Category[]>([]);
  private customers$ = new BehaviorSubject<Customer[]>([]);
  private offers$ = new BehaviorSubject<Offer[]>([]);
  private expenses$ = new BehaviorSubject<Expense[]>([]);
  private cart$ = new BehaviorSubject<CartItem[]>([]);
  private bills$ = new BehaviorSubject<Bill[]>([]);
  private billsStatus$ = new BehaviorSubject<'loading' | 'loaded' | 'error'>('loading');
  private salesCount$ = new BehaviorSubject<Record<string, number>>({});
  /** How much of salesCount$ has already been sent to SalesHistory — a
   *  per-product submitted-so-far baseline, not exposed as an observable
   *  since only submitTodaysSales()'s delta math needs it. */
  private submittedBaseline: Record<string, number> = {};
  /** Bumped on every confirmed SalesHistory write, so a Sheet read that
   *  started before it can't roll the tally back (syncSubmittedFromSheet). */
  private salesWriteSeq = 0;
  /** Why the last postRowsConfirmed() failed — shown in the page's toast. */
  private lastWriteError = '';
  private salesHistory$ = new BehaviorSubject<DailySalesRecord[]>([]);

  /** Still static demo figures — see google-apps-script/SETUP.md for what's live vs. not yet. */
  readonly dashboard = dashboardData;

  constructor(private http: HttpClient) {
    if (!environment.sheetsApiUrl) {
      console.warn(
        'DataService: environment.sheetsApiUrl is empty — set it in src/environments/environment.ts (see google-apps-script/SETUP.md).'
      );
    }
    this.refreshProducts();
    this.refreshCategories();
    this.refreshCustomers();
    this.refreshOffers();
    this.refreshExpenses();
    this.loadWorkingTally();
    // The counter shows today's SAVED sales only: it starts empty and is
    // filled from the SalesHistory sheet as soon as it loads. Taps left
    // unsubmitted from an earlier visit are dropped, not shown as today's.
    this.salesCount$.next({});
    this.submittedBaseline = {};
    saveJSON(STORAGE_WORKING, {});
    saveJSON(STORAGE_SUBMITTED_BASELINE, {});
    this.refreshSalesHistory();
  }

  /** Loads today's working tally + submitted baseline from localStorage,
   *  or starts fresh if the stored tally belongs to a previous day. */
  private loadWorkingTally() {
    const today = localDateKey();
    const storedDate = loadJSON<string | null>(STORAGE_WORKING_DATE, null);

    // First run after upgrading from a version that didn't track the date
    // yet: there's no stored date to compare against, but whatever tally
    // already exists on this device is real — adopt it as today's and start
    // tracking the date from here on, instead of wiping it.
    if (storedDate === null) {
      saveJSON(STORAGE_WORKING_DATE, today);
      this.salesCount$.next(loadJSON<Record<string, number>>(STORAGE_WORKING, {}));
      this.submittedBaseline = loadJSON<Record<string, number>>(STORAGE_SUBMITTED_BASELINE, {});
      return;
    }

    // A genuinely different day than the one this tally was started on:
    // roll over to a fresh, empty tally.
    if (storedDate !== today) {
      this.salesCount$.next({});
      this.submittedBaseline = {};
      saveJSON(STORAGE_WORKING_DATE, today);
      saveJSON(STORAGE_WORKING, {});
      saveJSON(STORAGE_SUBMITTED_BASELINE, {});
      saveJSON(STORAGE_PENDING_SUBMIT, null);
      return;
    }

    this.salesCount$.next(loadJSON<Record<string, number>>(STORAGE_WORKING, {}));
    this.submittedBaseline = loadJSON<Record<string, number>>(STORAGE_SUBMITTED_BASELINE, {});
  }

  // Apps Script Web App GET responses are cacheable by the browser, so a
  // page that only ever requests the exact same URL (?sheet=Products, say)
  // can keep getting served a stale cached response after the underlying
  // Sheet changes — a busy-cache query param forces every call to be
  // treated as a fresh, uncached request.
  private getSheet<T>(sheet: string) {
    const cacheBust = Date.now();
    // Reads are safe to repeat, and Apps Script occasionally fails a request
    // (cold start, transient error page) that works a moment later — retry
    // quietly, so the page keeps showing its loader instead of an empty/error
    // state. (Writes are never auto-retried: see postRowsConfirmed.)
    return this.http
      .get<any[]>(`${environment.sheetsApiUrl}?sheet=${encodeURIComponent(sheet)}&_=${cacheBust}`)
      .pipe(retry({ count: 2, delay: 1200 }));
  }

  /** Apps Script Web Apps don't support CORS preflight, so POSTs are sent as
   *  text/plain to keep them "simple requests" — Apps Script still parses
   *  the JSON body fine on its end. */
  private postSheet(sheet: string, action: string, data: unknown) {
    const headers = new HttpHeaders({ 'Content-Type': 'text/plain;charset=utf-8' });
    return this.http.post<{ success?: boolean; error?: string }>(
      environment.sheetsApiUrl,
      JSON.stringify({ sheet, action, data }),
      { headers }
    );
  }

  // ---- Products ----
  refreshProducts() {
    if (this.productsStatus$.value !== 'loaded') this.productsStatus$.next('loading');
    this.getSheet<Product>('Products').subscribe({
      next: (rows) => {
        this.products$.next(
          rows.map((r) => coerce<Product>(r, ['costPrice', 'sellingPrice', 'gst', 'stockQty', 'minStock']))
        );
        this.productsStatus$.next('loaded');
      },
      error: (err) => {
        console.error('Failed to load Products from Google Sheets', err);
        if (this.productsStatus$.value !== 'loaded') this.productsStatus$.next('error');
      },
    });
  }
  getProductsStatus() {
    return this.productsStatus$.asObservable();
  }
  getProducts() {
    return this.products$.asObservable();
  }
  getProductsSnapshot() {
    return this.products$.value;
  }
  addProduct(product: Product) {
    this.postSheet('Products', 'add', product).subscribe({
      next: () => this.refreshProducts(),
      error: (err) => console.error('Failed to add product', err),
    });
  }
  updateProduct(updated: Product) {
    this.postSheet('Products', 'update', updated).subscribe({
      next: () => this.refreshProducts(),
      error: (err) => console.error('Failed to update product', err),
    });
  }
  deleteProduct(id: string) {
    this.postSheet('Products', 'delete', { id }).subscribe({
      next: () => this.refreshProducts(),
      error: (err) => console.error('Failed to delete product', err),
    });
  }

  // ---- Categories (read-only for now) ----
  refreshCategories() {
    this.getSheet<Category>('Categories').subscribe({
      next: (rows) => this.categories$.next(rows.map((r) => coerce<Category>(r, ['productCount']))),
      error: (err) => console.error('Failed to load Categories from Google Sheets', err),
    });
  }
  getCategories() {
    return this.categories$.asObservable();
  }
  getCategoriesSnapshot() {
    return this.categories$.value;
  }

  // ---- Customers ----
  refreshCustomers() {
    if (this.customersStatus$.value !== 'loaded') this.customersStatus$.next('loading');
    this.getSheet<Customer>('Customers').subscribe({
      next: (rows) => {
        this.customers$.next(rows.map((r) => coerce<Customer>(r, ['loyaltyPoints', 'outstandingAmount', 'totalOrders'])));
        this.customersStatus$.next('loaded');
      },
      error: (err) => {
        console.error('Failed to load Customers from Google Sheets', err);
        if (this.customersStatus$.value !== 'loaded') this.customersStatus$.next('error');
      },
    });
  }
  getCustomersStatus() {
    return this.customersStatus$.asObservable();
  }
  getCustomers() {
    return this.customers$.asObservable();
  }
  addCustomer(customer: Customer) {
    this.postSheet('Customers', 'add', customer).subscribe({
      next: () => this.refreshCustomers(),
      error: (err) => console.error('Failed to add customer', err),
    });
  }

  // ---- Offers (read-only for now) ----
  refreshOffers() {
    this.getSheet<Offer>('Offers').subscribe({
      next: (rows) => this.offers$.next(rows.map((r) => coerce<Offer>(r, [], ['active']))),
      error: (err) => console.error('Failed to load Offers from Google Sheets', err),
    });
  }
  getOffers() {
    return this.offers$.asObservable();
  }

  // ---- Expenses / Inventory spend (raw material, equipment, utilities) ----
  refreshExpenses() {
    if (this.expensesStatus$.value !== 'loaded') this.expensesStatus$.next('loading');
    this.getSheet<Expense>('Expenses').subscribe({
      next: (rows) => {
        this.expenses$.next(rows.map((r) => coerce<Expense>(r, ['amount', 'usefulLifeMonths'])));
        this.expensesStatus$.next('loaded');
      },
      error: (err) => {
        console.error('Failed to load Expenses from Google Sheets', err);
        if (this.expensesStatus$.value !== 'loaded') this.expensesStatus$.next('error');
      },
    });
  }
  getExpensesStatus() {
    return this.expensesStatus$.asObservable();
  }
  getExpenses() {
    return this.expenses$.asObservable();
  }
  getExpensesSnapshot() {
    return this.expenses$.value;
  }
  addExpense(expense: Expense) {
    this.postSheet('Expenses', 'add', expense).subscribe({
      next: () => this.refreshExpenses(),
      error: (err) => console.error('Failed to add expense', err),
    });
  }
  updateExpense(updated: Expense) {
    this.postSheet('Expenses', 'update', updated).subscribe({
      next: () => this.refreshExpenses(),
      error: (err) => console.error('Failed to update expense', err),
    });
  }
  deleteExpense(id: string) {
    this.postSheet('Expenses', 'delete', { id }).subscribe({
      next: () => this.refreshExpenses(),
      error: (err) => console.error('Failed to delete expense', err),
    });
  }

  // ---- Today's Sales Count (tap-to-count tally, separate from Billing cart) ----
  // Working counts persist to localStorage (per device, instant) so a page
  // refresh never loses today's in-progress tally, and roll over to a fresh
  // empty tally automatically at midnight (see loadWorkingTally()).
  //
  // The displayed count is cumulative for the whole day and stays visible
  // even after "Submit Today's Sales" — submittedBaseline tracks how much
  // of it has already been sent, so re-tapping more and submitting again
  // later only sends the NEW items, never double-counting what's already
  // in SalesHistory.
  getSalesCounts() {
    return this.salesCount$.asObservable();
  }
  getSalesCountsSnapshot() {
    return this.salesCount$.value;
  }
  incrementSale(productId: string) {
    this.loadWorkingTally();
    const counts = { ...this.salesCount$.value };
    counts[productId] = (counts[productId] || 0) + 1;
    this.salesCount$.next(counts);
    saveJSON(STORAGE_WORKING, counts);
  }
  decrementSale(productId: string) {
    this.loadWorkingTally();
    const counts = { ...this.salesCount$.value };
    if (!counts[productId]) return;
    counts[productId] = Math.max(0, counts[productId] - 1);
    this.salesCount$.next(counts);
    saveJSON(STORAGE_WORKING, counts);
  }
  /** Throws away taps that haven't been submitted yet, dropping each count
   *  back to what's already saved in the Sheet. Submitted counts stay —
   *  they're re-synced from SalesHistory anyway; use the reduce flow to
   *  take a submitted sale back out. */
  resetSalesCounts() {
    const counts = { ...this.submittedBaseline };
    this.salesCount$.next(counts);
    saveJSON(STORAGE_WORKING, counts);
  }
  getTotalSalesCountToday() {
    return Object.values(this.salesCount$.value).reduce((sum, n) => sum + n, 0);
  }
  /** How many tapped-but-not-yet-submitted items are waiting right now. */
  getUnsubmittedCountToday() {
    const counts = this.salesCount$.value;
    return Object.keys(counts).reduce(
      (sum, id) => sum + Math.max(0, (counts[id] || 0) - (this.submittedBaseline[id] || 0)),
      0
    );
  }

  /**
   * Registers only what's been tapped SINCE the last submit as today's
   * sales: writes one row per counted product to the SalesHistory sheet
   * tab, deducts stock in the Products sheet, then raises the submitted
   * baseline so those same taps are never sent twice — the displayed tally
   * itself is left untouched (see class comment above). Reports 'nothing'
   * when every tap is already in the Sheet, and 'failed' only when the
   * rows really couldn't be confirmed as saved.
   */
  async submitTodaysSales(): Promise<SubmitResult> {
    // Catch up with the Sheet first: if an earlier submit landed but its
    // reply was lost, those items are already saved and must not be sent
    // (or counted as "not submitted") again.
    try {
      const seq = this.salesWriteSeq;
      this.syncSubmittedFromSheet(await firstValueFrom(this.getSheet<any>('SalesHistory')), seq);
    } catch (err) {
      console.error("Couldn't re-read SalesHistory before submitting — using this device's record", err);
    }
    this.loadWorkingTally();
    const counts = this.salesCount$.value;
    const deltas: Record<string, number> = {};
    for (const id of Object.keys(counts)) {
      const delta = (counts[id] || 0) - (this.submittedBaseline[id] || 0);
      if (delta > 0) deltas[id] = delta;
    }
    const totalItems = Object.values(deltas).reduce((sum, n) => sum + n, 0);
    if (totalItems === 0) return { status: 'nothing' };

    const products = this.products$.value;
    const today = localDateKey();
    const submittedAt = new Date().toISOString();

    const rows = Object.entries(deltas).map(([productId, qty]) => {
      const product = products.find((p) => p.id === productId);
      return {
        id: `${today}-${productId}-${Date.now()}`,
        date: today,
        productId,
        productName: product?.name || productId,
        qty,
        priceAtSale: product?.sellingPrice || 0,
        costAtSale: product?.costPrice || 0,
        submittedAt,
      };
    });
    const totalRevenue = rows.reduce((sum, r) => sum + r.qty * r.priceAtSale, 0);
    const totalProfit = rows.reduce((sum, r) => sum + r.qty * (r.priceAtSale - r.costAtSale), 0);

    const pending: PendingSubmit = { ids: rows.map((r) => r.id), deltas };
    saveJSON(STORAGE_PENDING_SUBMIT, pending);
    if (!(await this.postRowsConfirmed('SalesHistory', rows))) {
      return { status: 'failed', reason: this.lastWriteError };
    }
    saveJSON(STORAGE_PENDING_SUBMIT, null);
    this.salesWriteSeq++;

    // Deduct sold quantities from stock (only the NEW delta, not the whole
    // day's tally, since earlier taps were already deducted on a prior
    // submit). Sends the FULL updated product row (not just id + stockQty)
    // because the sheet's "update" actions replace the entire row —
    // sending a partial object would blank out the other columns.
    const stockUpdates = Object.entries(deltas)
      .map(([productId, qty]) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return null;
        return { ...product, stockQty: Math.max(0, product.stockQty - qty) };
      })
      .filter((p): p is Product => p !== null);

    if (stockUpdates.length > 0) {
      try {
        await firstValueFrom(this.postSheet('Products', 'updateMany', stockUpdates));
      } catch (err) {
        console.error('Sales were recorded, but deducting stock failed', err);
      }
    }

    // Raise the baseline to the current tally — NOT a reset — so the
    // displayed counts stay exactly as they are.
    this.submittedBaseline = { ...counts };
    saveJSON(STORAGE_SUBMITTED_BASELINE, this.submittedBaseline);
    this.refreshSalesHistory();
    this.refreshProducts();

    return {
      status: 'saved',
      record: {
        date: today,
        submittedAt,
        items: rows.map((r) => ({ productId: r.productId, productName: r.productName, qty: r.qty })),
        totalItems,
        totalRevenue,
        totalProfit,
      },
    };
  }

  /**
   * POSTs rows to a sheet and reports whether they were really saved. A
   * browser-side error on an Apps Script POST does NOT prove the write
   * failed (the script can finish the write and the response still not make
   * it back), so on any error we re-read the sheet and look for the exact
   * row ids before giving up. This also stops a retry from writing the same
   * sale twice.
   */
  private async postRowsConfirmed(sheet: string, rows: { id: string; [key: string]: unknown }[]): Promise<boolean> {
    this.lastWriteError = '';
    try {
      const res: any = await firstValueFrom(this.postSheet(sheet, 'addMany', rows));
      if (res?.error) {
        console.error(`Apps Script rejected the ${sheet} write:`, res.error);
        this.lastWriteError = `Google Sheets said: ${res.error}`;
        return false;
      }
      // Only an explicit {success:true} counts — anything else (an HTML
      // page, a GET-style row list) means doPost didn't run as expected.
      if (res?.success === true) return true;
      console.error(`Unexpected reply to the ${sheet} write — checking whether it saved`, res);
      this.lastWriteError = `Unexpected reply from Google Sheets: ${JSON.stringify(res)?.slice(0, 120)}`;
    } catch (err: any) {
      console.error(
        `POST to ${sheet} reported an error (status ${err?.status}) — checking whether it saved anyway`,
        err
      );
      const page = String(err?.error?.text ?? '');
      this.lastWriteError = page.includes('do not have permission')
        ? "Google Sheets refused the write — the Apps Script's account doesn't have edit access to the spreadsheet (see SETUP.md)."
        : `Request failed (status ${err?.status ?? '?'}): ${err?.message ?? err}`.slice(0, 160);
    }
    const ids = rows.map((r) => r.id);
    // Apps Script Web Apps can take several seconds — occasionally 10-20s on
    // a cold start — to actually finish a write, well after the browser has
    // already reported an error. Poll for a while before concluding it truly
    // failed; giving up too early was causing false "couldn't submit"
    // reports on writes that went through moments later.
    const delays = [500, 1500, 2500, 4000, 5000, 6000, 6000];
    for (const delay of delays) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        const existing = await firstValueFrom(this.getSheet<any>(sheet));
        const have = new Set(existing.map((r) => String(r.id)));
        if (ids.every((id) => have.has(id))) {
          this.lastWriteError = '';
          return true;
        }
      } catch (err) {
        console.error(`Couldn't re-read ${sheet} to verify the write`, err);
      }
    }
    return false;
  }

  /**
   * The SalesHistory sheet is the real record of what's been submitted
   * today, so the on-screen tally is rebuilt from it: each product shows
   * today's saved qty (correcting -1 rows included) plus whatever this
   * device has tapped but not submitted yet. That keeps the counter to
   * today's sales only (a leftover local tally can't inflate it), and a
   * submit whose reply was lost is still recognised as saved — so it isn't
   * sent again, and reducing it asks for confirmation.
   *
   * `readSeq` is salesWriteSeq when the read was started; if a submit or
   * reduction has landed since, the read may predate it and is ignored.
   */
  private syncSubmittedFromSheet(rows: any[], readSeq: number) {
    if (readSeq !== this.salesWriteSeq) return;
    this.loadWorkingTally();
    const today = localDateKey();
    const saved: Record<string, number> = {};
    for (const r of rows) {
      if (r.date !== today || !r.productId) continue;
      saved[r.productId] = (saved[r.productId] || 0) + (Number(r.qty) || 0);
    }

    // Taps from an unconfirmed submit that did land are no longer
    // "unsubmitted" — without this they'd be counted twice.
    const localBaseline = { ...this.submittedBaseline };
    const pending = loadJSON<PendingSubmit | null>(STORAGE_PENDING_SUBMIT, null);
    if (pending) {
      const have = new Set(rows.map((r) => String(r.id)));
      if (pending.ids.every((id) => have.has(id))) {
        for (const [id, qty] of Object.entries(pending.deltas)) {
          localBaseline[id] = (localBaseline[id] || 0) + qty;
        }
        saveJSON(STORAGE_PENDING_SUBMIT, null);
      }
    }

    const current = this.salesCount$.value;
    const counts: Record<string, number> = {};
    const baseline: Record<string, number> = {};
    for (const id of new Set([...Object.keys(saved), ...Object.keys(current)])) {
      const savedQty = Math.max(0, saved[id] || 0);
      const unsubmitted = Math.max(0, (current[id] || 0) - (localBaseline[id] || 0));
      if (savedQty) baseline[id] = savedQty;
      if (savedQty + unsubmitted) counts[id] = savedQty + unsubmitted;
    }
    this.submittedBaseline = baseline;
    saveJSON(STORAGE_SUBMITTED_BASELINE, baseline);
    this.salesCount$.next(counts);
    saveJSON(STORAGE_WORKING, counts);
  }

  /** How much of a product's count has already been submitted today. */
  getSubmittedCount(productId: string) {
    return this.submittedBaseline[productId] || 0;
  }

  /**
   * Takes ONE unit of an already-submitted product back out of today's
   * sale. SalesHistory is append-only, so this writes a correcting row with
   * qty -1 (same price/cost) rather than deleting anything — revenue, profit
   * and items sold net out, and the audit trail stays visible in the Sheet.
   * The unit is put back into stock and the on-screen count drops by one.
   * Returns false if nothing could be reduced or the write didn't land.
   */
  async reduceSubmittedSale(productId: string): Promise<boolean> {
    this.loadWorkingTally();
    const current = this.salesCount$.value[productId] || 0;
    const submitted = this.submittedBaseline[productId] || 0;
    const product = this.products$.value.find((p) => p.id === productId);
    if (!product || current <= 0 || submitted <= 0) return false;

    const today = localDateKey();
    const row = {
      id: `${today}-${productId}-adj-${Date.now()}`,
      date: today,
      productId,
      productName: product.name,
      qty: -1,
      priceAtSale: product.sellingPrice,
      costAtSale: product.costPrice,
      submittedAt: new Date().toISOString(),
    };
    if (!(await this.postRowsConfirmed('SalesHistory', [row]))) return false;
    this.salesWriteSeq++;

    try {
      await firstValueFrom(
        this.postSheet('Products', 'update', { ...product, stockQty: product.stockQty + 1 })
      );
    } catch (err) {
      console.error('Sale was reduced, but putting the unit back in stock failed', err);
    }

    const counts = { ...this.salesCount$.value, [productId]: current - 1 };
    this.salesCount$.next(counts);
    saveJSON(STORAGE_WORKING, counts);
    this.submittedBaseline = { ...this.submittedBaseline, [productId]: submitted - 1 };
    saveJSON(STORAGE_SUBMITTED_BASELINE, this.submittedBaseline);
    this.refreshSalesHistory();
    this.refreshProducts();
    return true;
  }

  refreshSalesHistory() {
    if (this.salesHistoryStatus$.value !== 'loaded') this.salesHistoryStatus$.next('loading');
    const seq = this.salesWriteSeq;
    this.getSheet<any>('SalesHistory').subscribe({
      next: (rows) => {
        this.syncSubmittedFromSheet(rows, seq);
        const grouped: Record<string, DailySalesRecord> = {};
        for (const r of rows) {
          const date = r.date;
          if (!date) continue;
          if (!grouped[date]) {
            grouped[date] = {
              date,
              submittedAt: r.submittedAt || '',
              items: [],
              totalItems: 0,
              totalRevenue: 0,
              totalProfit: 0,
            };
          }
          const qty = Number(r.qty) || 0;
          const price = Number(r.priceAtSale) || 0;
          const cost = Number(r.costAtSale) || 0;
          const existing = grouped[date].items.find((i) => i.productId === r.productId);
          if (existing) existing.qty += qty;
          else grouped[date].items.push({ productId: r.productId, productName: r.productName, qty });
          grouped[date].totalItems += qty;
          grouped[date].totalRevenue += qty * price;
          grouped[date].totalProfit += qty * (price - cost);
          if (r.submittedAt && r.submittedAt > grouped[date].submittedAt) {
            grouped[date].submittedAt = r.submittedAt;
          }
        }
        // Correcting rows (qty -1) can net a product out to 0 for the day.
        for (const g of Object.values(grouped)) g.items = g.items.filter((i) => i.qty > 0);
        const list = Object.values(grouped).sort((a, b) => (a.date < b.date ? 1 : -1));
        this.salesHistory$.next(list);
        this.salesHistoryStatus$.next('loaded');
      },
      error: (err) => {
        console.error('Failed to load SalesHistory from Google Sheets', err);
        if (this.salesHistoryStatus$.value !== 'loaded') this.salesHistoryStatus$.next('error');
      },
    });
  }
  getSalesHistoryStatus() {
    return this.salesHistoryStatus$.asObservable();
  }
  getSalesHistory() {
    return this.salesHistory$.asObservable();
  }
  getSalesHistorySnapshot() {
    return this.salesHistory$.value;
  }

  // ---- Income & Revenue reporting ----
  // Derived from Sales History (revenue per day) and Expenses (every
  // category, summed) — both now Google Sheet tabs, see the class comment.
  // Real-market flow for a small food business: Net Profit = Total Sales −
  // Total Expenses, full stop — no separate "gross vs net" layering, and
  // Raw Material purchases (what you actually spent on ingredients) are
  // what hit this number, not each product's costPrice. costPrice stays on
  // Products purely as a menu-pricing/margin helper — "estimatedMargin"
  // below reflects that pricing estimate for reference only and is
  // intentionally NOT part of netIncome, to avoid subtracting ingredient
  // cost twice (once per item sold, once as the real purchase).
  //
  // Equipment (Kitchen Appliances) is capex, not a running cost: a single
  // ₹18,000 stove shouldn't wipe out one month's profit, so its cost is
  // depreciated — spread evenly across `usefulLifeMonths` starting from its
  // purchase month — rather than hitting Net Income in full immediately.
  /** This expense's contribution to a given (year, monthIndex 0-11)'s
   *  expense total, after spreading it over its useful life. */
  private expenseContribution(e: Expense, year: number, monthIndex: number): number {
    const life = e.usefulLifeMonths && e.usefulLifeMonths > 1 ? e.usefulLifeMonths : 1;
    const startYear = Number(e.date.slice(0, 4));
    const startMonth = Number(e.date.slice(5, 7)) - 1;
    const startAbs = startYear * 12 + startMonth;
    const targetAbs = year * 12 + monthIndex;
    if (targetAbs < startAbs || targetAbs >= startAbs + life) return 0;
    return e.amount / life;
  }
  /** Per-month breakdown for a given year. */
  getMonthlySummary(year: number) {
    const history = this.salesHistory$.value;
    const expenses = this.expenses$.value;
    return Array.from({ length: 12 }, (_, i) => {
      const prefix = `${year}-${String(i + 1).padStart(2, '0')}`;
      const dayRecords = history.filter((h) => h.date.startsWith(prefix));
      const revenue = dayRecords.reduce((s, h) => s + h.totalRevenue, 0);
      const estimatedMargin = dayRecords.reduce((s, h) => s + h.totalProfit, 0);
      const expenseTotal = expenses.reduce((s, e) => s + this.expenseContribution(e, year, i), 0);
      return {
        month: i + 1,
        label: new Date(year, i, 1).toLocaleString('default', { month: 'short' }),
        revenue,
        estimatedMargin,
        expenses: expenseTotal,
        netIncome: revenue - expenseTotal,
      };
    });
  }
  /** Full-year totals for a given year. */
  getYearlySummary(year: number) {
    const months = this.getMonthlySummary(year);
    return {
      year,
      revenue: months.reduce((s, m) => s + m.revenue, 0),
      estimatedMargin: months.reduce((s, m) => s + m.estimatedMargin, 0),
      expenses: months.reduce((s, m) => s + m.expenses, 0),
      netIncome: months.reduce((s, m) => s + m.netIncome, 0),
    };
  }
  /** Years with any sales or expense records, plus the current year. */
  getAvailableYears(): number[] {
    const years = new Set<number>([new Date().getFullYear()]);
    this.salesHistory$.value.forEach((h) => years.add(Number(h.date.slice(0, 4))));
    this.expenses$.value.forEach((e) => years.add(Number(e.date.slice(0, 4))));
    return Array.from(years).sort((a, b) => b - a);
  }

  // ---- Cart / Billing (stays local to the current billing session) ----
  getCart() {
    return this.cart$.asObservable();
  }
  getCartSnapshot() {
    return this.cart$.value;
  }
  addToCart(product: Product) {
    const items = [...this.cart$.value];
    const existing = items.find((i) => i.product.id === product.id);
    if (existing) {
      existing.qty += 1;
    } else {
      items.push({ product, qty: 1 });
    }
    this.cart$.next(items);
  }
  updateCartQty(productId: string, qty: number) {
    if (qty <= 0) {
      this.removeFromCart(productId);
      return;
    }
    this.cart$.next(
      this.cart$.value.map((i) => (i.product.id === productId ? { ...i, qty } : i))
    );
  }
  removeFromCart(productId: string) {
    this.cart$.next(this.cart$.value.filter((i) => i.product.id !== productId));
  }
  clearCart() {
    this.cart$.next([]);
  }

  /**
   * Saves one customer bill. Its items go to SalesHistory first — the same
   * rows "Submit Today's Sales" writes, so they show up in Today's Sales
   * Count, Dashboard and Reports automatically — then the bill itself goes
   * to the Bills tab (for reprints/history) and stock is deducted. A
   * discount is spread across the items' priceAtSale so revenue stays
   * accurate. Fails only if the sales rows couldn't be confirmed as saved;
   * if just the Bills row fails, the sale still counts (billRecordSaved
   * false) and the receipt can still be printed.
   */
  async submitBill(input: {
    items: CartItem[];
    customerName: string;
    customerPhone: string;
    discountPercent: number;
    discount: number;
    paymentMethod: string;
  }): Promise<BillResult> {
    const items: BillItem[] = input.items
      .filter((i) => i.qty > 0)
      .map((i) => ({ productId: i.product.id, name: i.product.name, qty: i.qty, price: i.product.sellingPrice }));
    if (items.length === 0) return { status: 'failed', reason: 'The bill is empty.' };

    const now = new Date();
    const today = localDateKey(now);
    const subtotal = round2(items.reduce((sum, i) => sum + i.qty * i.price, 0));
    const discount = round2(Math.min(Math.max(0, Number(input.discount) || 0), subtotal));
    const total = round2(subtotal - discount);
    const id = billNumber(now);

    const products = this.products$.value;
    const factor = subtotal > 0 ? total / subtotal : 1;
    const salesRows = items.map((i) => ({
      id: `${id}-${i.productId}`,
      date: today,
      productId: i.productId,
      productName: i.name,
      qty: i.qty,
      // 4 decimals so the discounted rows still add up to the bill total.
      priceAtSale: Math.round(i.price * factor * 10000) / 10000,
      costAtSale: products.find((p) => p.id === i.productId)?.costPrice || 0,
      submittedAt: now.toISOString(),
    }));
    if (!(await this.postRowsConfirmed('SalesHistory', salesRows))) {
      return { status: 'failed', reason: this.lastWriteError };
    }
    this.salesWriteSeq++;

    const bill: Bill = {
      id,
      date: today,
      createdAt: now.toISOString(),
      customerName: (input.customerName || '').trim(),
      customerPhone: (input.customerPhone || '').trim(),
      items,
      itemCount: items.reduce((sum, i) => sum + i.qty, 0),
      subtotal,
      discountPercent: discount > 0 ? Number(input.discountPercent) || 0 : 0,
      discount,
      total,
      paymentMethod: input.paymentMethod,
    };
    const billRecordSaved = await this.postRowsConfirmed('Bills', [
      { ...bill, items: JSON.stringify(bill.items) },
    ]);
    if (!billRecordSaved) console.error('Sale recorded, but saving the bill record failed:', this.lastWriteError);

    // Same as a Sales Count submit: send FULL product rows, since the
    // sheet's update replaces the whole row.
    const stockUpdates = items
      .map((i) => {
        const product = products.find((p) => p.id === i.productId);
        return product ? { ...product, stockQty: Math.max(0, product.stockQty - i.qty) } : null;
      })
      .filter((p): p is Product => p !== null);
    if (stockUpdates.length > 0) {
      try {
        await firstValueFrom(this.postSheet('Products', 'updateMany', stockUpdates));
      } catch (err) {
        console.error('Bill was recorded, but deducting stock failed', err);
      }
    }

    this.refreshSalesHistory();
    this.refreshProducts();
    this.refreshBills();
    return { status: 'saved', bill, billRecordSaved };
  }

  // ---- Bills (per-order records from the Billing page) ----
  refreshBills() {
    if (this.billsStatus$.value !== 'loaded') this.billsStatus$.next('loading');
    this.getSheet<any>('Bills').subscribe({
      next: (rows) => {
        const bills = rows
          .filter((r) => r.id)
          .map((r) => {
            let items: BillItem[] = [];
            try {
              items = typeof r.items === 'string' ? JSON.parse(r.items) : r.items || [];
            } catch {
              items = [];
            }
            return {
              id: String(r.id),
              date: String(r.date || ''),
              createdAt: String(r.createdAt || ''),
              customerName: String(r.customerName || ''),
              customerPhone: String(r.customerPhone || ''),
              items: items.map((i) => ({ ...i, qty: Number(i.qty) || 0, price: Number(i.price) || 0 })),
              itemCount: Number(r.itemCount) || 0,
              subtotal: Number(r.subtotal) || 0,
              discountPercent: Number(r.discountPercent) || 0,
              discount: Number(r.discount) || 0,
              total: Number(r.total) || 0,
              paymentMethod: String(r.paymentMethod || ''),
            } as Bill;
          })
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        this.bills$.next(bills);
        this.billsStatus$.next('loaded');
      },
      error: (err) => {
        console.error('Failed to load Bills from Google Sheets', err);
        if (this.billsStatus$.value !== 'loaded') this.billsStatus$.next('error');
      },
    });
  }
  getBills() {
    return this.bills$.asObservable();
  }
  getBillsStatus() {
    return this.billsStatus$.asObservable();
  }
}

/** Bill numbers readable on a receipt and unique across devices without a
 *  server counter: SS + yymmdd - hhmmss - 2 random digits. */
function billNumber(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const rand = pad(Math.floor(Math.random() * 100));
  return `SS${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours()
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}-${rand}`;
}
