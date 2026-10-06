import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AppUser {
  id: string;
  name: string;
  role: string; // admin | staff | cashier
}

const STORAGE_USER = 'snackstation_user';

/**
 * PIN login against the Users tab of the Sheet. The PIN is checked by the
 * Apps Script ("login" action) — the app never downloads the Users tab.
 * "Remember me" keeps the session in localStorage (survives restarts);
 * otherwise sessionStorage (ends when the app/tab is closed).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private user$ = new BehaviorSubject<AppUser | null>(this.restore());

  constructor(private http: HttpClient) {}

  get user() {
    return this.user$.value;
  }

  getUser() {
    return this.user$.asObservable();
  }

  /** Resolves with the user, or throws with a message to show. */
  async login(pin: string, remember: boolean): Promise<AppUser> {
    const headers = new HttpHeaders({ 'Content-Type': 'text/plain;charset=utf-8' });
    let res: { success?: boolean; user?: AppUser; error?: string };
    try {
      res = await firstValueFrom(
        this.http.post<typeof res>(
          environment.sheetsApiUrl,
          JSON.stringify({ sheet: 'Users', action: 'login', data: { pin } }),
          { headers }
        )
      );
    } catch (err) {
      console.error('Login request failed', err);
      throw new Error("Couldn't reach the server — check your connection and try again.");
    }
    if (!res?.success || !res.user) {
      // An Apps Script deployed before PIN login existed doesn't know "login".
      if (/Sheet not found: Users|Unknown action: login/.test(res?.error || '')) {
        throw new Error('PIN login isn’t set up yet — paste the latest Code.gs into Apps Script and redeploy.');
      }
      throw new Error(res?.error || 'Login failed');
    }

    this.persist(res.user, remember);
    this.user$.next(res.user);
    return res.user;
  }

  logout() {
    for (const store of [localStorage, sessionStorage]) {
      try {
        store.removeItem(STORAGE_USER);
      } catch {
        // storage unavailable
      }
    }
    this.user$.next(null);
  }

  private persist(user: AppUser, remember: boolean) {
    try {
      (remember ? localStorage : sessionStorage).setItem(STORAGE_USER, JSON.stringify(user));
      (remember ? sessionStorage : localStorage).removeItem(STORAGE_USER);
    } catch {
      // storage unavailable — stays signed in until the app closes
    }
  }

  private restore(): AppUser | null {
    for (const store of [localStorage, sessionStorage]) {
      try {
        const raw = store.getItem(STORAGE_USER);
        if (raw) return JSON.parse(raw) as AppUser;
      } catch {
        // ignore unreadable storage
      }
    }
    return null;
  }
}

/** Every page except Login needs a signed-in user. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.user ? true : inject(Router).createUrlTree(['/login']);
};

/** Signed-in users skip the Login page. */
export const loginGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.user ? inject(Router).createUrlTree(['/dashboard']) : true;
};
