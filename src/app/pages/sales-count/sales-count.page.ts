import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ModalController, ToastController } from '@ionic/angular';
import { DailySalesRecord, DataService, Product } from '../../services/data.service';

@Component({
  selector: 'app-sales-history-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar class="ss-toolbar">
        <ion-title>Daily Sales History</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-list *ngIf="history.length > 0" lines="full">
        <ion-item *ngFor="let record of history">
          <ion-label>
            <h2 style="font-weight:700;">{{ record.date }}</h2>
            <p>{{ record.totalItems }} items · ₹{{ record.totalRevenue | number }} value</p>
            <p style="font-size:12px; color:var(--ion-color-medium);">
              {{ record.items.length }} product{{ record.items.length === 1 ? '' : 's' }} —
              <span *ngFor="let i of record.items; let last = last">
                {{ i.productName }} ({{ i.qty }}){{ last ? '' : ', ' }}
              </span>
            </p>
          </ion-label>
        </ion-item>
      </ion-list>
      <p *ngIf="history.length === 0" class="ion-text-center" style="color:var(--ion-color-medium); margin-top:40px;">
        No sales submitted yet. Count today's sales and tap "Submit Today's Sales" to register them here.
      </p>
    </ion-content>
  `,
})
export class SalesHistoryModal {
  history: DailySalesRecord[] = [];
  constructor(private modalCtrl: ModalController, private data: DataService) {
    this.data.getSalesHistory().subscribe((h) => (this.history = h));
    this.data.refreshSalesHistory();
  }
  dismiss() {
    this.modalCtrl.dismiss();
  }
}

@Component({
  selector: 'app-sales-count',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar class="ss-toolbar">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title class="brand-heading" style="font-size:18px;">Today's Sales Count</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="openHistory()">
            <ion-icon slot="icon-only" name="time-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="confirmReset()">
            <ion-icon slot="icon-only" name="refresh-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar placeholder="Search product" [(ngModel)]="query"></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="ss-container" style="padding:10px;">
        <div class="ss-stat-card ss-card" style="margin-bottom:12px; padding:16px;">
          <div class="ss-stat-value" style="font-size:28px;">{{ totalCount }}</div>
          <div class="ss-stat-label">Total items counted (not yet submitted)</div>
        </div>

        <ion-grid>
          <ion-row>
            <ion-col size="6" size-md="4" size-lg="3" *ngFor="let p of filtered">
              <ion-card class="ss-card" style="position:relative;">
                <ion-card-content style="text-align:center; padding:12px;">
                  <div
                    *ngIf="counts[p.id]"
                    class="ss-count-badge"
                  >
                    {{ counts[p.id] }}
                  </div>
                  <div style="position:relative;">
                    <ion-icon
                      name="remove-circle-outline"
                      class="ss-zone-hint ss-zone-hint-left"
                    ></ion-icon>
                    <ion-icon
                      name="add-circle"
                      class="ss-zone-hint ss-zone-hint-right"
                    ></ion-icon>
                    <img
                      [src]="imgSrc(p)"
                      [alt]="p.name"
                      style="width:44px; height:44px; border-radius:10px; object-fit:cover; margin-bottom:2px;"
                    />
                    <h3 style="margin:4px 0 2px; font-size:14px; font-weight:600;">{{ p.name }}</h3>
                    <p style="margin:0 0 8px; font-size:12px; color:var(--ion-color-medium);">
                      {{ p.category }}
                    </p>
                    <div class="ss-tap-overlay">
                      <div class="ss-tap-zone" (click)="remove(p, $event)"></div>
                      <div class="ss-tap-zone" (click)="add(p, $event)"></div>
                    </div>
                  </div>
                  <div style="display:flex; align-items:center; justify-content:center; gap:10px;">
                    <ion-button
                      size="small"
                      fill="clear"
                      color="medium"
                      (click)="remove(p, $event)"
                      [disabled]="!counts[p.id]"
                    >
                      <ion-icon slot="icon-only" name="remove-circle-outline"></ion-icon>
                    </ion-button>
                    <span style="min-width:20px; font-weight:700; font-size:15px;">{{
                      counts[p.id] || 0
                    }}</span>
                    <ion-button size="small" fill="clear" color="primary" (click)="add(p, $event)">
                      <ion-icon slot="icon-only" name="add-circle"></ion-icon>
                    </ion-button>
                  </div>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
        <p *ngIf="filtered.length === 0" class="ion-text-center" style="color:var(--ion-color-medium);">
          No active products found
        </p>
      </div>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-button
          expand="block"
          color="primary"
          style="margin:8px;"
          [disabled]="totalCount === 0"
          (click)="submit()"
        >
          <ion-icon slot="start" name="checkmark-done-outline"></ion-icon>
          Submit Today's Sales ({{ totalCount }})
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [
    `
      .ss-count-badge {
        position: absolute;
        top: 6px;
        right: 6px;
        z-index: 2;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--ion-color-secondary);
        color: var(--ion-color-secondary-contrast);
        font-weight: 700;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
      }
      .ss-tap-overlay {
        position: absolute;
        inset: 0;
        display: flex;
      }
      .ss-tap-zone {
        flex: 1;
        cursor: pointer;
      }
      .ss-zone-hint {
        position: absolute;
        top: 2px;
        font-size: 14px;
        opacity: 0.3;
        pointer-events: none;
      }
      .ss-zone-hint-left {
        left: 2px;
        color: var(--ion-color-medium);
      }
      .ss-zone-hint-right {
        right: 2px;
        color: var(--ion-color-primary);
      }
    `,
  ],
})
export class SalesCountPage {
  products: Product[] = [];
  counts: Record<string, number> = {};
  query = '';

  constructor(
    private data: DataService,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController
  ) {
    this.data.getProducts().subscribe((p) => (this.products = p.filter((x) => x.status === 'active')));
    this.data.getSalesCounts().subscribe((c) => (this.counts = c));
  }

  get filtered() {
    const q = this.query.toLowerCase().trim();
    if (!q) return this.products;
    return this.products.filter((p) => p.name.toLowerCase().includes(q));
  }

  get totalCount() {
    return this.data.getTotalSalesCountToday();
  }

  add(p: Product, ev?: Event) {
    ev?.stopPropagation();
    this.data.incrementSale(p.id);
  }

  remove(p: Product, ev?: Event) {
    ev?.stopPropagation();
    this.data.decrementSale(p.id);
  }

  async confirmReset() {
    const alert = await this.alertCtrl.create({
      header: 'Clear uncounted tally?',
      message:
        'This clears the current running count without saving it to sales history. This cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Clear',
          role: 'destructive',
          handler: () => this.data.resetSalesCounts(),
        },
      ],
    });
    await alert.present();
  }

  async submit() {
    const alert = await this.alertCtrl.create({
      header: "Submit today's sales?",
      message: `This registers ${this.totalCount} counted item(s) to today's sales record and clears the tally so you can start counting the next batch.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Submit',
          handler: async () => {
            const record = await this.data.submitTodaysSales();
            if (record) {
              const toast = await this.toastCtrl.create({
                message: `Recorded ${record.totalItems} items for ${record.date} (₹${record.totalRevenue.toLocaleString()} total).`,
                duration: 2500,
                color: 'primary',
              });
              await toast.present();
            } else {
              const toast = await this.toastCtrl.create({
                message: `Couldn't submit — check your connection or Google Sheets setup.`,
                duration: 2500,
                color: 'danger',
              });
              await toast.present();
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async openHistory() {
    const modal = await this.modalCtrl.create({ component: SalesHistoryModal });
    await modal.present();
  }

  imgSrc(p: Product) {
    return p.image ? `assets/images/products/${p.image}.jpg` : 'assets/products/default.svg';
  }
}
