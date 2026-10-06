import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IonicModule, MenuController } from '@ionic/angular';
import { AppUser, AuthService } from './services/auth.service';

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
      <ion-split-pane contentId="main-content" when="md" [disabled]="!user">
        <!-- Side menu: collapses to a drawer on phone, persistent rail on tablet/desktop -->
        <ion-menu contentId="main-content" type="overlay" [disabled]="!user">
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
          <ion-footer *ngIf="user" class="menu-footer">
            <ion-item lines="none">
              <ion-icon slot="start" name="person-circle-outline" color="primary"></ion-icon>
              <ion-label>
                <h3 style="font-weight:600;">{{ user.name }}</h3>
                <p style="text-transform:capitalize;">{{ user.role }}</p>
              </ion-label>
              <ion-button slot="end" fill="clear" color="medium" (click)="logout()" aria-label="Logout">
                <ion-icon slot="start" name="log-out-outline"></ion-icon>
                Logout
              </ion-button>
            </ion-item>
          </ion-footer>
        </ion-menu>

        <ion-router-outlet id="main-content"></ion-router-outlet>
      </ion-split-pane>
    </ion-app>
  `,
  styles: [
    `
      .menu-footer {
        border-top: 1px solid var(--ion-color-light-shade, #ddd);
      }
      .selected-item {
        --background: rgba(228, 20, 27, 0.08);
        --color: var(--ion-color-primary);
        font-weight: 600;
      }
    `,
  ],
})
export class AppComponent {
  user: AppUser | null = null;

  constructor(private auth: AuthService, private router: Router, private menu: MenuController) {
    this.auth.getUser().subscribe((u) => (this.user = u));
  }

  async logout() {
    await this.menu.close();
    this.auth.logout();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'speedometer-outline' },
    { label: 'Sales Count', path: '/sales-count', icon: 'checkmark-done-circle-outline' },
    { label: 'Billing', path: '/billing', icon: 'receipt-outline' },
    { label: 'Products', path: '/products', icon: 'fast-food-outline' },
    { label: 'Categories', path: '/categories', icon: 'grid-outline' },
    { label: 'Customers', path: '/customers', icon: 'people-outline' },
    { label: 'Reports', path: '/reports', icon: 'bar-chart-outline' },
    { label: 'Inventory', path: '/inventory', icon: 'cube-outline' },
    { label: 'Settings', path: '/settings', icon: 'settings-outline' },
  ];
}
