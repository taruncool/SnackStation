import { importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
// Every page imports IonicModule from '@ionic/angular' (the lazy-loading
// build), so Ionic must be set up with IonicModule.forRoot() — that's what
// registers the <ion-*> elements. The '@ionic/angular/standalone' provider
// doesn't, which left the production build (and the APK) as unstyled text.
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

// NOTE: provideHttpClient() here intentionally does NOT use withFetch().
// Google Apps Script Web Apps (the /exec URL) 302-redirect every response
// to a different Google domain. The browser's Fetch API doesn't reliably
// replay that redirect for POST requests with a body, which shows up as a
// CORS error in devtools even though GET requests work fine. The classic
// XHR transport (the default when withFetch() is omitted) handles this
// redirect correctly, so POST (add/update/delete against the Sheet) works.
bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    importProvidersFrom(IonicModule.forRoot({})),
    provideRouter(routes),
    provideHttpClient(),
  ],
});
