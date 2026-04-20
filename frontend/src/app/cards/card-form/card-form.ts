import { Component, effect, inject, input, output } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { ApiService } from '../../shared/services/api.service';
import { CollectedCard } from '../card-list/card-list';

/** Selectable condition levels for a physical card. */
const CONDITION_OPTIONS: { label: string; value: string }[] = [
  { label: 'Mint',              value: 'mint' },
  { label: 'Near Mint',         value: 'near_mint' },
  { label: 'Lightly Played',    value: 'lightly_played' },
  { label: 'Moderately Played', value: 'moderately_played' },
  { label: 'Heavily Played',    value: 'heavily_played' },
  { label: 'Damaged',           value: 'damaged' },
];

/** Selectable special treatments applied to a card. */
const TREATMENT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Normal',     value: 'normal' },
  { label: 'Foil',       value: 'foil' },
  { label: 'Serialized', value: 'serialized' },
  { label: 'Enchanted',  value: 'enchanted' },
  { label: 'Promo',      value: 'promo' },
];

/**
 * Reusable form for adding or editing a {@link CollectedCard} within a
 * specific collection.
 *
 * - **Add mode** (`card` input is `null`): shows `set_code` and `card_number`
 *   fields and posts to `POST /collections/:id/cards/by-set`.
 * - **Edit mode** (`card` input is provided): shows a read-only card identity
 *   header and posts only the mutable fields to `PUT /collections/:id/cards/:cardId`.
 */
@Component({
  selector: 'app-card-form',
  imports: [ReactiveFormsModule, Button, InputText, Select, InputNumber, Textarea],
  templateUrl: './card-form.html',
  styleUrl: './card-form.scss'
})
export class CardForm {
  private readonly api = inject(ApiService);
  private readonly messageService = inject(MessageService);

  /** The collection this card belongs to. Required. */
  readonly collectionId = input.required<number>();

  /** Pre-populated card for edit mode, or `null` for add mode. */
  readonly card = input<CollectedCard | null>(null);

  /** Emitted after a successful add or update. */
  readonly saved = output<void>();

  /** Emitted when the user cancels the form. */
  readonly cancelled = output<void>();

  /** Whether a save request is in flight. */
  saving = false;

  /** Available card condition options exposed to the template. */
  readonly conditionOptions = CONDITION_OPTIONS;

  /** Available card treatment options exposed to the template. */
  readonly treatmentOptions = TREATMENT_OPTIONS;

  /**
   * Reactive form covering all editable card fields.
   * `set_code` and `card_number` are only required in add mode;
   * validators are cleared during {@link ngOnInit} when editing.
   */
  readonly form = new FormGroup({
    set_code:        new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    card_number:     new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    condition:       new FormControl('near_mint', { nonNullable: true, validators: [Validators.required] }),
    treatment:       new FormControl('normal',    { nonNullable: true, validators: [Validators.required] }),
    quantity:        new FormControl<number>(1,   { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    estimated_value: new FormControl('',          { nonNullable: true }),
    notes:           new FormControl('',          { nonNullable: true }),
  });

  constructor() {
    /**
     * React to every change of the `card` input signal so the form stays
     * in sync when the dialog is reused across multiple open/close cycles
     * (the component is never destroyed between openings).
     *
     * - Edit mode: patch all fields and clear the set_code / card_number
     *   required validators (those fields are shown read-only instead).
     * - Add mode: reset to defaults and restore the required validators.
     */
    effect(() => {
      const c = this.card();
      if (c) {
        this.form.controls.set_code.clearValidators();
        this.form.controls.card_number.clearValidators();
        this.form.controls.set_code.updateValueAndValidity();
        this.form.controls.card_number.updateValueAndValidity();
        this.form.patchValue({
          set_code:        c.set_code        ?? '',
          card_number:     c.card_number     ?? '',
          condition:       c.condition,
          treatment:       c.treatment,
          quantity:        c.quantity,
          estimated_value: c.estimated_value ?? '',
          notes:           c.notes           ?? '',
        });
      } else {
        this.form.controls.set_code.setValidators([Validators.required]);
        this.form.controls.card_number.setValidators([Validators.required]);
        this.form.reset({
          set_code:        '',
          card_number:     '',
          condition:       'near_mint',
          treatment:       'normal',
          quantity:        1,
          estimated_value: '',
          notes:           '',
        });
      }
    });
  }

  /**
   * Extracts a human-readable message from an Angular `HttpErrorResponse`.
   * Handles plain string errors, Zod flatten objects, and generic fallbacks.
   *
   * @param err - The raw error from an HTTP observable.
   * @returns A displayable error string.
   */
  private extractError(err: unknown): string {
    const body = (err as { error?: unknown })?.error;
    if (!body) return 'Failed to save card.';

    // Plain string: e.g. { error: "Card not found..." }
    if (typeof (body as { error?: unknown }).error === 'string') {
      return (body as { error: string }).error;
    }

    // Zod flatten: { error: { fieldErrors: { field: [msg, ...] } } }
    const fieldErrors = (body as { error?: { fieldErrors?: Record<string, string[]> } })
      ?.error?.fieldErrors;
    if (fieldErrors) {
      const messages = Object.entries(fieldErrors)
        .flatMap(([field, msgs]) => msgs.map(m => `${field}: ${m}`));
      if (messages.length) return messages.join(' · ');
    }

    // Generic message field
    const message = (body as { message?: unknown })?.message;
    if (typeof message === 'string') return message;

    return 'Failed to save card.';
  }

  /**
   * Submits the form.
   *
   * - Add mode: posts `set_code`, `card_number`, and card attributes to
   *   `POST /collections/:id/cards/by-set`, which resolves the `repo_card_id`
   *   server-side.
   * - Edit mode: sends only the mutable attributes to
   *   `PUT /collections/:id/cards/:cardId`.
   *
   * Emits {@link saved} on success.
   */
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const raw = this.form.getRawValue();
    const existingCard = this.card();
    const collId = this.collectionId();

    const request$ = existingCard
      ? this.api.put(`/collections/${collId}/cards/${existingCard.id}`, {
          condition:       raw.condition,
          treatment:       raw.treatment,
          quantity:        raw.quantity,
          estimated_value: raw.estimated_value || null,
          notes:           raw.notes           || null,
        })
      : this.api.post(`/collections/${collId}/cards/by-set`, {
          game:            'lorcana',
          set_code:        raw.set_code,
          card_number:     raw.card_number,
          condition:       raw.condition,
          treatment:       raw.treatment,
          quantity:        raw.quantity,
          estimated_value: raw.estimated_value || null,
          notes:           raw.notes           || null,
        });

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Saved',
          detail: existingCard ? 'Card updated.' : 'Card added.',
        });
        this.saved.emit();
      },
      error: (err) => {
        this.saving = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: this.extractError(err) });
      }
    });
  }
}
