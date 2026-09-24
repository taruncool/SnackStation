import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { DataService, Offer } from '../../services/data.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterLink],
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
              Net income = Total Sales − Total Expenses (Raw Material, Kitchen Appliances, Store
              Expenses, Salaries, Transport, Utility, Misc — everything logged in
              <a routerLink="/inventory" style="color:var(--ion-color-primary); font-weight:600;">Inventory & Expenses</a>).
              This is your real profit — separate from each product's estimated pricing margin on
              the Products page.
            </p>
          </ion-card-content>
        </ion-card>

        <!-- Inventory & Expenses summary -->
        <ion-card class="ss-card" button routerLink="/inventory">
          <ion-card-content style="display:flex; align-items:center; justify-content:space-between;">
            <div>
              <div style="font-weight:700; font-size:15px;">Inventory & Expenses</div>
              <div style="font-size:12px; color:var(--ion-color-medium); margin-top:2px;">
                Raw material, kitchen appliances, store expenses, salaries, transport & more
              </div>
              <div style="font-weight:700; margin-top:6px;">₹{{ totalExpensesThisYear | number }} logged in {{ selectedYear }}</div>
            </div>
            <ion-icon name="chevron-forward-outline" style="font-size:22px; color:var(--ion-color-medium);"></ion-icon>
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
  years: number[] = [];
  selectedYear = new Date().getFullYear();
  monthlySummary = this.data.getMonthlySummary(this.selectedYear);
  yearlySummary = this.data.getYearlySummary(this.selectedYear);

  constructor(private data: DataService, private toastCtrl: ToastController) {
    this.data.getOffers().subscribe((o) => (this.offers = o));
    this.data.getExpenses().subscribe(() => this.recompute());
    this.data.getSalesHistory().subscribe(() => this.recompute());
    this.years = this.data.getAvailableYears();
  }

  recompute() {
    this.years = this.data.getAvailableYears();
    this.monthlySummary = this.data.getMonthlySummary(this.selectedYear);
    this.yearlySummary = this.data.getYearlySummary(this.selectedYear);
  }

  get totalExpensesThisYear() {
    return this.yearlySummary.expenses;
  }

  onYearChange() {
    this.recompute();
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
