import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { DataStateComponent } from '../../shared/data-state.component';
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
      <ion-item [class.invalid]="!!errors.name">
        <ion-label position="stacked">Name *</ion-label>
        <ion-input
          [(ngModel)]="customer.name"
          (ionInput)="errors.name = ''"
          placeholder="Customer name"
          autocapitalize="words"
        ></ion-input>
      </ion-item>
      <p class="field-error" *ngIf="errors.name">{{ errors.name }}</p>

      <ion-item [class.invalid]="!!errors.phone">
        <ion-label position="stacked">Phone *</ion-label>
        <ion-input
          type="tel"
          inputmode="numeric"
          maxlength="10"
          placeholder="10-digit mobile number"
          [(ngModel)]="customer.phone"
          (ionInput)="onPhoneInput()"
        ></ion-input>
      </ion-item>
      <p class="field-error" *ngIf="errors.phone">{{ errors.phone }}</p>

      <ion-item lines="none" [class.invalid]="!!errors.email">
        <ion-label position="stacked">Email (optional)</ion-label>
        <ion-input
          type="email"
          inputmode="email"
          placeholder="name@example.com"
          [(ngModel)]="customer.email"
          (ionInput)="errors.email = ''"
        ></ion-input>
      </ion-item>
      <p class="field-error" *ngIf="errors.email">{{ errors.email }}</p>

      <ion-button expand="block" color="primary" style="margin-top:20px;" [disabled]="saving" (click)="save()">
        <ion-spinner *ngIf="saving" name="dots" style="margin-right:8px;"></ion-spinner>
        {{ saving ? 'Saving…' : 'Save Customer' }}
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
export class CustomerFormModal {
  customer: Partial<Customer> = { name: '', phone: '', email: '' };
  errors: { name?: string; phone?: string; email?: string } = {};
  saving = false;

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private data: DataService
  ) {}

  dismiss() {
    this.modalCtrl.dismiss();
  }

  /** Digits only, at most 10. */
  onPhoneInput() {
    this.customer.phone = String(this.customer.phone ?? '').replace(/\D/g, '').slice(0, 10);
    this.errors.phone = '';
  }

  private validate() {
    const name = String(this.customer.name ?? '').trim();
    const phone = String(this.customer.phone ?? '').replace(/\D/g, '');
    const email = String(this.customer.email ?? '').trim();
    this.errors = {};
    if (!name) this.errors.name = 'Enter the customer’s name.';
    if (!phone) this.errors.phone = 'Enter the phone number.';
    else if (!/^[6-9]\d{9}$/.test(phone)) this.errors.phone = 'Enter a valid 10-digit mobile number (starts with 6–9).';
    else {
      const existing = this.data.findCustomerByPhone(phone);
      if (existing) this.errors.phone = `This number already belongs to ${existing.name} (${existing.id}).`;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) this.errors.email = 'Enter a valid email, e.g. name@example.com.';
    return Object.keys(this.errors).length === 0;
  }

  async save() {
    if (this.saving || !this.validate()) return;
    const customer: Customer = {
      id: this.data.newCustomerId(),
      name: String(this.customer.name).trim(),
      phone: String(this.customer.phone).replace(/\D/g, ''),
      email: String(this.customer.email ?? '').trim(),
      loyaltyPoints: 0,
      outstandingAmount: 0,
      group: 'New',
      totalOrders: 0,
    };
    this.saving = true;
    const result = await this.data.saveCustomer(customer);
    this.saving = false;
    const toast = await this.toastCtrl.create({
      message: result.ok ? `Added ${customer.name} (${customer.id}).` : `Customer not saved — ${result.reason}`,
      duration: result.ok ? 2000 : 7000,
      color: result.ok ? 'primary' : 'danger',
    });
    await toast.present();
    if (result.ok) this.modalCtrl.dismiss();
  }
}

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, DataStateComponent],
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
              {{ (c.name || '?').charAt(0) }}
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
        <app-data-state
          [status]="status"
          [empty]="filtered.length === 0"
          emptyText="No customers found"
          loadingText="Loading customers…"
          (retry)="data.refreshCustomers()"
        ></app-data-state>
      </div>
    </ion-content>
  `,
})
export class CustomersPage {
  customers: Customer[] = [];
  query = '';

  status: 'loading' | 'loaded' | 'error' = 'loading';

  constructor(public data: DataService, private modalCtrl: ModalController) {
    this.data.getCustomers().subscribe((c) => (this.customers = c));
    this.data.getCustomersStatus().subscribe((st) => (this.status = st));
  }

  get filtered() {
    const q = this.query.toLowerCase().trim();
    if (!q) return this.customers;
    return this.customers.filter(
      // phone often comes back from the Sheet as a number, not text
      (c) => String(c.name ?? '').toLowerCase().includes(q) || String(c.phone ?? '').includes(q)
    );
  }

  async openForm() {
    const modal = await this.modalCtrl.create({ component: CustomerFormModal });
    await modal.present();
  }
}
