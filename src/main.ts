import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

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
    provideIonicAngular({}),
    provideRouter(routes),
    provideHttpClient(),
  ],
});
