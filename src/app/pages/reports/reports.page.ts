import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { DataService, Offer } from '../../services/data.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, IonicModule],
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
})
export class ReportsPage {
  dashboard = this.data.dashboard;
  offers: Offer[] = [];

  constructor(private data: DataService, private toastCtrl: ToastController) {
    this.data.getOffers().subscribe((o) => (this.offers = o));
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
