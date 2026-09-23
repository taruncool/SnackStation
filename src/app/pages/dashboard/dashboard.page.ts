import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { DataService, Product } from '../../services/data.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar class="ss-toolbar">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title class="brand-heading" style="font-size:18px;">Dashboard</ion-title>
      </ion-toolbar>
      <ion-toolbar class="ss-toolbar ss-range-toolbar">
        <ion-segment [(ngModel)]="range" scrollable class="ss-segment">
          <ion-segment-button value="daily"><ion-label>Day</ion-label></ion-segment-button>
          <ion-segment-button value="weekly"><ion-label>Week</ion-label></ion-segment-button>
          <ion-segment-button value="monthly"><ion-label>Month</ion-label></ion-segment-button>
          <ion-segment-button value="yearly"><ion-label>Year</ion-label></ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="ss-container" style="padding:14px;">
        <ion-grid>
          <ion-row>
            <ion-col size="6" size-md="3">
              <div class="ss-stat-card ss-card">
                <div class="ss-stat-value">₹{{ todayRevenue | number }}</div>
                <div class="ss-stat-label">Revenue<span class="ss-live-dot" title="Live from submitted sales"></span></div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="ss-stat-card ss-card" (click)="goToSalesCount()" style="cursor:pointer;">
                <div class="ss-stat-value">{{ dashboard.billsCount }}</div>
                <div class="ss-stat-label">Bills</div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="ss-stat-card ss-card" (click)="goToSalesCount()" style="cursor:pointer;">
                <div class="ss-stat-value">
                  {{ dashboard.itemsSold }}
                  <ion-badge
                    *ngIf="liveCount > 0"
                    color="secondary"
                    style="font-size:11px; vertical-align:top; margin-left:2px;"
                    >+{{ liveCount }}</ion-badge
                  >
                </div>
                <div class="ss-stat-label">
                  Items Sold
                  <ion-icon name="chevron-forward-outline" style="font-size:12px;"></ion-icon>
                </div>
              </div>
            </ion-col>
            <ion-col size="6" size-md="3">
              <div class="ss-stat-card ss-card">
                <div class="ss-stat-value">₹{{ todayProfit | number }}</div>
                <div class="ss-stat-label">Profit<span class="ss-live-dot" title="Live from submitted sales"></span></div>
              </div>
            </ion-col>
          </ion-row>
        </ion-grid>

        <ion-card class="ss-card" button (click)="goToSalesCount()">
          <ion-card-content style="display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:12px;">
              <ion-icon
                name="checkmark-done-circle-outline"
                color="primary"
                style="font-size:28px;"
              ></ion-icon>
              <div>
                <h3 style="margin:0; font-weight:600;">Today's Sales Count</h3>
                <p style="margin:2px 0 0; font-size:12px; color:var(--ion-color-medium);">
                  Tap products as orders come in — {{ liveCount }} counted so far today
                </p>
              </div>
            </div>
            <ion-icon name="chevron-forward-outline" color="medium"></ion-icon>
          </ion-card-content>
        </ion-card>

        <ion-grid>
          <ion-row>
            <ion-col size="12" size-md="6">
              <ion-card class="ss-card">
                <ion-card-header>
                  <ion-card-title style="font-size:16px;">Top Selling Products</ion-card-title>
                </ion-card-header>
                <ion-list lines="full">
                  <ion-item *ngFor="let p of dashboard.topSellingProducts">
                    <img
                      slot="start"
                      [src]="imgSrcByName(p.name)"
                      [alt]="p.name"
                      style="width:36px; height:36px; border-radius:8px; object-fit:cover;"
                    />
                    <ion-label>{{ p.name }}</ion-label>
                    <ion-note slot="end">{{ p.unitsSold }} sold</ion-note>
                  </ion-item>
                </ion-list>
              </ion-card>
            </ion-col>

            <ion-col size="12" size-md="6">
              <ion-card class="ss-card">
                <ion-card-header>
                  <ion-card-title style="font-size:16px;">Low Stock Alerts</ion-card-title>
                </ion-card-header>
                <ion-list lines="full">
                  <ion-item *ngFor="let p of lowStock">
                    <img
                      slot="start"
                      [src]="imgSrc(p)"
                      [alt]="p.name"
                      style="width:36px; height:36px; border-radius:8px; object-fit:cover;"
                    />
                    <ion-label>
                      {{ p.name }}
                      <p>Only {{ p.stockQty }} {{ p.unit }} left</p>
                    </ion-label>
                    <ion-badge color="danger" slot="end">Restock</ion-badge>
                  </ion-item>
                  <ion-item *ngIf="lowStock.length === 0">
                    <ion-label color="medium">All products sufficiently stocked</ion-label>
                  </ion-item>
                </ion-list>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>

        <ion-card class="ss-card">
          <ion-card-header>
            <ion-card-title style="font-size:16px;">Sales Trend (7 days)</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div style="display:flex; align-items:flex-end; gap:8px; height:120px;">
              <div *ngFor="let d of dashboard.salesTrend" style="flex:1; text-align:center;">
                <div
                  [style.height.px]="d.value / 250"
                  style="background:var(--ion-color-primary); border-radius:6px 6px 0 0;"
                ></div>
                <div style="font-size:11px; color:var(--ion-color-medium); margin-top:4px;">
                  {{ d.day }}
                </div>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .ss-range-toolbar {
        --min-height: 44px;
        padding-top: 0;
      }
      .ss-segment {
        --background: transparent;
      }
      .ss-segment ion-segment-button {
        --color: rgba(255, 255, 255, 0.85);
        --color-checked: var(--ion-color-secondary);
        --indicator-color: var(--ion-color-secondary);
        min-width: 64px;
        font-weight: 600;
        text-transform: none;
      }
      .ss-segment ion-segment-button.segment-button-checked {
        color: var(--ion-color-secondary) !important;
        font-weight: 700;
      }
      .ss-live-dot {
        display: inline-block;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #2dd36f;
        margin-left: 4px;
        vertical-align: middle;
      }
    `,
  ],
})
export class DashboardPage {
  dashboard = this.data.dashboard;
  range: 'daily' | 'weekly' | 'monthly' = 'daily';
  lowStock: Product[] = [];
  liveCount = 0;
  todayRevenue = 0;
  todayProfit = 0;
  private allProducts: Product[] = [];

  constructor(private data: DataService, private router: Router) {
    this.data.getProducts().subscribe((products) => {
      this.allProducts = products;
      this.lowStock = products.filter((p) => p.stockQty <= p.minStock);
    });
    this.data.getSalesCounts().subscribe(() => {
      this.liveCount = this.data.getTotalSalesCountToday();
    });
    this.data.getSalesHistory().subscribe((history) => {
      const today = new Date().toISOString().slice(0, 10);
      const record = history.find((r) => r.date === today);
      this.todayRevenue = record?.totalRevenue || 0;
      this.todayProfit = record?.totalProfit || 0;
    });
    this.data.refreshSalesHistory();
  }

  goToSalesCount() {
    this.router.navigateByUrl('/sales-count');
  }

  imgSrc(p: Product) {
    return `assets/products/${p.image || 'default'}.svg`;
  }

  imgSrcByName(name: string) {
    const match = this.allProducts.find((p) => p.name.toLowerCase() === name.toLowerCase());
    return `assets/products/${match?.image || 'default'}.svg`;
  }
}
