import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { CartItem, DataService, Product } from '../../services/data.service';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar class="ss-toolbar">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title class="brand-heading" style="font-size:18px;">Billing</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          placeholder="Search product / scan barcode"
          [(ngModel)]="query"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="ss-container" style="padding:10px;">
        <ion-grid>
          <ion-row>
            <!-- Product picker -->
            <ion-col size="12" size-md="7">
              <ion-grid>
                <ion-row>
                  <ion-col size="6" size-lg="4" *ngFor="let p of filtered">
                    <ion-card class="ss-card" button (click)="add(p)">
                      <ion-card-content style="padding:10px; text-align:center;">
                        <img
                          [src]="imgSrc(p)"
                          [alt]="p.name"
                          style="width:48px; height:48px; border-radius:10px; object-fit:cover; margin-bottom:6px;"
                        />
                        <h3 style="margin:0; font-size:14px; font-weight:600;">{{ p.name }}</h3>
                        <p style="margin:2px 0; font-size:12px; color:var(--ion-color-medium);">
                          {{ p.category }}
                        </p>
                        <p style="margin:0; font-weight:700; color:var(--ion-color-primary);">
                          ₹{{ p.sellingPrice }}
                        </p>
                      </ion-card-content>
                    </ion-card>
                  </ion-col>
                </ion-row>
              </ion-grid>
            </ion-col>

            <!-- Cart -->
            <ion-col size="12" size-md="5">
              <ion-card class="ss-card">
                <ion-card-header>
                  <ion-card-title style="font-size:16px;">Current Bill</ion-card-title>
                </ion-card-header>
                <ion-list lines="full">
                  <ion-item *ngFor="let item of cart">
                    <img
                      slot="start"
                      [src]="imgSrc(item.product)"
                      [alt]="item.product.name"
                      style="width:32px; height:32px; border-radius:8px; object-fit:cover;"
                    />
                    <ion-label>
                      {{ item.product.name }}
                      <p>₹{{ item.product.sellingPrice }} x {{ item.qty }}</p>
                    </ion-label>
                    <ion-buttons slot="end">
                      <ion-button size="small" (click)="dec(item)">
                        <ion-icon name="remove-circle-outline"></ion-icon>
                      </ion-button>
                      <ion-note>{{ item.qty }}</ion-note>
                      <ion-button size="small" (click)="inc(item)">
                        <ion-icon name="add-circle-outline"></ion-icon>
                      </ion-button>
                    </ion-buttons>
                  </ion-item>
                  <ion-item *ngIf="cart.length === 0">
                    <ion-label color="medium">Cart is empty — tap a product to add</ion-label>
                  </ion-item>
                </ion-list>

                <ion-item lines="none">
                  <ion-label position="stacked">Discount (₹)</ion-label>
                  <ion-input type="number" [(ngModel)]="discount"></ion-input>
                </ion-item>

                <ion-card-content>
                  <div class="ion-flex" style="display:flex; justify-content:space-between;">
                    <span>Subtotal</span><span>₹{{ subtotal | number: '1.2-2' }}</span>
                  </div>
                  <div style="display:flex; justify-content:space-between;">
                    <span>GST</span><span>₹{{ gstAmount | number: '1.2-2' }}</span>
                  </div>
                  <div style="display:flex; justify-content:space-between;">
                    <span>Discount</span><span>- ₹{{ discount || 0 }}</span>
                  </div>
                  <div
                    style="display:flex; justify-content:space-between; font-weight:700; font-size:18px; margin-top:6px; color:var(--ion-color-primary);"
                  >
                    <span>Total</span><span>₹{{ total | number: '1.2-2' }}</span>
                  </div>

                  <ion-segment [(ngModel)]="paymentMethod" style="margin-top:14px;">
                    <ion-segment-button value="cash"><ion-label>Cash</ion-label></ion-segment-button>
                    <ion-segment-button value="card"><ion-label>Card</ion-label></ion-segment-button>
                    <ion-segment-button value="upi"><ion-label>UPI</ion-label></ion-segment-button>
                    <ion-segment-button value="wallet"><ion-label>Wallet</ion-label></ion-segment-button>
                  </ion-segment>

                  <ion-button
                    expand="block"
                    color="primary"
                    style="margin-top:14px;"
                    [disabled]="cart.length === 0"
                    (click)="checkout()"
                  >
                    <ion-icon slot="start" name="print-outline"></ion-icon>
                    Generate Invoice
                  </ion-button>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </div>
    </ion-content>
  `,
})
export class BillingPage {
  products: Product[] = [];
  cart: CartItem[] = [];
  query = '';
  discount = 0;
  paymentMethod: 'cash' | 'card' | 'upi' | 'wallet' = 'cash';

  constructor(private data: DataService, private toastCtrl: ToastController) {
    this.data.getProducts().subscribe((p) => (this.products = p));
    this.data.getCart().subscribe((c) => (this.cart = c));
  }

  get filtered() {
    const q = this.query.toLowerCase().trim();
    if (!q) return this.products;
    return this.products.filter((p) => p.name.toLowerCase().includes(q));
  }

  get subtotal() {
    return this.cart.reduce((sum, i) => sum + i.product.sellingPrice * i.qty, 0);
  }

  get gstAmount() {
    return this.cart.reduce(
      (sum, i) => sum + (i.product.sellingPrice * i.qty * i.product.gst) / 100,
      0
    );
  }

  get total() {
    return Math.max(0, this.subtotal + this.gstAmount - (this.discount || 0));
  }

  add(p: Product) {
    this.data.addToCart(p);
  }

  inc(item: CartItem) {
    this.data.updateCartQty(item.product.id, item.qty + 1);
  }

  dec(item: CartItem) {
    this.data.updateCartQty(item.product.id, item.qty - 1);
  }

  async checkout() {
    const toast = await this.toastCtrl.create({
      message: `Invoice generated — ₹${this.total.toFixed(2)} paid via ${this.paymentMethod.toUpperCase()}`,
      duration: 2200,
      color: 'primary',
      position: 'bottom',
    });
    await toast.present();
    this.data.clearCart();
    this.discount = 0;
  }

  imgSrc(p: Product) {
    return `assets/products/${p.image || 'default'}.svg`;
  }
}
