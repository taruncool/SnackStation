import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import dashboardData from '../data/dashboard.json';
import productsData from '../data/products.json';
import categoriesData from '../data/categories.json';
import expensesData from '../data/expenses.json';

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

export interface DailySalesRecord {
  date: string; // YYYY-MM-DD
  submittedAt: string; // ISO timestamp of last submit for this date
  items: { productId: string; productName: string; qty: number }[];
  totalItems: number;
  totalRevenue: number;
  totalProfit: number;
}

const STORAGE_WORKING = 'snackstation_sales_working';
// Products are local-only for now (see products.json) — no backend table yet,
// so edits are kept in localStorage until a real database/API replaces this.
const STORAGE_PRODUCTS = 'snackstation_products';
// Sales History and Expenses are local-only too, for the same reason —
// see the DataService class comment below.
const STORAGE_SALES_HISTORY = 'snackstation_sales_history';
const STORAGE_EXPENSES = 'snackstation_expenses';

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
 * Products, Categories, Sales History and Expenses are local-only for now
 * (seeded from JSON in src/app/data/, edits persisted to localStorage) —
 * see each section's comment below. Customers and Offers still talk to a
 * Google Sheet through a Google Apps Script Web App (see
 * google-apps-script/Code.gs + SETUP.md). Every page in the app only ever
 * calls the public methods below (getProducts(), addExpense(), etc.) — this
 * is the ONE file to touch as pieces move to a real database/API.
 *
 * The Sales Count *working tally* also stays in localStorage for instant
 * taps with no network round trip; "Submit Today's Sales" writes it into
 * local Sales History.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  private products$ = new BehaviorSubject<Product[]>([]);
  private categories$ = new BehaviorSubject<Category[]>([]);
  private customers$ = new BehaviorSubject<Customer[]>([]);
  private offers$ = new BehaviorSubject<Offer[]>([]);
  private expenses$ = new BehaviorSubject<Expense[]>([]);
  private cart$ = new BehaviorSubject<CartItem[]>([]);
  private salesCount$ = new BehaviorSubject<Record<string, number>>(
    loadJSON<Record<string, number>>(STORAGE_WORKING, {})
  );
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
    this.categories$.next(categoriesData as Category[]);
    this.refreshCustomers();
    this.refreshOffers();
    this.refreshExpenses();
    this.refreshSalesHistory();
  }

  private getSheet<T>(sheet: string) {
    return this.http.get<any[]>(`${environment.sheetsApiUrl}?sheet=${encodeURIComponent(sheet)}`);
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
  // Local-only for now: seeded from products.json, edits persisted to
  // localStorage. Swap this for a real API/database call once one exists —
  // every other page only talks to the public methods below, so that's the
  // only place that will need to change.
  refreshProducts() {
    const stored = loadJSON<Product[] | null>(STORAGE_PRODUCTS, null);
    this.products$.next(stored ?? (productsData as Product[]));
  }
  getProducts() {
    return this.products$.asObservable();
  }
  getProductsSnapshot() {
    return this.products$.value;
  }
  private saveProducts(products: Product[]) {
    this.products$.next(products);
    saveJSON(STORAGE_PRODUCTS, products);
  }
  addProduct(product: Product) {
    this.saveProducts([...this.products$.value, product]);
  }
  updateProduct(updated: Product) {
    this.saveProducts(this.products$.value.map((p) => (p.id === updated.id ? updated : p)));
  }
  deleteProduct(id: string) {
    this.saveProducts(this.products$.value.filter((p) => p.id !== id));
  }

  // ---- Categories ----
  // Local-only too, from categories.json (see Products above).
  getCategories() {
    return this.categories$.asObservable();
  }
  getCategoriesSnapshot() {
    return this.categories$.value;
  }

  // ---- Customers ----
  refreshCustomers() {
    this.getSheet<Customer>('Customers').subscribe({
      next: (rows) =>
        this.customers$.next(rows.map((r) => coerce<Customer>(r, ['loyaltyPoints', 'outstandingAmount', 'totalOrders']))),
      error: (err) => console.error('Failed to load Customers from Google Sheets', err),
    });
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
  // Local-only, same pattern as Products — seeded from expenses.json, edits
  // persisted to localStorage until a real database/API replaces this.
  refreshExpenses() {
    const stored = loadJSON<Expense[] | null>(STORAGE_EXPENSES, null);
    this.expenses$.next(stored ?? (expensesData as Expense[]));
  }
  getExpenses() {
    return this.expenses$.asObservable();
  }
  getExpensesSnapshot() {
    return this.expenses$.value;
  }
  private saveExpenses(list: Expense[]) {
    this.expenses$.next(list);
    saveJSON(STORAGE_EXPENSES, list);
  }
  addExpense(expense: Expense) {
    this.saveExpenses([...this.expenses$.value, expense]);
  }
  updateExpense(updated: Expense) {
    this.saveExpenses(this.expenses$.value.map((e) => (e.id === updated.id ? updated : e)));
  }
  deleteExpense(id: string) {
    this.saveExpenses(this.expenses$.value.filter((e) => e.id !== id));
  }

  // ---- Today's Sales Count (tap-to-count tally, separate from Billing cart) ----
  // Working counts persist to localStorage (per device, instant) so a page
  // refresh never loses today's in-progress tally.
  getSalesCounts() {
    return this.salesCount$.asObservable();
  }
  getSalesCountsSnapshot() {
    return this.salesCount$.value;
  }
  incrementSale(productId: string) {
    const counts = { ...this.salesCount$.value };
    counts[productId] = (counts[productId] || 0) + 1;
    this.salesCount$.next(counts);
    saveJSON(STORAGE_WORKING, counts);
  }
  decrementSale(productId: string) {
    const counts = { ...this.salesCount$.value };
    if (!counts[productId]) return;
    counts[productId] = Math.max(0, counts[productId] - 1);
    this.salesCount$.next(counts);
    saveJSON(STORAGE_WORKING, counts);
  }
  resetSalesCounts() {
    this.salesCount$.next({});
    saveJSON(STORAGE_WORKING, {});
  }
  getTotalSalesCountToday() {
    return Object.values(this.salesCount$.value).reduce((sum, n) => sum + n, 0);
  }

  /**
   * Registers the current tally as today's sales into local Sales History
   * (merging into today's record if you submit more than once in a day),
   * deducts stock, and clears the working tally. Returns null if there's
   * nothing to submit.
   */
  async submitTodaysSales(): Promise<DailySalesRecord | null> {
    const counts = this.salesCount$.value;
    const totalItems = Object.values(counts).reduce((sum, n) => sum + n, 0);
    if (totalItems === 0) return null;

    const products = this.products$.value;
    const today = new Date().toISOString().slice(0, 10);
    const submittedAt = new Date().toISOString();

    const newItems = Object.entries(counts)
      .filter(([, qty]) => qty > 0)
      .map(([productId, qty]) => {
        const product = products.find((p) => p.id === productId);
        return {
          productId,
          productName: product?.name || productId,
          qty,
          priceAtSale: product?.sellingPrice || 0,
          costAtSale: product?.costPrice || 0,
        };
      });
    const totalRevenue = newItems.reduce((sum, r) => sum + r.qty * r.priceAtSale, 0);
    const totalProfit = newItems.reduce((sum, r) => sum + r.qty * (r.priceAtSale - r.costAtSale), 0);

    const history = [...this.salesHistory$.value];
    const idx = history.findIndex((h) => h.date === today);
    let record: DailySalesRecord;
    if (idx >= 0) {
      const existing = history[idx];
      const mergedItems = existing.items.map((i) => ({ ...i }));
      for (const it of newItems) {
        const found = mergedItems.find((m) => m.productId === it.productId);
        if (found) found.qty += it.qty;
        else mergedItems.push({ productId: it.productId, productName: it.productName, qty: it.qty });
      }
      record = {
        date: today,
        submittedAt,
        items: mergedItems,
        totalItems: existing.totalItems + totalItems,
        totalRevenue: existing.totalRevenue + totalRevenue,
        totalProfit: existing.totalProfit + totalProfit,
      };
      history[idx] = record;
    } else {
      record = {
        date: today,
        submittedAt,
        items: newItems.map((i) => ({ productId: i.productId, productName: i.productName, qty: i.qty })),
        totalItems,
        totalRevenue,
        totalProfit,
      };
      history.push(record);
    }
    this.salesHistory$.next(history);
    saveJSON(STORAGE_SALES_HISTORY, history);

    // Deduct sold quantities from local stock.
    const updatedProducts = products.map((p) => {
      const qty = counts[p.id] || 0;
      return qty > 0 ? { ...p, stockQty: Math.max(0, p.stockQty - qty) } : p;
    });
    this.saveProducts(updatedProducts);

    this.resetSalesCounts();

    return record;
  }

  refreshSalesHistory() {
    const stored = loadJSON<DailySalesRecord[]>(STORAGE_SALES_HISTORY, []);
    this.salesHistory$.next(stored);
  }
  getSalesHistory() {
    return this.salesHistory$.asObservable();
  }
  getSalesHistorySnapshot() {
    return this.salesHistory$.value;
  }

  // ---- Income & Revenue reporting ----
  // Derived from local Sales History (revenue/profit per day) and Expenses
  // (raw material, equipment/investment, utilities). Recompute on demand —
  // these read the current snapshots, so call again after data changes.
  /** Per-month breakdown for a given year. */
  // ---- Income & Revenue reporting ----
  // Derived from local Sales History (revenue per day) and Expenses (every
  // category, summed). Real-market flow for a small food business: Net
  // Profit = Total Sales − Total Expenses, full stop — no separate "gross
  // vs net" layering, and Raw Material purchases (what you actually spent
  // on ingredients) are what hit this number, not each product's costPrice.
  // costPrice stays on Products purely as a menu-pricing/margin helper —
  // "estimatedMargin" below reflects that pricing estimate for reference
  // only and is intentionally NOT part of netIncome, to avoid subtracting
  // ingredient cost twice (once per item sold, once as the real purchase).
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
}
