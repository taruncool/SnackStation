import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-content [fullscreen]="true">
      <div class="login-page">
        <div class="ss-hero login-hero"></div>
        <div class="login-inner">
          <div class="brand">
            <img src="assets/images/snack-station-wordmark.png" alt="Snack Station" class="wordmark" />
            <p class="tagline">Fusion of finger lick-in snacks</p>
          </div>

          <ion-card class="ss-card login-card">
            <ion-card-content>
              <h2 class="card-title">Login with PIN</h2>
              <ion-item class="pin-item" [class.has-error]="!!error" [class.filled]="pin.length > 0">
                <ion-icon slot="start" name="keypad-outline" color="primary"></ion-icon>
                <ion-input
                  type="password"
                  inputmode="numeric"
                  maxlength="4"
                  placeholder="4-digit PIN"
                  aria-label="4-digit PIN"
                  [(ngModel)]="pin"
                  (ionInput)="onPinInput()"
                  (keyup.enter)="login()"
                ></ion-input>
              </ion-item>
              <p class="error" *ngIf="error" role="alert">{{ error }}</p>

              <ion-item lines="none" style="--min-height:36px;">
                <ion-checkbox slot="start" [(ngModel)]="rememberMe"></ion-checkbox>
                <ion-label>Remember me</ion-label>
              </ion-item>

              <ion-button
                expand="block"
                color="primary"
                style="margin-top:8px;"
                [disabled]="pin.length !== 4 || loading"
                (click)="login()"
              >
                <ion-spinner *ngIf="loading" name="dots" style="margin-right:8px;"></ion-spinner>
                {{ loading ? 'Checking…' : 'Login' }}
              </ion-button>
            </ion-card-content>
          </ion-card>
          <!-- Same height as .brand, so the card itself sits at the vertical centre -->
          <div class="brand-balance" aria-hidden="true"></div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [
    `
      /* Red band behind the logo; the logo + card sit centred on the page. */
      .login-page {
        position: relative;
        min-height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px 20px;
        box-sizing: border-box;
      }
      .login-hero {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 46%;
        border-radius: 0;
        padding: 0;
      }
      .login-inner {
        position: relative;
        width: 100%;
        max-width: 420px;
      }
      .brand {
        text-align: center;
        margin-bottom: 44px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
      }
      .brand-balance {
        margin-top: 20px;
      }
      .wordmark {
        width: 150px;
        height: auto;
        display: block;
        margin: 0 auto 10px;
      }
      .tagline {
        color: var(--ion-color-secondary);
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }
      .login-card {
        margin: 0;
      }
      .brand,
      .brand-balance {
        min-height: 150px;
      }
      .login-card ion-card-content {
        padding: 24px 20px 28px;
      }
      .login-card ion-item {
        --min-height: 52px;
      }
      .card-title {
        margin: 0 0 12px;
        font-size: 18px;
        font-weight: 700;
        text-align: center;
      }
      .pin-item ion-input {
        font-size: 18px;
      }
      /* Spread the PIN dots out, but not the placeholder text. */
      .pin-item.filled ion-input {
        font-size: 22px;
        letter-spacing: 8px;
      }
      .pin-item.has-error {
        --border-color: var(--ion-color-danger);
      }
      .error {
        color: var(--ion-color-danger);
        font-size: 13px;
        margin: 6px 0 0;
      }
      .login-card ion-button {
        --padding-top: 14px;
        --padding-bottom: 14px;
        min-height: 48px;
      }
    `,
  ],
})
export class LoginPage {
  pin = '';
  rememberMe = true;
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  onPinInput() {
    this.pin = this.pin.replace(/\D/g, '').slice(0, 4);
    this.error = '';
  }

  async login() {
    if (this.pin.length !== 4 || this.loading) return;
    this.loading = true;
    this.error = '';
    try {
      await this.auth.login(this.pin, this.rememberMe);
      this.pin = '';
      this.router.navigateByUrl('/dashboard', { replaceUrl: true });
    } catch (err: any) {
      this.error = err?.message || 'Login failed';
      this.pin = '';
    } finally {
      this.loading = false;
    }
  }
}
