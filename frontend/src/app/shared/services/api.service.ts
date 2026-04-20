import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Low-level HTTP wrapper that prepends `/api` to all paths and
 * provides typed convenience methods for the four main HTTP verbs.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

  /**
   * Sends a GET request to the given API path.
   * @param path - Path relative to `/api`, e.g. `'/auth/me'`.
   * @returns Observable that emits the deserialized response body.
   */
  get<T>(path: string): Observable<T> {
    return this.http.get<T>(`${this.base}${path}`);
  }

  /**
   * Sends a POST request to the given API path with the supplied body.
   * @param path - Path relative to `/api`.
   * @param body - Request payload.
   * @returns Observable that emits the deserialized response body.
   */
  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body);
  }

  /**
   * Sends a PUT request to the given API path with the supplied body.
   * @param path - Path relative to `/api`.
   * @param body - Request payload.
   * @returns Observable that emits the deserialized response body.
   */
  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.base}${path}`, body);
  }

  /**
   * Sends a DELETE request to the given API path.
   * @param path - Path relative to `/api`.
   * @returns Observable that emits the deserialized response body.
   */
  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}${path}`);
  }
}
