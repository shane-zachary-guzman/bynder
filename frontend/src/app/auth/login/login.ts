import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Card } from 'primeng/card';
import { Message } from 'primeng/message';
import { AuthService } from '../../shared/services/auth.service';

/**
 * Login page component. Presents email/password fields, validates input,
 * delegates authentication to {@link AuthService}, then redirects to
 * `/collections` on success.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, Button, InputText, Password, Card, Message],
  templateUrl: './login.html'
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);

  /** Reactive form containing email and password controls. */
  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] })
  });

  /** Whether the login request is in flight. */
  readonly loading = signal(false);

  /** Human-readable error message from a failed login attempt, or `null`. */
  readonly error = signal<string | null>(null);

  /**
   * Validates the form and submits credentials to the auth service.
   * On success, navigates to the `returnUrl` query parameter when present
   * (set by {@link authGuard}), otherwise falls back to `/collections`.
   * Populates the error signal on failure.
   */
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.form.getRawValue();
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/collections';

    this.authService.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Login failed. Please check your credentials.');
      }
    });
  }
}
