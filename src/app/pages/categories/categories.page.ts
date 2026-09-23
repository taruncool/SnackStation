import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { DataService, Category } from '../../services/data.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar class="ss-toolbar">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title class="brand-heading" style="font-size:18px;">Categories</ion-title>
        <ion-buttons slot="end">
          <ion-button>
            <ion-icon slot="icon-only" name="add-circle-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="ss-container">
        <ion-grid>
          <ion-row>
            <ion-col size="6" size-md="4" size-lg="3" *ngFor="let c of categories">
              <ion-card class="ss-card ion-text-center" button>
                <ion-card-content>
                  <ion-icon [name]="c.icon" style="font-size:32px;" color="primary"></ion-icon>
                  <h3 style="margin:8px 0 2px; font-weight:600;">{{ c.name }}</h3>
                  <p style="margin:0; color:var(--ion-color-medium); font-size:13px;">
                    {{ c.productCount }} items
                  </p>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </div>
    </ion-content>
  `,
})
export class CategoriesPage {
  categories: Category[] = [];
  constructor(private data: DataService) {
    this.data.getCategories().subscribe((c) => (this.categories = c));
  }
}
