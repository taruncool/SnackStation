import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonicModule,
  IonContent,
  AlertController,
  LoadingController,
  ModalController,
  ToastController,
} from '@ionic/angular';
import { Bill, CartItem, DataService, Product, localDateKey } from '../../services/data.service';
import { PairedPrinter, PrinterService, PrinterSettings, SHOP, formatDateTime } from '../../services/printer.service';

/** Printer choice + paper width, remembered per device. */
@Component({
  selector: 'app-printer-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar class="ss-toolbar">
        <ion-title>Printer</ion-title>
        <ion-buttons slot="end"><ion-button (click)="dismiss()">Close</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ng-container *ngIf="!printer.isNative">
        <p>
          In a browser, bills print through the normal print dialog — pick your printer there. Bluetooth
          receipt printers are used from the Android app.
        </p>
      </ng-container>

      <ng-container *ngIf="printer.isNative">
        <p style="color:var(--ion-color-medium); margin-top:0;">
          Pair the printer first in the phone's Bluetooth settings, then pick it here.
        </p>
        <ion-list lines="full">
          <ion-radio-group [(ngModel)]="selected">
            <ion-item *ngFor="let d of devices">
              <ion-radio [value]="d.address" justify="space-between">
                {{ d.name }}
                <p style="margin:0; font-size:12px; color:var(--ion-color-medium);">{{ d.address }}</p>
              </ion-radio>
            </ion-item>
          </ion-radio-group>
          <ion-item *ngIf="!loading && devices.length === 0 && !error">
            <ion-label color="medium">No paired Bluetooth devices found.</ion-label>
          </ion-item>
        </ion-list>
        <div *ngIf="loading" class="ion-text-center" style="padding:16px;">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
        </div>
        <p *ngIf="error" style="color:var(--ion-color-danger);">{{ error }}</p>
        <ion-button fill="clear" size="small" (click)="load()">
          <ion-icon slot="start" name="refresh-outline"></ion-icon> Refresh list
        </ion-button>

        <h3 style="font-size:15px; margin:18px 0 8px;">Paper width</h3>
        <ion-segment [(ngModel)]="paperWidth">
          <ion-segment-button [value]="58"><ion-label>58 mm</ion-label></ion-segment-button>
          <ion-segment-button [value]="80"><ion-label>80 mm</ion-label></ion-segment-button>
        </ion-segment>

        <ion-button expand="block" style="margin-top:20px;" [disabled]="!selected" (click)="save()">
          Save printer
        </ion-button>
        <ion-button expand="block" fill="outline" [disabled]="!selected || testing" (click)="test()">
          <ion-spinner *ngIf="testing" name="dots" style="margin-right:8px;"></ion-spinner>
          Print test page
        </ion-button>
      </ng-container>
    </ion-content>
  `,
})
export class PrinterSettingsModal implements OnInit {
  devices: PairedPrinter[] = [];
  selected = '';
  paperWidth: 58 | 80 = 58;
  loading = false;
  testing = false;
  error = '';

  constructor(
    public printer: PrinterService,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    const saved = this.printer.getSettings();
    if (saved) {
      this.selected = saved.address;
      this.paperWidth = saved.paperWidth;
    }
    if (this.printer.isNative) this.load();
  }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      this.devices = await this.printer.listPaired();
    } catch (err: any) {
      this.error = err?.message || String(err);
    }
    this.loading = false;
  }

  private current(): PrinterSettings {
    const d = this.devices.find((x) => x.address === this.selected);
    return { address: this.selected, name: d?.name || this.selected, paperWidth: Number(this.paperWidth) as 58 | 80 };
  }

  async save() {
    this.printer.saveSettings(this.current());
    const toast = await this.toastCtrl.create({ message: 'Printer saved.', duration: 1500, color: 'primary' });
    await toast.present();
    this.modalCtrl.dismiss(true);
  }

  async test() {
    this.testing = true;
    try {
      await this.printer.printTest(this.current());
    } catch (err: any) {
      const toast = await this.toastCtrl.create({
        message: err?.message || String(err),
        duration: 4000,
        color: 'danger',
      });
      await toast.present();
    }
    this.testing = false;
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}

/** A saved bill — preview plus Print / Reprint. */
@Component({
  selector: 'app-bill-receipt-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar class="ss-toolbar">
        <ion-title>Bill {{ bill.id }}</ion-title>
        <ion-buttons slot="end"><ion-button (click)="dismiss()">Close</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div *ngIf="warning" class="ss-card" style="padding:10px 12px; margin-bottom:12px; color:var(--ion-color-danger); font-size:13px;">
        {{ warning }}
      </div>
      <div class="ss-card receipt">
        <img class="logo" [src]="shop.logo" alt="Snack Station" />
        <div class="shop">{{ shop.name }}</div>
        <div class="c" *ngFor="let line of shop.addressLines">{{ line }}</div>
        <hr />
        <div>Bill No : {{ bill.id }}</div>
        <div>Date : {{ dateTime }}</div>
        <div *ngIf="customerLine">Customer : {{ customerLine }}</div>
        <hr />
        <div class="grid head"><span class="name">Item</span><span>Qty</span><span>Price</span><span>Total</span></div>
        <hr />
        <div class="grid" *ngFor="let i of bill.items">
          <span class="name">{{ i.name }}</span>
          <span>{{ i.qty }}</span>
          <span>{{ i.price | number: '1.2-2' }}</span>
          <span>{{ i.qty * i.price | number: '1.2-2' }}</span>
        </div>
        <hr />
        <div class="row"><span class="name">Subtotal</span><span class="amt">{{ bill.subtotal | number: '1.2-2' }}</span></div>
        <div class="row">
          <span class="name">Discount{{ bill.discountPercent ? ' (' + bill.discountPercent + '%)' : '' }}</span>
          <span class="amt">{{ bill.discount > 0 ? '-' : '' }}{{ bill.discount | number: '1.2-2' }}</span>
        </div>
        <hr />
        <div class="row total"><span class="name">GRAND TOTAL</span><span class="amt">₹{{ bill.total | number: '1.2-2' }}</span></div>
        <div class="row"><span class="name">Paid by</span><span class="amt">{{ bill.paymentMethod | uppercase }}</span></div>
        <hr />
        <div class="c"><strong>{{ shop.footer[0] }}</strong></div>
        <div class="c" *ngFor="let line of shop.footer.slice(1)">{{ line }}</div>
      </div>

      <ion-button expand="block" style="margin-top:16px;" [disabled]="printing" (click)="print()">
        <ion-spinner *ngIf="printing" name="dots" style="margin-right:8px;"></ion-spinner>
        <ion-icon *ngIf="!printing" slot="start" name="print-outline"></ion-icon>
        {{ printedOnce ? 'Reprint' : 'Print bill' }}
      </ion-button>
      <ion-button *ngIf="newBillButton" expand="block" fill="outline" (click)="dismiss()">
        <ion-icon slot="start" name="add-outline"></ion-icon> New bill
      </ion-button>
    </ion-content>
  `,
  styles: [
    `
      .receipt { padding: 16px; font-size: 13px; line-height: 1.5; overflow-wrap: anywhere; }
      .logo { width: 72px; height: 72px; display: block; margin: 0 auto 6px; }
      .shop { text-align: center; font-weight: 700; font-size: 18px; }
      .c { text-align: center; }
      hr { border: 0; border-top: 1px dashed var(--ion-color-medium); margin: 8px 0; }
      .grid { display: grid; grid-template-columns: minmax(0, 1fr) 28px 56px 64px; gap: 6px; }
      .grid span:not(.name) { text-align: right; white-space: nowrap; }
      .grid .name { overflow-wrap: anywhere; }
      .grid.head { font-weight: 700; }
      .row { display: flex; gap: 8px; }
      .row .name { flex: 1; min-width: 0; }
      .row .amt { white-space: nowrap; text-align: right; }
      .total { font-weight: 700; font-size: 16px; color: var(--ion-color-primary); }
    `,
  ],
})
export class BillReceiptModal implements OnInit {
  @Input() bill!: Bill;
  @Input() autoPrint = false;
  @Input() newBillButton = false;
  @Input() warning = '';
  printing = false;
  printedOnce = false;

  constructor(
    private printer: PrinterService,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    if (this.autoPrint) this.print();
  }

  readonly shop = SHOP;

  get customerLine() {
    return [this.bill.customerName, this.bill.customerPhone].filter(Boolean).join(' ');
  }

  get dateTime() {
    return formatDateTime(this.bill.createdAt);
  }

  async print() {
    if (this.printer.isNative && !this.printer.getSettings()) {
      const modal = await this.modalCtrl.create({ component: PrinterSettingsModal });
      await modal.present();
      const { data: saved } = await modal.onDidDismiss();
      if (!saved) return;
    }
    this.printing = true;
    try {
      await this.printer.printBill(this.bill);
      this.printedOnce = true;
    } catch (err: any) {
      const toast = await this.toastCtrl.create({
        message: err?.message || String(err),
        duration: 5000,
        color: 'danger',
      });
      await toast.present();
    }
    this.printing = false;
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}

/** Today's bills from the Bills tab, newest first — tap one to reprint. */
@Component({
  selector: 'app-bills-history-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar class="ss-toolbar">
        <ion-title>Today's Bills</ion-title>
        <ion-buttons slot="end"><ion-button (click)="dismiss()">Close</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div *ngIf="status === 'loading'" class="ion-text-center" style="padding:40px 0;">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
      </div>
      <div *ngIf="status === 'error'" class="ion-text-center" style="padding:24px;">
        <p style="color:var(--ion-color-danger);">Couldn't load bills.</p>
        <ion-button size="small" (click)="data.refreshBills()">Retry</ion-button>
      </div>
      <ng-container *ngIf="status === 'loaded'">
        <div class="ss-card" style="padding:12px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between;">
            <span>{{ todays.length }} bill{{ todays.length === 1 ? '' : 's' }}</span>
            <strong style="color:var(--ion-color-primary);">₹{{ todaysTotal | number: '1.2-2' }}</strong>
          </div>
          <div *ngIf="todaysDiscount > 0" style="display:flex; justify-content:space-between; font-size:13px; color:var(--ion-color-medium); margin-top:4px;">
            <span>Discounts given</span><span>₹{{ todaysDiscount | number: '1.2-2' }}</span>
          </div>
        </div>
        <ion-list lines="full">
          <ion-item button *ngFor="let b of todays" (click)="open(b)">
            <ion-label>
              <h2 style="font-weight:600;">{{ b.id }}</h2>
              <p>{{ b.createdAt | date: 'hh:mm a' }} · {{ b.customerName || 'Walk-in' }} · {{ b.itemCount }} items · {{ b.paymentMethod | uppercase }}</p>
              <p *ngIf="b.discount > 0" style="font-size:12px;">
                Discount{{ b.discountPercent ? ' ' + b.discountPercent + '%' : '' }}: ₹{{ b.discount | number: '1.2-2' }}
              </p>
            </ion-label>
            <ion-note slot="end" style="font-weight:700;">₹{{ b.total | number: '1.2-2' }}</ion-note>
          </ion-item>
        </ion-list>
        <p *ngIf="todays.length === 0" class="ion-text-center" style="color:var(--ion-color-medium);">
          No bills yet today.
        </p>
      </ng-container>
    </ion-content>
  `,
})
export class BillsHistoryModal {
  bills: Bill[] = [];
  status: 'loading' | 'loaded' | 'error' = 'loading';

  constructor(public data: DataService, private modalCtrl: ModalController) {
    this.data.getBills().subscribe((b) => (this.bills = b));
    this.data.getBillsStatus().subscribe((s) => (this.status = s));
    this.data.refreshBills();
  }

  get todays() {
    const today = localDateKey();
    return this.bills.filter((b) => b.date === today);
  }

  get todaysTotal() {
    return this.todays.reduce((sum, b) => sum + b.total, 0);
  }

  get todaysDiscount() {
    return this.todays.reduce((sum, b) => sum + b.discount, 0);
  }

  async open(bill: Bill) {
    const modal = await this.modalCtrl.create({ component: BillReceiptModal, componentProps: { bill } });
    await modal.present();
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}

type DiscountMode = 0 | 5 | 10 | 15 | 20 | 'custom';

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
        <ion-buttons slot="end">
          <ion-button (click)="openHistory()" aria-label="Today's bills">
            <ion-icon slot="icon-only" name="receipt-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="openPrinter()" aria-label="Printer settings">
            <ion-icon slot="icon-only" name="print-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar placeholder="Search product" [(ngModel)]="query"></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="ss-container" style="padding:10px;">
        <div *ngIf="productsStatus === 'loading'" class="ion-text-center" style="padding:40px 0;">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <p style="color:var(--ion-color-medium); margin-top:12px;">Loading products…</p>
        </div>
        <div *ngIf="productsStatus === 'error'" class="ion-text-center" style="padding:40px 16px;">
          <p style="color:var(--ion-color-danger); margin:0 0 12px;">
            Couldn't load products — check your connection and try again.
          </p>
          <ion-button size="small" (click)="data.refreshProducts()">Retry</ion-button>
        </div>

        <ion-grid *ngIf="productsStatus === 'loaded'" style="padding:0;">
          <ion-row>
            <!-- Product picker -->
            <ion-col size="12" size-md="7">
              <ion-row>
                <ion-col size="6" size-lg="4" *ngFor="let p of filtered">
                  <!-- Same controls as Sales Count: left half removes one, right half adds one -->
                  <ion-card class="ss-card" style="position:relative; margin:4px;">
                    <div *ngIf="qtyInCart(p) as q" class="ss-count-badge">{{ q }}</div>
                    <ion-card-content style="padding:12px; text-align:center;">
                      <div style="position:relative;">
                        <ion-icon name="remove-circle-outline" class="ss-zone-hint ss-zone-hint-left"></ion-icon>
                        <ion-icon name="add-circle" class="ss-zone-hint ss-zone-hint-right"></ion-icon>
                        <img
                          [src]="imgSrc(p)"
                          [alt]="p.name"
                          style="width:44px; height:44px; border-radius:10px; object-fit:cover; margin-bottom:2px;"
                        />
                        <h3 style="margin:4px 0 2px; font-size:14px; font-weight:600;">{{ p.name }}</h3>
                        <p style="margin:0 0 2px; font-size:12px; color:var(--ion-color-medium);">{{ p.category }}</p>
                        <p style="margin:0 0 8px; font-size:13px; font-weight:600; color:var(--ion-color-primary);">
                          ₹{{ p.sellingPrice }}
                        </p>
                        <div class="ss-tap-overlay">
                          <div class="ss-tap-zone" (click)="removeOne(p, $event)"></div>
                          <div class="ss-tap-zone" (click)="addOne(p, $event)"></div>
                        </div>
                      </div>
                    </ion-card-content>
                  </ion-card>
                </ion-col>
              </ion-row>
              <p *ngIf="filtered.length === 0" class="ion-text-center" style="color:var(--ion-color-medium);">
                No active products found
              </p>
            </ion-col>

            <!-- Current bill -->
            <ion-col size="12" size-md="5">
              <ion-card #billCard class="ss-card" style="margin:4px;">
                <ion-card-header>
                  <ion-card-title style="font-size:16px;">Current Bill</ion-card-title>
                </ion-card-header>
                <ion-list lines="full">
                  <ion-item *ngFor="let item of cart">
                    <ion-label>
                      {{ item.product.name }}
                      <p>₹{{ item.product.sellingPrice }} × {{ item.qty }} = ₹{{ item.product.sellingPrice * item.qty }}</p>
                    </ion-label>
                    <ion-buttons slot="end">
                      <ion-button size="small" (click)="dec(item)" aria-label="Remove one">
                        <ion-icon name="remove-circle-outline"></ion-icon>
                      </ion-button>
                      <ion-note style="min-width:18px; text-align:center;">{{ item.qty }}</ion-note>
                      <ion-button size="small" (click)="inc(item)" aria-label="Add one">
                        <ion-icon name="add-circle-outline"></ion-icon>
                      </ion-button>
                    </ion-buttons>
                  </ion-item>
                  <ion-item *ngIf="cart.length === 0">
                    <ion-label color="medium">Tap a product to add it to the bill</ion-label>
                  </ion-item>
                </ion-list>

                <ion-item lines="full">
                  <ion-input label="Customer name" labelPlacement="stacked" placeholder="Optional" [(ngModel)]="customerName"></ion-input>
                </ion-item>
                <ion-item lines="full">
                  <ion-input
                    label="Phone"
                    labelPlacement="stacked"
                    type="tel"
                    inputmode="tel"
                    maxlength="15"
                    placeholder="Optional"
                    [(ngModel)]="customerPhone"
                  ></ion-input>
                </ion-item>
                <div class="discount-picker">
                  <div class="discount-label">Discount</div>
                  <div class="discount-chips">
                    <button
                      type="button"
                      *ngFor="let opt of discountOptions"
                      class="chip"
                      [class.active]="discountMode === opt.value"
                      [attr.aria-pressed]="discountMode === opt.value"
                      (click)="setDiscount(opt.value)"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                  <ion-item *ngIf="discountMode === 'custom'" lines="none" class="custom-discount">
                    <ion-input
                      label="Discount amount (₹)"
                      labelPlacement="stacked"
                      type="number"
                      inputmode="decimal"
                      min="0"
                      placeholder="0"
                      [(ngModel)]="customDiscount"
                    ></ion-input>
                  </ion-item>
                </div>

                <ion-card-content>
                  <div style="display:flex; justify-content:space-between;">
                    <span>Subtotal</span><span>₹{{ subtotal | number: '1.2-2' }}</span>
                  </div>
                  <div *ngIf="appliedDiscount > 0" style="display:flex; justify-content:space-between; color:var(--ion-color-success, #2dd36f);">
                    <span>Discount{{ discountPercent ? ' (' + discountPercent + '%)' : '' }}</span>
                    <span>- ₹{{ appliedDiscount | number: '1.2-2' }}</span>
                  </div>
                  <div
                    style="display:flex; justify-content:space-between; font-weight:700; font-size:18px; margin-top:6px; color:var(--ion-color-primary);"
                  >
                    <span>Total</span><span>₹{{ total | number: '1.2-2' }}</span>
                  </div>

                  <ion-segment [(ngModel)]="paymentMethod" style="margin-top:14px;">
                    <ion-segment-button value="cash"><ion-label>Cash</ion-label></ion-segment-button>
                    <ion-segment-button value="upi"><ion-label>UPI</ion-label></ion-segment-button>
                    <ion-segment-button value="card"><ion-label>Card</ion-label></ion-segment-button>
                  </ion-segment>

                  <ion-button fill="clear" size="small" color="medium" style="margin-top:8px;" [disabled]="cart.length === 0" (click)="confirmClear()">
                    Clear bill
                  </ion-button>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </div>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <div style="display:flex; gap:8px; margin:8px;">
        <ion-button
          class="view-bill"
          fill="outline"
          [disabled]="cart.length === 0"
          (click)="scrollToBill()"
        >
          View bill ({{ itemCount }})
        </ion-button>
        <ion-button
          expand="block"
          color="primary"
          style="flex:1; margin:0;"
          [disabled]="cart.length === 0 || submitting || productsStatus !== 'loaded'"
          (click)="submit()"
        >
          <ion-spinner *ngIf="submitting" name="dots" style="margin-right:8px;"></ion-spinner>
          <ion-icon *ngIf="!submitting" slot="start" name="receipt-outline"></ion-icon>
          {{ submitting ? 'Saving bill…' : 'Submit · ₹' + (total | number: '1.2-2') }}
        </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [
    `
      .view-bill { margin: 0; }
      .ss-tap-overlay { position: absolute; inset: 0; display: flex; }
      .ss-tap-zone { flex: 1; cursor: pointer; }
      .ss-zone-hint { position: absolute; top: 2px; font-size: 14px; opacity: 0.3; pointer-events: none; }
      .ss-zone-hint-left { left: 2px; color: var(--ion-color-medium); }
      .ss-zone-hint-right { right: 2px; color: var(--ion-color-primary); }
      .discount-picker { padding: 10px 16px 0; }
      .discount-label { font-size: 12px; color: var(--ion-color-medium); margin-bottom: 4px; }
      .discount-chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .chip {
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        padding: 6px 12px;
        border-radius: 16px;
        border: 1px solid var(--ion-color-medium);
        background: transparent;
        color: var(--ion-text-color, #222);
        cursor: pointer;
      }
      .chip.active {
        background: var(--ion-color-primary);
        border-color: var(--ion-color-primary);
        color: var(--ion-color-primary-contrast);
      }
      .custom-discount { --padding-start: 0; }
      /* On tablet/desktop the bill sits beside the products already. */
      @media (min-width: 768px) {
        .view-bill { display: none; }
      }
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
      }
    `,
  ],
})
export class BillingPage {
  @ViewChild(IonContent) content?: IonContent;
  @ViewChild('billCard', { read: ElementRef }) billCard?: ElementRef<HTMLElement>;
  products: Product[] = [];
  cart: CartItem[] = [];
  query = '';
  customerName = '';
  customerPhone = '';
  readonly discountOptions: { label: string; value: DiscountMode }[] = [
    { label: 'None', value: 0 },
    { label: '5%', value: 5 },
    { label: '10%', value: 10 },
    { label: '15%', value: 15 },
    { label: '20%', value: 20 },
    { label: '₹ Custom', value: 'custom' },
  ];
  discountMode: DiscountMode = 0;
  customDiscount: number | null = null;
  paymentMethod: 'cash' | 'upi' | 'card' = 'cash';
  submitting = false;
  productsStatus: 'loading' | 'loaded' | 'error' = 'loading';

  constructor(
    public data: DataService,
    private printer: PrinterService,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController
  ) {
    this.data.getProducts().subscribe((p) => (this.products = p.filter((x) => x.status === 'active')));
    this.data.getProductsStatus().subscribe((s) => (this.productsStatus = s));
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

  /** The % picked (5/10/15/20), or 0 for none / a custom ₹ amount. */
  get discountPercent() {
    return typeof this.discountMode === 'number' ? this.discountMode : 0;
  }

  /** Rupees off: a % of the current subtotal (so it follows cart changes)
   *  or the custom amount, never more than the subtotal. */
  get appliedDiscount() {
    const raw =
      this.discountMode === 'custom'
        ? Number(this.customDiscount) || 0
        : (this.subtotal * this.discountMode) / 100;
    return Math.round(Math.min(Math.max(0, raw), this.subtotal) * 100) / 100;
  }

  setDiscount(mode: DiscountMode) {
    this.discountMode = mode;
    if (mode !== 'custom') this.customDiscount = null;
  }

  get total() {
    return this.subtotal - this.appliedDiscount;
  }

  get itemCount() {
    return this.cart.reduce((sum, i) => sum + i.qty, 0);
  }

  async scrollToBill() {
    const el = this.billCard?.nativeElement;
    if (!el || !this.content) return;
    const scroller = await this.content.getScrollElement();
    const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 8;
    this.content.scrollToPoint(0, top, 300);
  }

  qtyInCart(p: Product) {
    return this.cart.find((i) => i.product.id === p.id)?.qty || 0;
  }

  addOne(p: Product, ev?: Event) {
    ev?.stopPropagation();
    this.data.addToCart(p);
  }

  /** Nothing is saved until Submit, so taking one off needs no confirmation. */
  removeOne(p: Product, ev?: Event) {
    ev?.stopPropagation();
    const q = this.qtyInCart(p);
    if (q) this.data.updateCartQty(p.id, q - 1);
  }

  inc(item: CartItem) {
    this.data.updateCartQty(item.product.id, item.qty + 1);
  }

  dec(item: CartItem) {
    this.data.updateCartQty(item.product.id, item.qty - 1);
  }

  async confirmClear() {
    const alert = await this.alertCtrl.create({
      header: 'Clear this bill?',
      message: 'All items, customer details and the discount will be removed.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Clear', role: 'destructive', handler: () => this.resetBill() },
      ],
    });
    await alert.present();
  }

  async submit() {
    if (this.submitting || this.cart.length === 0) return;
    this.submitting = true;
    const loader = await this.loadingCtrl.create({
      message: 'Saving bill…',
      spinner: 'crescent',
      backdropDismiss: false,
    });
    await loader.present();
    // Slow Apps Script replies are normal — say so, so it doesn't look stuck.
    const slowTimer = setTimeout(() => (loader.message = 'Confirming with Google Sheets…'), 6000);
    try {
      const result = await this.data.submitBill({
        items: this.cart,
        customerName: this.customerName,
        customerPhone: this.customerPhone,
        discountPercent: this.discountPercent,
        discount: this.appliedDiscount,
        paymentMethod: this.paymentMethod,
      });
      clearTimeout(slowTimer);
      await loader.dismiss();
      if (result.status === 'failed') {
        const toast = await this.toastCtrl.create({
          message: `Bill not saved — ${result.reason || 'check your connection or Google Sheets setup.'}`,
          duration: 8000,
          color: 'danger',
        });
        await toast.present();
        return;
      }
      this.resetBill();
      const modal = await this.modalCtrl.create({
        component: BillReceiptModal,
        componentProps: {
          bill: result.bill,
          newBillButton: true,
          // Print straight away when a printer is set up (or in a browser).
          autoPrint: !this.printer.isNative || !!this.printer.getSettings(),
          warning: result.billRecordSaved
            ? ''
            : "The sale is recorded in today's sales, but this bill couldn't be saved to the Bills list, so it won't appear under Today's Bills.",
        },
      });
      await modal.present();
    } catch (err) {
      console.error('Submitting bill failed', err);
      clearTimeout(slowTimer);
      await loader.dismiss().catch(() => {});
    } finally {
      this.submitting = false;
    }
  }

  async openHistory() {
    const modal = await this.modalCtrl.create({ component: BillsHistoryModal });
    await modal.present();
  }

  async openPrinter() {
    const modal = await this.modalCtrl.create({ component: PrinterSettingsModal });
    await modal.present();
  }

  private resetBill() {
    this.data.clearCart();
    this.customerName = '';
    this.customerPhone = '';
    this.discountMode = 0;
    this.customDiscount = null;
    this.paymentMethod = 'cash';
  }

  imgSrc(p: Product) {
    return p.image ? `assets/images/products/${p.image}.jpg` : 'assets/products/default.svg';
  }
}
