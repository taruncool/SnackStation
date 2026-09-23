import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
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
 * google-apps-script/Code.gs + SETUP.md). Every page in the app only ever
 * calls the public methods below (getProducts(), addProduct(), etc.) — this
 * is the ONE file to touch if you ever swap Google Sheets for Firebase,
 * Supabase, PocketBase, or a real Node.js API later.
 *
 * The Sales Count *working tally* stays in localStorage for instant taps
 * with no network round trip; only "Submit Today's Sales" writes to the
 * Sheet, into the SalesHistory tab.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  private products$ = new BehaviorSubject<Product[]>([]);
  private categories$ = new BehaviorSubject<Category[]>([]);
  private customers$ = new BehaviorSubject<Customer[]>([]);
  private offers$ = new BehaviorSubject<Offer[]>([]);
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
    this.refreshCategories();
    this.refreshCustomers();
    this.refreshOffers();
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
  refreshProducts() {
    this.getSheet<Product>('Products').subscribe({
      next: (rows) =>
        this.products$.next(
          rows.map((r) => coerce<Product>(r, ['costPrice', 'sellingPrice', 'gst', 'stockQty', 'minStock']))
        ),
      error: (err) => console.error('Failed to load Products from Google Sheets', err),
    });
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
   * Registers the current tally as today's sales: writes one row per
   * counted product to the SalesHistory sheet tab (shared across every
   * device/person using the same Google Sheet), then clears the local
   * working buffer. Returns null if there's nothing to submit, or if the
   * write fails.
   */
  async submitTodaysSales(): Promise<DailySalesRecord | null> {
    const counts = this.salesCount$.value;
    const totalItems = Object.values(counts).reduce((sum, n) => sum + n, 0);
    if (totalItems === 0) return null;

    const products = this.products$.value;
    const today = new Date().toISOString().slice(0, 10);
    const submittedAt = new Date().toISOString();

    const rows = Object.entries(counts)
      .filter(([, qty]) => qty > 0)
      .map(([productId, qty]) => {
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

    try {
      await firstValueFrom(this.postSheet('SalesHistory', 'addMany', rows));
    } catch (err) {
      console.error('Failed to submit sales to Google Sheets', err);
      return null;
    }

    // Deduct sold quantities from stock. Sends the FULL updated product row
    // (not just id + stockQty) because the sheet's "update" actions replace
    // the entire row — sending a partial object would blank out the other
    // columns.
    const stockUpdates = Object.entries(counts)
      .filter(([, qty]) => qty > 0)
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

    this.resetSalesCounts();
    this.refreshSalesHistory();
    this.refreshProducts();

    return {
      date: today,
      submittedAt,
      items: rows.map((r) => ({ productId: r.productId, productName: r.productName, qty: r.qty })),
      totalItems,
      totalRevenue,
      totalProfit,
    };
  }

  refreshSalesHistory() {
    this.getSheet<any>('SalesHistory').subscribe({
      next: (rows) => {
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
        const list = Object.values(grouped).sort((a, b) => (a.date < b.date ? 1 : -1));
        this.salesHistory$.next(list);
      },
      error: (err) => console.error('Failed to load SalesHistory from Google Sheets', err),
    });
  }
  getSalesHistory() {
    return this.salesHistory$.asObservable();
  }
  getSalesHistorySnapshot() {
    return this.salesHistory$.value;
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
