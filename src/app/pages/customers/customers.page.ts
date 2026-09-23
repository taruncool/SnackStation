import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { Customer, DataService } from '../../services/data.service';

@Component({
  selector: 'app-customer-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar class="ss-toolbar">
        <ion-title>Add Customer</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-item>
        <ion-label position="stacked">Name</ion-label>
        <ion-input [(ngModel)]="customer.name"></ion-input>
      </ion-item>
      <ion-item>
        <ion-label position="stacked">Phone</ion-label>
        <ion-input type="tel" [(ngModel)]="customer.phone"></ion-input>
      </ion-item>
      <ion-item lines="none">
        <ion-label position="stacked">Email</ion-label>
        <ion-input type="email" [(ngModel)]="customer.email"></ion-input>
      </ion-item>
      <ion-button expand="block" color="primary" style="margin-top:20px;" (click)="save()">
        Save Customer
      </ion-button>
    </ion-content>
  `,
})
export class CustomerFormModal {
  customer: Partial<Customer> = { group: 'New', loyaltyPoints: 0, outstandingAmount: 0, totalOrders: 0 };

  constructor(private modalCtrl: ModalController, private data: DataService) {}

  dismiss() {
    this.modalCtrl.dismiss();
  }

  save() {
    if (!this.customer.name || !this.customer.phone) return;
    const id = 'C' + Math.floor(Math.random() * 900 + 100);
    this.data.addCustomer({ ...(this.customer as Customer), id });
    this.modalCtrl.dismiss();
  }
}

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar class="ss-toolbar">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title class="brand-heading" style="font-size:18px;">Customers</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="openForm()">
            <ion-icon slot="icon-only" name="person-add-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar placeholder="Search by name or phone" [(ngModel)]="query"></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="ss-container">
        <ion-list lines="full">
          <ion-item *ngFor="let c of filtered">
            <ion-avatar slot="start" style="background:var(--ion-color-secondary); display:flex; align-items:center; justify-content:center; font-weight:700; color:var(--ion-color-secondary-contrast);">
              {{ c.name.charAt(0) }}
            </ion-avatar>
            <ion-label>
              {{ c.name }}
              <p>{{ c.phone }} · {{ c.totalOrders }} orders</p>
            </ion-label>
            <ion-badge slot="end" [color]="c.group === 'VIP' ? 'warning' : c.group === 'New' ? 'medium' : 'primary'">
              {{ c.group }}
            </ion-badge>
          </ion-item>
        </ion-list>
        <p *ngIf="filtered.length === 0" class="ion-text-center" style="color:var(--ion-color-medium);">
          No customers found
        </p>
      </div>
    </ion-content>
  `,
})
export class CustomersPage {
  customers: Customer[] = [];
  query = '';

  constructor(private data: DataService, private modalCtrl: ModalController) {
    this.data.getCustomers().subscribe((c) => (this.customers = c));
  }

  get filtered() {
    const q = this.query.toLowerCase().trim();
    if (!q) return this.customers;
    return this.customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }

  async openForm() {
    const modal = await this.modalCtrl.create({ component: CustomerFormModal });
    await modal.present();
  }
}
