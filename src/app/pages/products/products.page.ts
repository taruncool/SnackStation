import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { DataService, Product } from '../../services/data.service';

@Component({
  selector: 'app-product-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar class="ss-toolbar">
        <ion-title>{{ product.id ? 'Edit Product' : 'Add Product' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-item>
        <ion-label position="stacked">Product Name</ion-label>
        <ion-input [(ngModel)]="product.name"></ion-input>
      </ion-item>
      <ion-item>
        <ion-label position="stacked">Category</ion-label>
        <ion-select [(ngModel)]="product.category">
          <ion-select-option *ngFor="let c of categories" [value]="c.name">{{
            c.name
          }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-label position="stacked">SKU</ion-label>
        <ion-input [(ngModel)]="product.sku"></ion-input>
      </ion-item>
      <ion-item>
        <ion-label position="stacked">Cost Price — what it costs to make/stock one unit (₹)</ion-label>
        <ion-input type="number" [(ngModel)]="product.costPrice"></ion-input>
      </ion-item>
      <ion-item>
        <ion-label position="stacked">Selling Price (₹)</ion-label>
        <ion-input type="number" [(ngModel)]="product.sellingPrice"></ion-input>
      </ion-item>
      <ion-item>
        <ion-label position="stacked">GST (%)</ion-label>
        <ion-input type="number" [(ngModel)]="product.gst"></ion-input>
      </ion-item>
      <ion-item>
        <ion-label position="stacked">Stock Qty</ion-label>
        <ion-input type="number" [(ngModel)]="product.stockQty"></ion-input>
      </ion-item>
      <ion-item>
        <ion-label position="stacked">Minimum Stock</ion-label>
        <ion-input type="number" [(ngModel)]="product.minStock"></ion-input>
      </ion-item>
      <ion-item lines="none">
        <ion-label position="stacked">Expiry Date</ion-label>
        <ion-input type="date" [(ngModel)]="product.expiryDate"></ion-input>
      </ion-item>

      <ion-button expand="block" color="primary" style="margin-top:20px;" (click)="save()">
        Save Product
      </ion-button>
    </ion-content>
  `,
})
export class ProductFormModal {
  product: Partial<Product> = {
    category: 'Snacks',
    unit: 'piece',
    status: 'active',
    image: '',
  };
  categories: { name: string }[] = [];

  constructor(private modalCtrl: ModalController, private data: DataService) {
    this.data.getCategories().subscribe((c) => (this.categories = c));
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  save() {
    if (!this.product.name) return;
    if (this.product.id) {
      this.data.updateProduct(this.product as Product);
    } else {
      const id = 'P' + Math.floor(Math.random() * 9000 + 1000);
      this.data.addProduct({ ...(this.product as Product), id });
    }
    this.modalCtrl.dismiss();
  }
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar class="ss-toolbar">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title class="brand-heading" style="font-size:18px;">Products</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="openForm()">
            <ion-icon slot="icon-only" name="add-circle-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          placeholder="Search by name, SKU or scan barcode"
          [(ngModel)]="query"
        ></ion-searchbar>
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
      <div class="ss-container">
        <ion-grid>
          <ion-row>
            <ion-col size="12" size-md="6" size-lg="4" *ngFor="let p of filtered">
              <ion-card class="ss-card" button (click)="openForm(p)">
                <ion-card-content>
                  <div style="display:flex; gap:12px; align-items:start;">
                    <img
                      [src]="imgSrc(p)"
                      [alt]="p.name"
                      style="width:56px; height:56px; border-radius:12px; flex-shrink:0; object-fit:cover;"
                    />
                    <div style="flex:1; display:flex; justify-content:space-between; align-items:start;">
                      <div>
                        <h2 style="margin:0; font-weight:600;">{{ p.name }}</h2>
                        <p style="margin:2px 0; color:var(--ion-color-medium); font-size:13px;">
                          {{ p.category }} · {{ p.sku }}
                        </p>
                        <p style="margin:0; font-weight:700; color:var(--ion-color-primary);">
                          ₹{{ p.sellingPrice }}
                        </p>
                      </div>
                      <ion-badge [color]="p.stockQty <= p.minStock ? 'danger' : 'success'">
                        {{ p.stockQty }} {{ p.unit }}
                      </ion-badge>
                    </div>
                  </div>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
        <p *ngIf="filtered.length === 0" class="ion-text-center" style="color:var(--ion-color-medium);">
          No products found
        </p>
      </div>
    </ion-content>
  `,
  styles: [`
    .ss-cat-filter {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 0 12px 10px;
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .ss-cat-filter::-webkit-scrollbar { display: none; }
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
  `],
})
export class ProductsPage {
  products: Product[] = [];
  query = '';
  categoryOptions: string[] = ['All'];
  selectedCategory = 'All';

  constructor(private data: DataService, private modalCtrl: ModalController) {
    this.data.getProducts().subscribe((p) => (this.products = p));
    this.data.getCategories().subscribe((cats) => {
      this.categoryOptions = ['All', ...cats.map((c) => c.name)];
    });
  }

  get filtered() {
    const q = this.query.toLowerCase().trim();
    return this.products.filter((p) => {
      const matchesCategory = this.selectedCategory === 'All' || p.category === this.selectedCategory;
      const matchesQuery =
        !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }

  async openForm(product?: Product) {
    const modal = await this.modalCtrl.create({
      component: ProductFormModal,
      componentProps: product ? { product: { ...product } } : {},
    });
    await modal.present();
  }

  imgSrc(p: Product) {
    return p.image ? `assets/images/products/${p.image}.jpg` : 'assets/products/default.svg';
  }
}
