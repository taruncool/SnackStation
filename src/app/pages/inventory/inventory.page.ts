import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonicModule, ModalController, AlertController, ToastController } from '@ionic/angular';
import { DataStateComponent } from '../../shared/data-state.component';
import { DataService, Expense, localDateKey } from '../../services/data.service';

const EXPENSE_CATEGORIES: Expense['category'][] = [
  'Raw Material',
  'Kitchen Appliances',
  'Store Expenses',
  'Salaries',
  'Transport Charges',
  'Utility',
  'Miscellaneous',
];

const CATEGORY_ICON: Record<string, string> = {
  'Raw Material': 'nutrition-outline',
  'Kitchen Appliances': 'flame-outline',
  'Store Expenses': 'storefront-outline',
  Salaries: 'people-outline',
  'Transport Charges': 'car-outline',
  Utility: 'flash-outline',
  Miscellaneous: 'ellipsis-horizontal-circle-outline',
};

const CATEGORY_COLOR: Record<string, string> = {
  'Raw Material': 'warning',
  'Kitchen Appliances': 'tertiary',
  'Store Expenses': 'primary',
  Salaries: 'success',
  'Transport Charges': 'secondary',
  Utility: 'dark',
  Miscellaneous: 'medium',
};

@Component({
  selector: 'app-expense-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar class="ss-toolbar">
        <ion-title>{{ expense.id ? 'Edit Expense' : 'Add Expense' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-item [class.invalid]="!!errors.name">
        <ion-label position="stacked">What was it for? *</ion-label>
        <ion-input
          [(ngModel)]="expense.name"
          (ionInput)="errors.name = ''"
          placeholder="e.g. Chicken (20kg), Gas stove, Staff wages"
        ></ion-input>
      </ion-item>
      <p class="field-error" *ngIf="errors.name">{{ errors.name }}</p>
      <ion-item>
        <ion-label position="stacked">Category</ion-label>
        <ion-select [(ngModel)]="expense.category" (ionChange)="onCategoryChange()">
          <ion-select-option *ngFor="let c of categories" [value]="c">{{ c }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item [class.invalid]="!!errors.amount">
        <ion-label position="stacked">Amount (₹) *</ion-label>
        <ion-input
          type="number"
          inputmode="decimal"
          min="0"
          placeholder="0"
          [(ngModel)]="expense.amount"
          (ionInput)="errors.amount = ''"
        ></ion-input>
      </ion-item>
      <p class="field-error" *ngIf="errors.amount">{{ errors.amount }}</p>
      <ion-item lines="none" [class.invalid]="!!errors.date">
        <ion-label position="stacked">Date *</ion-label>
        <ion-input type="date" [(ngModel)]="expense.date" (ionChange)="errors.date = ''"></ion-input>
      </ion-item>
      <p class="field-error" *ngIf="errors.date">{{ errors.date }}</p>
      <ion-item lines="none" *ngIf="expense.category === 'Kitchen Appliances'">
        <ion-label position="stacked">Spread cost over (months)</ion-label>
        <ion-input type="number" [(ngModel)]="expense.usefulLifeMonths"></ion-input>
        <ion-note style="font-size:11px; display:block; margin-top:4px;">
          Equipment is a one-time investment, not a monthly cost — its price is divided across
          this many months instead of hitting one month's profit in full. 36 (3 years) is a
          reasonable default; use 1 to expense it entirely in the purchase month.
        </ion-note>
      </ion-item>
      <ion-item lines="none">
        <ion-label position="stacked">Notes (optional)</ion-label>
        <ion-textarea [(ngModel)]="expense.notes" rows="2"></ion-textarea>
      </ion-item>

      <ion-button expand="block" color="primary" style="margin-top:20px;" [disabled]="saving" (click)="save()">
        <ion-spinner *ngIf="saving" name="dots" style="margin-right:8px;"></ion-spinner>
        {{ saving ? 'Saving…' : 'Save Expense' }}
      </ion-button>
    </ion-content>
  `,
  styles: [
    `
      .field-error {
        color: var(--ion-color-danger);
        font-size: 12px;
        margin: 4px 16px 8px;
      }
      ion-item.invalid {
        --border-color: var(--ion-color-danger);
        --highlight-color-focused: var(--ion-color-danger);
      }
    `,
  ],
})
export class ExpenseFormModal {
  categories = EXPENSE_CATEGORIES;
  expense: Partial<Expense> = {
    category: 'Raw Material',
    amount: undefined,
    date: localDateKey(),
    notes: '',
  };
  errors: { name?: string; amount?: string; date?: string } = {};
  saving = false;

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private data: DataService
  ) {}

  dismiss() {
    this.modalCtrl.dismiss();
  }

  onCategoryChange() {
    if (this.expense.category === 'Kitchen Appliances' && !this.expense.usefulLifeMonths) {
      this.expense.usefulLifeMonths = 36;
    }
  }

  /** Says what's missing instead of silently ignoring the tap. */
  private validate() {
    const amount = Number(this.expense.amount);
    this.errors = {};
    if (!String(this.expense.name ?? '').trim()) this.errors.name = 'Enter what this expense was for.';
    if (!Number.isFinite(amount) || amount <= 0) this.errors.amount = 'Enter an amount above 0.';
    if (!this.expense.date) this.errors.date = 'Pick a date.';
    return Object.keys(this.errors).length === 0;
  }

  async save() {
    if (this.saving || !this.validate()) return;
    const isNew = !this.expense.id;
    const payload = {
      ...this.expense,
      id: this.expense.id || 'E' + Date.now(),
      name: String(this.expense.name).trim(),
      amount: Number(this.expense.amount),
      notes: String(this.expense.notes ?? '').trim(),
    } as Expense;
    if (payload.category === 'Kitchen Appliances') {
      const months = Number(payload.usefulLifeMonths);
      payload.usefulLifeMonths = months > 0 ? months : 36;
    } else {
      payload.usefulLifeMonths = 1;
    }

    this.saving = true;
    const result = await this.data.saveExpense(payload, isNew);
    this.saving = false;
    const toast = await this.toastCtrl.create({
      message: result.ok
        ? `${isNew ? 'Added' : 'Updated'} "${payload.name}" — ₹${payload.amount.toLocaleString()}.`
        : `Expense not saved — ${result.reason}`,
      duration: result.ok ? 2000 : 6000,
      color: result.ok ? 'primary' : 'danger',
    });
    await toast.present();
    if (result.ok) this.modalCtrl.dismiss();
  }
}

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterLink, DataStateComponent],
  template: `
    <ion-header>
      <ion-toolbar class="ss-toolbar">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title class="brand-heading" style="font-size:18px;">Inventory & Expenses</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="openForm()">
            <ion-icon slot="icon-only" name="add-circle-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar placeholder="Search expenses" [(ngModel)]="query"></ion-searchbar>
      </ion-toolbar>
      <ion-toolbar>
        <div class="ss-cat-filter">
          <ion-chip
            *ngFor="let c of categoryOptions"
            [class.active]="selectedCategory === c"
            (click)="selectedCategory = c"
          >
            {{ c }}
          </ion-chip>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="ss-container" style="padding:14px;">
        <!-- Totals -->
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:6px;">
          <div class="ss-inv-stat">
            <div class="ss-inv-stat-value">₹{{ totalAll | number }}</div>
            <div class="ss-inv-stat-label">Total Invested (all time)</div>
          </div>
          <div class="ss-inv-stat">
            <div class="ss-inv-stat-value">₹{{ totalThisMonth | number }}</div>
            <div class="ss-inv-stat-label">This Month</div>
          </div>
        </div>
        <p style="font-size:11px; color:var(--ion-color-medium); margin:0 0 14px;">
          Totals here are the full purchase price of everything logged. Kitchen Appliances are
          spread across their useful life for Net Income on the
          <a routerLink="/reports" style="color:var(--ion-color-primary); font-weight:600;">Reports</a> page instead of hitting one month in full.
        </p>

        <!-- Breakdown by category -->
        <ion-card class="ss-card">
          <ion-card-header>
            <ion-card-title style="font-size:16px;">By Category</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div *ngFor="let c of categoryBreakdown; trackBy: trackByCategory" style="margin-bottom:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px; margin-bottom:4px;">
                <span style="display:flex; align-items:center; gap:6px;">
                  <ion-icon [name]="icon(c.category)" [color]="color(c.category)"></ion-icon>
                  {{ c.category }}
                </span>
                <span style="font-weight:600;">₹{{ c.amount | number }}</span>
              </div>
              <div style="background:#f1e4e4; border-radius:8px; height:8px;">
                <div
                  [style.width.%]="totalAll > 0 ? (c.amount / totalAll) * 100 : 0"
                  [style.background]="'var(--ion-color-' + color(c.category) + ')'"
                  style="height:8px; border-radius:8px;"
                ></div>
              </div>
            </div>
            <app-data-state
              [status]="status"
              [empty]="categoryBreakdown.length === 0"
              emptyText="No expenses logged yet."
              loadingText="Loading expenses…"
              (retry)="data.refreshExpenses()"
            ></app-data-state>
          </ion-card-content>
        </ion-card>

        <!-- List -->
        <ion-card class="ss-card">
          <ion-card-header>
            <ion-card-title style="font-size:16px;">All Entries</ion-card-title>
          </ion-card-header>
          <ion-list lines="full" *ngIf="filtered.length > 0">
            <ion-item *ngFor="let e of filtered; trackBy: trackById">
              <ion-icon slot="start" [name]="icon(e.category)" [color]="color(e.category)"></ion-icon>
              <ion-label>
                <h3 style="font-weight:600;">{{ e.name }}</h3>
                <p>
                  <ion-badge [color]="color(e.category)" style="margin-right:6px;">{{
                    e.category
                  }}</ion-badge>
                  {{ e.date }}<span *ngIf="e.notes"> · {{ e.notes }}</span>
                </p>
                <p *ngIf="e.usefulLifeMonths && e.usefulLifeMonths > 1" style="color:var(--ion-color-tertiary); font-weight:600;">
                  Spread ₹{{ e.amount / e.usefulLifeMonths | number:'1.0-0' }}/mo over {{ e.usefulLifeMonths }} months
                </p>
              </ion-label>
              <div slot="end" style="text-align:right;">
                <div style="font-weight:700;">₹{{ e.amount | number }}</div>
                <div style="display:flex; gap:2px;">
                  <ion-button size="small" fill="clear" (click)="openForm(e)">
                    <ion-icon slot="icon-only" name="create-outline"></ion-icon>
                  </ion-button>
                  <ion-button size="small" fill="clear" color="danger" (click)="confirmDelete(e)">
                    <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                  </ion-button>
                </div>
              </div>
            </ion-item>
          </ion-list>
          <p
            *ngIf="status === 'loaded' && filtered.length === 0"
            class="ion-text-center"
            style="color:var(--ion-color-medium); padding:16px;"
          >
            No expenses found.
          </p>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .ss-cat-filter {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding: 0 12px 10px;
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .ss-cat-filter::-webkit-scrollbar {
        display: none;
      }
      .ss-cat-filter ion-chip {
        margin: 0;
        flex-shrink: 0;
        --background: #fff;
        border: 1px solid var(--ion-color-light-shade, #ddd);
        color: var(--ion-color-dark);
      }
      .ss-cat-filter ion-chip.active {
        --background: var(--ion-color-primary);
        color: #fff;
        border-color: var(--ion-color-primary);
      }
      .ss-inv-stat {
        flex: 1;
        min-width: 140px;
        background: var(--ion-color-light, #f7f0ea);
        border-radius: 10px;
        padding: 14px;
        text-align: center;
      }
      .ss-inv-stat-value {
        font-size: 20px;
        font-weight: 700;
      }
      .ss-inv-stat-label {
        font-size: 12px;
        color: var(--ion-color-medium);
        margin-top: 2px;
      }
    `,
  ],
})
export class InventoryPage {
  expenses: Expense[] = [];
  status: 'loading' | 'loaded' | 'error' = 'loading';
  query = '';
  categoryOptions: string[] = ['All', ...EXPENSE_CATEGORIES];
  selectedCategory = 'All';

  // Worked out once per data change (see setExpenses), NOT in getters: a
  // getter returning fresh objects made *ngFor rebuild the rows — and their
  // <ion-icon>s — on every change-detection pass; each new ion-icon kicks
  // off async icon loading, which triggers another pass, forever. That
  // froze the whole app with no error as soon as expenses loaded.
  totalAll = 0;
  totalThisMonth = 0;
  categoryBreakdown: { category: string; amount: number }[] = [];

  constructor(
    public data: DataService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController
  ) {
    this.data.getExpenses().subscribe((e) => this.setExpenses(e));
    this.data.getExpensesStatus().subscribe((st) => (this.status = st));
  }

  get filtered() {
    const q = this.query.toLowerCase().trim();
    return this.expenses.filter((e) => {
      const matchesCategory = this.selectedCategory === 'All' || e.category === this.selectedCategory;
      const matchesQuery =
        !q || String(e.name ?? '').toLowerCase().includes(q) || String(e.notes ?? '').toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }

  private setExpenses(list: Expense[]) {
    this.expenses = [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
    this.totalAll = this.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const prefix = localDateKey().slice(0, 7);
    this.totalThisMonth = this.expenses
      .filter((e) => String(e.date).startsWith(prefix))
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const totals: Record<string, number> = {};
    for (const e of this.expenses) totals[e.category] = (totals[e.category] || 0) + (Number(e.amount) || 0);
    this.categoryBreakdown = Object.entries(totals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  trackByCategory(_: number, c: { category: string }) {
    return c.category;
  }

  trackById(_: number, e: Expense) {
    return e.id;
  }

  icon(category: string) {
    return CATEGORY_ICON[category] || 'pricetag-outline';
  }

  color(category: string) {
    return CATEGORY_COLOR[category] || 'medium';
  }

  async openForm(existing?: Expense) {
    const modal = await this.modalCtrl.create({
      component: ExpenseFormModal,
      componentProps: existing ? { expense: { ...existing } } : {},
    });
    await modal.present();
  }

  async confirmDelete(e: Expense) {
    const alert = await this.alertCtrl.create({
      header: 'Delete expense?',
      message: `Remove "${e.name}" (₹${e.amount})? This cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => this.data.deleteExpense(e.id),
        },
      ],
    });
    await alert.present();
  }
}
