import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Lightweight service to broadcast page-loader visibility.
 * Any page can set `show(true)` while loading data;
 * the app shell listens and hides the tab bar accordingly.
 */
@Injectable({ providedIn: 'root' })
export class PageLoaderService {
  private _loading$ = new BehaviorSubject<boolean>(false);

  /** Observable the app component subscribes to */
  loading$ = this._loading$.asObservable();

  show(loading: boolean) {
    this._loading$.next(loading);
  }
}
