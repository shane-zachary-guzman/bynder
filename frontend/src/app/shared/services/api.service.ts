import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Low-level HTTP wrapper that prepends the environment API origin plus `/api`
 * to all paths and provides typed convenience methods for the four main HTTP verbs.
 *
 * - **Development**: `environment.apiUrl` is `''`, so requests go to `/api/…`
 *   and are forwarded to the local Express server by the `ng serve` proxy.
 * - **Production**: `environment.apiUrl` is the deployed backend origin
 *   (e.g. `https://api.bynder.com`), so requests go to the full URL directly.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api`;

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
