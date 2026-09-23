import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IonicModule } from '@ionic/angular';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <ion-app>
      <ion-split-pane contentId="main-content" when="md">
        <!-- Side menu: collapses to a drawer on phone, persistent rail on tablet/desktop -->
        <ion-menu contentId="main-content" type="overlay">
          <ion-header class="ss-toolbar">
            <ion-toolbar class="ss-toolbar">
              <ion-title class="brand-heading" style="font-size:20px;">SnackStation</ion-title>
            </ion-toolbar>
          </ion-header>
          <ion-content>
            <ion-list lines="none">
              <ion-menu-toggle auto-hide="false" *ngFor="let item of navItems">
                <ion-item
                  [routerLink]="item.path"
                  routerLinkActive="selected-item"
                  detail="false"
                >
                  <ion-icon slot="start" [name]="item.icon"></ion-icon>
                  <ion-label>{{ item.label }}</ion-label>
                </ion-item>
              </ion-menu-toggle>
            </ion-list>
          </ion-content>
        </ion-menu>

        <ion-router-outlet id="main-content"></ion-router-outlet>
      </ion-split-pane>
    </ion-app>
  `,
  styles: [
    `
      .selected-item {
        --background: rgba(228, 20, 27, 0.08);
        --color: var(--ion-color-primary);
        font-weight: 600;
      }
    `,
  ],
})
export class AppComponent {
  navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'speedometer-outline' },
    { label: 'Sales Count', path: '/sales-count', icon: 'checkmark-done-circle-outline' },
    { label: 'Products', path: '/products', icon: 'fast-food-outline' },
    { label: 'Categories', path: '/categories', icon: 'grid-outline' },
    { label: 'Customers', path: '/customers', icon: 'people-outline' },
    { label: 'Reports', path: '/reports', icon: 'bar-chart-outline' },
    { label: 'Settings', path: '/settings', icon: 'settings-outline' },
  ];
}
