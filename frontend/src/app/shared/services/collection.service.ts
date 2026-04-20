import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

/**
 * Minimal collection shape needed by client-side components.
 * Mirrors the `Collection` type from the backend without server-only fields.
 */
export interface Collection {
  /** Numeric primary key. */
  id: number;
  /** Display name of the collection. */
  name: string;
  /** Optional description; `null` when not set. */
  description: string | null;
}

/**
 * Data-access service for the authenticated user's card collections.
 * All requests require a valid session cookie.
 */
@Injectable({ providedIn: 'root' })
export class CollectionService {
  private readonly api = inject(ApiService);

  /**
   * Fetches all collections belonging to the currently authenticated user.
   *
   * @returns Observable emitting an array of {@link Collection} objects, newest first.
   */
  getCollections(): Observable<Collection[]> {
    return this.api.get<Collection[]>('/collections');
  }
}
