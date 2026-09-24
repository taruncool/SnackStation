import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonicModule, ModalController, AlertController } from '@ionic/angular';
import { DataService, Expense } from '../../services/data.service';

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
      <ion-item>
        <ion-label position="stacked">What was it for?</ion-label>
        <ion-input
          [(ngModel)]="expense.name"
          placeholder="e.g. Chicken (20kg), Gas stove, Staff wages"
        ></ion-input>
      </ion-item>
      <ion-item>
        <ion-label position="stacked">Category</ion-label>
        <ion-select [(ngModel)]="expense.category" (ionChange)="onCategoryChange()">
          <ion-select-option *ngFor="let c of categories" [value]="c">{{ c }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-label position="stacked">Amount (₹)</ion-label>
        <ion-input type="number" [(ngModel)]="expense.amount"></ion-input>
      </ion-item>
      <ion-item lines="none">
        <ion-label position="stacked">Date</ion-label>
        <ion-input type="date" [(ngModel)]="expense.date"></ion-input>
      </ion-item>
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

      <ion-button expand="block" color="primary" style="margin-top:20px;" (click)="save()">
        Save Expense
      </ion-button>
    </ion-content>
  `,
})
export class ExpenseFormModal {
  categories = EXPENSE_CATEGORIES;
  expense: Partial<Expense> = {
    category: 'Raw Material',
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  };

  constructor(private modalCtrl: ModalController, private data: DataService) {}

  dismiss() {
    this.modalCtrl.dismiss();
  }

  onCategoryChange() {
    if (this.expense.category === 'Kitchen Appliances' && !this.expense.usefulLifeMonths) {
      this.expense.usefulLifeMonths = 36;
    }
  }

  save() {
    if (!this.expense.name || !this.expense.amount || !this.expense.date) return;
    const payload: Partial<Expense> = { ...this.expense };
    if (payload.category === 'Kitchen Appliances') {
      payload.usefulLifeMonths = payload.usefulLifeMonths && payload.usefulLifeMonths > 0 ? payload.usefulLifeMonths : 36;
    } else {
      payload.usefulLifeMonths = 1;
    }
    if (payload.id) {
      this.data.updateExpense(payload as Expense);
    } else {
      const id = 'E' + Date.now();
      this.data.addExpense({ ...(payload as Expense), id });
    }
    this.modalCtrl.dismiss();
  }
}

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterLink],
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
            <div *ngFor="let c of categoryBreakdown" style="margin-bottom:12px;">
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
            <p *ngIf="categoryBreakdown.length === 0" class="ion-text-center" style="color:var(--ion-color-medium); margin:0;">
              No expenses logged yet.
            </p>
          </ion-card-content>
        </ion-card>

        <!-- List -->
        <ion-card class="ss-card">
          <ion-card-header>
            <ion-card-title style="font-size:16px;">All Entries</ion-card-title>
          </ion-card-header>
          <ion-list lines="full" *ngIf="filtered.length > 0">
            <ion-item *ngFor="let e of filtered">
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
          <p *ngIf="filtered.length === 0" class="ion-text-center" style="color:var(--ion-color-medium); padding:16px;">
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
  query = '';
  categoryOptions: string[] = ['All', ...EXPENSE_CATEGORIES];
  selectedCategory = 'All';

  constructor(
    private data: DataService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController
  ) {
    this.data.getExpenses().subscribe((e) => {
      this.expenses = [...e].sort((a, b) => (a.date < b.date ? 1 : -1));
    });
  }

  get filtered() {
    const q = this.query.toLowerCase().trim();
    return this.expenses.filter((e) => {
      const matchesCategory = this.selectedCategory === 'All' || e.category === this.selectedCategory;
      const matchesQuery = !q || e.name.toLowerCase().includes(q) || e.notes?.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }

  get totalAll() {
    return this.expenses.reduce((s, e) => s + e.amount, 0);
  }

  get totalThisMonth() {
    const prefix = new Date().toISOString().slice(0, 7);
    return this.expenses.filter((e) => e.date.startsWith(prefix)).reduce((s, e) => s + e.amount, 0);
  }

  get categoryBreakdown() {
    const totals: Record<string, number> = {};
    for (const e of this.expenses) totals[e.category] = (totals[e.category] || 0) + e.amount;
    return Object.entries(totals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
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
