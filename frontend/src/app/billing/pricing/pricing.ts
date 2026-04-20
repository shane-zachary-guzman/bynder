import { Component, computed, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { AuthService } from '../../shared/services/auth.service';

/**
 * Billing/pricing page that shows the Free and Pro plan tiers and lets
 * the user see their current plan or upgrade.
 */
@Component({
  selector: 'app-pricing',
  imports: [Button, Card],
  templateUrl: './pricing.html',
  styleUrl: './pricing.scss'
})
export class Pricing {
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);

  /**
   * The subscription tier of the currently authenticated user.
   * Falls back to `'free'` if the user object is unavailable.
   */
  readonly currentPlan = computed(() => this.authService.currentUser()?.plan ?? 'free');

  /**
   * Shows a coming-soon toast when the user attempts to upgrade to Pro.
   */
  upgradeToPro(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Coming Soon',
      detail: 'Pro plan upgrades are not yet available. Check back soon!'
    });
  }
}
