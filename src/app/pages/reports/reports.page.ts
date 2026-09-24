import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, AlertController, ToastController } from '@ionic/angular';
import { DataService, Offer, Expense } from '../../services/data.service';

const EXPENSE_CATEGORIES: Expense['category'][] = [
  'Raw Material',
  'Investment/Equipment',
  'Utility',
  'Other',
];

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
          placeholder="e.g. Chicken (20kg), Gas stove, LPG refill"
        ></ion-input>
      </ion-item>
      <ion-item>
        <ion-label position="stacked">Category</ion-label>
        <ion-select [(ngModel)]="expense.category">
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

  save() {
    if (!this.expense.name || !this.expense.amount || !this.expense.date) return;
    if (this.expense.id) {
      this.data.updateExpense(this.expense as Expense);
    } else {
      const id = 'E' + Date.now();
      this.data.addExpense({ ...(this.expense as Expense), id });
    }
    this.modalCtrl.dismiss();
  }
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar class="ss-toolbar">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title class="brand-heading" style="font-size:18px;">Reports</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="ss-container" style="padding:14px;">
        <!-- Income & Revenue -->
        <ion-card class="ss-card">
          <ion-card-header style="display:flex; flex-direction:row; align-items:center; justify-content:space-between;">
            <ion-card-title style="font-size:16px;">Income & Revenue</ion-card-title>
            <ion-select
              interface="popover"
              [(ngModel)]="selectedYear"
              (ionChange)="onYearChange()"
              style="max-width:100px;"
            >
              <ion-select-option *ngFor="let y of years" [value]="y">{{ y }}</ion-select-option>
            </ion-select>
          </ion-card-header>
          <ion-card-content>
            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:16px;">
              <div class="ss-report-stat">
                <div class="ss-report-stat-value">₹{{ yearlySummary.revenue | number }}</div>
                <div class="ss-report-stat-label">Yearly Revenue</div>
              </div>
              <div class="ss-report-stat">
                <div class="ss-report-stat-value">₹{{ yearlySummary.expenses | number }}</div>
                <div class="ss-report-stat-label">Yearly Expenses</div>
              </div>
              <div class="ss-report-stat">
                <div
                  class="ss-report-stat-value"
                  [style.color]="yearlySummary.netIncome >= 0 ? 'var(--ion-color-success)' : 'var(--ion-color-danger)'"
                >
                  ₹{{ yearlySummary.netIncome | number }}
                </div>
                <div class="ss-report-stat-label">Net Income ({{ selectedYear }})</div>
              </div>
            </div>

            <ion-list lines="full">
              <ion-item *ngFor="let m of monthlySummary">
                <ion-label>
                  <h3 style="font-weight:600;">{{ m.label }}</h3>
                  <p>Revenue ₹{{ m.revenue | number }} · Expenses ₹{{ m.expenses | number }}</p>
                </ion-label>
                <div
                  slot="end"
                  style="font-weight:700; text-align:right;"
                  [style.color]="m.netIncome > 0 ? 'var(--ion-color-success)' : (m.netIncome < 0 ? 'var(--ion-color-danger)' : 'var(--ion-color-medium)')"
                >
                  ₹{{ m.netIncome | number }}
                </div>
              </ion-item>
            </ion-list>
            <p style="font-size:12px; color:var(--ion-color-medium); margin-top:8px;">
              Net income = gross profit from sales (Sales Count → Submit Today's Sales) minus
              expenses logged below, per month.
            </p>
          </ion-card-content>
        </ion-card>

        <!-- Expenses / Inventory -->
        <ion-card class="ss-card">
          <ion-card-header style="display:flex; flex-direction:row; align-items:center; justify-content:space-between;">
            <ion-card-title style="font-size:16px;">Expenses & Inventory</ion-card-title>
            <ion-button size="small" fill="clear" (click)="openExpenseForm()">
              <ion-icon slot="icon-only" name="add-circle-outline"></ion-icon>
            </ion-button>
          </ion-card-header>
          <ion-card-content>
            <p style="font-size:12px; color:var(--ion-color-medium); margin-top:0;">
              Log purchases, raw material, and investments (kitchen/cooking tools, gas, stove,
              etc.) here — they're what gets subtracted from sales revenue above.
            </p>
            <ion-list lines="full" *ngIf="expenses.length > 0">
              <ion-item *ngFor="let e of expenses">
                <ion-label>
                  <h3 style="font-weight:600;">{{ e.name }}</h3>
                  <p>
                    <ion-badge [color]="badgeColor(e.category)" style="margin-right:6px;">{{
                      e.category
                    }}</ion-badge>
                    {{ e.date }}
                  </p>
                </ion-label>
                <div slot="end" style="text-align:right;">
                  <div style="font-weight:700;">₹{{ e.amount | number }}</div>
                  <ion-button
                    size="small"
                    fill="clear"
                    color="danger"
                    (click)="confirmDeleteExpense(e)"
                  >
                    <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                  </ion-button>
                </div>
              </ion-item>
            </ion-list>
            <p *ngIf="expenses.length === 0" class="ion-text-center" style="color:var(--ion-color-medium);">
              No expenses logged yet — tap + to add one.
            </p>
          </ion-card-content>
        </ion-card>

        <ion-card class="ss-card">
          <ion-card-header>
            <ion-card-title style="font-size:16px;">Payment Method Distribution</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div *ngFor="let p of dashboard.paymentDistribution" style="margin-bottom:10px;">
              <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px;">
                <span>{{ p.method }}</span><span>{{ p.percent }}%</span>
              </div>
              <div style="background:#f1e4e4; border-radius:8px; height:8px;">
                <div
                  [style.width.%]="p.percent"
                  style="background:var(--ion-color-primary); height:8px; border-radius:8px;"
                ></div>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <ion-card class="ss-card">
          <ion-card-header>
            <ion-card-title style="font-size:16px;">Offers & Coupons</ion-card-title>
          </ion-card-header>
          <ion-list lines="full">
            <ion-item *ngFor="let o of offers">
              <ion-label>
                {{ o.title }}
                <p>{{ o.description }}</p>
              </ion-label>
              <ion-badge slot="end" [color]="o.active ? 'success' : 'medium'">
                {{ o.active ? 'Active' : 'Inactive' }}
              </ion-badge>
            </ion-item>
          </ion-list>
        </ion-card>

        <ion-card class="ss-card">
          <ion-card-header>
            <ion-card-title style="font-size:16px;">Export Reports</ion-card-title>
          </ion-card-header>
          <ion-card-content style="display:flex; gap:10px; flex-wrap:wrap;">
            <ion-button fill="outline" color="primary" (click)="exportAs('Excel')">
              <ion-icon slot="start" name="document-outline"></ion-icon>Excel
            </ion-button>
            <ion-button fill="outline" color="primary" (click)="exportAs('PDF')">
              <ion-icon slot="start" name="document-text-outline"></ion-icon>PDF
            </ion-button>
            <ion-button fill="outline" color="primary" (click)="exportAs('CSV')">
              <ion-icon slot="start" name="grid-outline"></ion-icon>CSV
            </ion-button>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .ss-report-stat {
        flex: 1;
        min-width: 100px;
        background: var(--ion-color-light, #f7f0ea);
        border-radius: 10px;
        padding: 10px;
        text-align: center;
      }
      .ss-report-stat-value {
        font-size: 17px;
        font-weight: 700;
      }
      .ss-report-stat-label {
        font-size: 11px;
        color: var(--ion-color-medium);
        margin-top: 2px;
      }
    `,
  ],
})
export class ReportsPage {
  dashboard = this.data.dashboard;
  offers: Offer[] = [];
  expenses: Expense[] = [];
  years: number[] = [];
  selectedYear = new Date().getFullYear();
  monthlySummary = this.data.getMonthlySummary(this.selectedYear);
  yearlySummary = this.data.getYearlySummary(this.selectedYear);

  constructor(
    private data: DataService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    this.data.getOffers().subscribe((o) => (this.offers = o));
    this.data.getExpenses().subscribe((e) => {
      this.expenses = [...e].sort((a, b) => (a.date < b.date ? 1 : -1));
      this.recompute();
    });
    this.data.getSalesHistory().subscribe(() => this.recompute());
    this.years = this.data.getAvailableYears();
  }

  recompute() {
    this.years = this.data.getAvailableYears();
    this.monthlySummary = this.data.getMonthlySummary(this.selectedYear);
    this.yearlySummary = this.data.getYearlySummary(this.selectedYear);
  }

  onYearChange() {
    this.recompute();
  }

  badgeColor(category: string) {
    switch (category) {
      case 'Raw Material':
        return 'warning';
      case 'Investment/Equipment':
        return 'tertiary';
      case 'Utility':
        return 'secondary';
      default:
        return 'medium';
    }
  }

  async openExpenseForm() {
    const modal = await this.modalCtrl.create({ component: ExpenseFormModal });
    await modal.present();
  }

  async confirmDeleteExpense(e: Expense) {
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

  async exportAs(format: string) {
    const toast = await this.toastCtrl.create({
      message: `${format} export is a placeholder in this static demo — wire this to the future Node.js API.`,
      duration: 2200,
      color: 'primary',
    });
    await toast.present();
  }
}
