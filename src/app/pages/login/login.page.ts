import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-content [fullscreen]="true">
      <div class="ss-hero" style="border-radius:0; padding:40px 24px 60px;">
        <h1 class="brand-heading" style="font-size:34px; margin:0;">SNACK</h1>
        <h1 class="brand-heading" style="font-size:34px; margin:0 0 6px;">STATION</h1>
        <p style="color:#fff; opacity:0.9; margin:0;">Smart Food Shop Management</p>
      </div>

      <div style="max-width:420px; margin: -30px auto 0; padding: 0 20px 20px;">
        <ion-card class="ss-card">
          <ion-card-content>
            <ion-segment [(ngModel)]="loginMode" value="mobile">
              <ion-segment-button value="mobile">
                <ion-label>Mobile</ion-label>
              </ion-segment-button>
              <ion-segment-button value="email">
                <ion-label>Email</ion-label>
              </ion-segment-button>
              <ion-segment-button value="pin">
                <ion-label>PIN</ion-label>
              </ion-segment-button>
            </ion-segment>

            <ion-item *ngIf="loginMode === 'mobile'" style="margin-top:16px;">
              <ion-icon slot="start" name="call-outline" color="primary"></ion-icon>
              <ion-input type="tel" placeholder="Mobile number" [(ngModel)]="mobile"></ion-input>
            </ion-item>

            <ion-item *ngIf="loginMode === 'email'" style="margin-top:16px;">
              <ion-icon slot="start" name="mail-outline" color="primary"></ion-icon>
              <ion-input type="email" placeholder="Email address" [(ngModel)]="email"></ion-input>
            </ion-item>

            <ion-item *ngIf="loginMode === 'pin'" style="margin-top:16px;">
              <ion-icon slot="start" name="keypad-outline" color="primary"></ion-icon>
              <ion-input type="password" placeholder="4-digit PIN" maxlength="4" [(ngModel)]="pin"></ion-input>
            </ion-item>

            <ion-item lines="none" style="--min-height:36px;">
              <ion-checkbox slot="start" [(ngModel)]="rememberMe"></ion-checkbox>
              <ion-label>Remember me</ion-label>
            </ion-item>

            <ion-button expand="block" color="primary" style="margin-top:8px;" (click)="login()">
              Login
            </ion-button>
            <ion-button expand="block" fill="outline" color="primary">
              <ion-icon slot="start" name="finger-print-outline"></ion-icon>
              Biometric Login
            </ion-button>
          </ion-card-content>
        </ion-card>
        <p style="text-align:center; color:var(--ion-color-medium); font-size:12px;">
          Static demo data — role: Admin
        </p>
      </div>
    </ion-content>
  `,
})
export class LoginPage {
  loginMode: 'mobile' | 'email' | 'pin' = 'mobile';
  mobile = '';
  email = '';
  pin = '';
  rememberMe = true;

  constructor(private router: Router) {}

  login() {
    // Static demo: any input logs in as Admin against local JSON data.
    this.router.navigateByUrl('/dashboard');
  }
}
