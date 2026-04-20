import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Card } from 'primeng/card';
import { Message } from 'primeng/message';
import { Divider } from 'primeng/divider';
import { AuthService } from '../../shared/services/auth.service';

/**
 * Registration page component. Collects an optional display name, email,
 * and password, then delegates account creation to {@link AuthService}.
 * Redirects to `/collections` on success.
 */
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, Button, InputText, Password, Card, Message, Divider],
  templateUrl: './register.html'
})
export class Register {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  /** Reactive form with optional name, required email, and required password. */
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] })
  });

  /** Whether the registration request is in flight. */
  readonly loading = signal(false);

  /** Human-readable error message from a failed registration, or `null`. */
  readonly error = signal<string | null>(null);

  /**
   * Validates the form and submits registration data to the auth service.
   * Navigates to `/collections` on success; populates the error signal
   * on failure.
   */
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const { name, email, password } = this.form.getRawValue();

    this.authService.register(email, password, name || undefined).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/collections']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Registration failed. Please try again.');
      }
    });
  }
}
