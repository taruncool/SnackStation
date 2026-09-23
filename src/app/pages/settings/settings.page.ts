import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar class="ss-toolbar">
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title class="brand-heading" style="font-size:18px;">Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="ss-container">
        <ion-list-header>Shop</ion-list-header>
        <ion-item>
          <ion-label position="stacked">Shop Name</ion-label>
          <ion-input value="SnackStation"></ion-input>
        </ion-item>
        <ion-item>
          <ion-label position="stacked">GST Number</ion-label>
          <ion-input placeholder="22AAAAA0000A1Z5"></ion-input>
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Currency</ion-label>
          <ion-select value="inr">
            <ion-select-option value="inr">₹ INR</ion-select-option>
            <ion-select-option value="usd">$ USD</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-list-header>Preferences</ion-list-header>
        <ion-item>
          <ion-icon slot="start" name="moon-outline"></ion-icon>
          <ion-label>Dark Mode</ion-label>
          <ion-toggle [(ngModel)]="darkMode" (ionChange)="toggleDark()"></ion-toggle>
        </ion-item>
        <ion-item>
          <ion-icon slot="start" name="notifications-outline"></ion-icon>
          <ion-label>Push Notifications</ion-label>
          <ion-toggle [ngModel]="true"></ion-toggle>
        </ion-item>
        <ion-item>
          <ion-icon slot="start" name="print-outline"></ion-icon>
          <ion-label>Bluetooth Printer</ion-label>
          <ion-note slot="end">Not connected</ion-note>
        </ion-item>

        <ion-list-header>Data & Backup</ion-list-header>
        <ion-item button detail="true">
          <ion-icon slot="start" name="cloud-upload-outline"></ion-icon>
          <ion-label>Backup to Google Drive</ion-label>
        </ion-item>
        <ion-item button detail="true">
          <ion-icon slot="start" name="cloud-download-outline"></ion-icon>
          <ion-label>Restore Data</ion-label>
        </ion-item>

        <ion-item button detail="false" lines="none" style="margin-top:16px;">
          <ion-icon slot="start" name="log-out-outline" color="danger"></ion-icon>
          <ion-label color="danger">Logout</ion-label>
        </ion-item>
      </div>
    </ion-content>
  `,
})
export class SettingsPage {
  darkMode = false;

  toggleDark() {
    document.body.classList.toggle('dark', this.darkMode);
  }
}
