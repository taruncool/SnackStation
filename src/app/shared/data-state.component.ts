import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

/**
 * The three states a list of Google-Sheet data can be in before it has
 * anything to show — loading, failed, or genuinely empty — so a page never
 * flashes "No … found" just because the data hasn't arrived yet.
 */
@Component({
  selector: 'app-data-state',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div *ngIf="status === 'loading'" class="ion-text-center" style="padding:32px 0;">
      <ion-spinner name="crescent" color="primary"></ion-spinner>
      <p style="color:var(--ion-color-medium); margin:12px 0 0;">{{ loadingText }}</p>
    </div>
    <div *ngIf="status === 'error'" class="ion-text-center" style="padding:32px 16px;">
      <p style="color:var(--ion-color-danger); margin:0 0 12px;">
        Couldn't load this — check your connection and try again.
      </p>
      <ion-button size="small" (click)="retry.emit()">Retry</ion-button>
    </div>
    <p
      *ngIf="status === 'loaded' && empty"
      class="ion-text-center"
      style="color:var(--ion-color-medium); padding:16px;"
    >
      {{ emptyText }}
    </p>
  `,
})
export class DataStateComponent {
  @Input() status: 'loading' | 'loaded' | 'error' = 'loading';
  /** True when the list has nothing in it (after filters/search). */
  @Input() empty = false;
  @Input() emptyText = 'Nothing found';
  @Input() loadingText = 'Loading…';
  @Output() retry = new EventEmitter<void>();
}
