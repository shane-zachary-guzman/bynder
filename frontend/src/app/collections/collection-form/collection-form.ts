import { Component, inject, input, OnInit, output } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { ApiService } from '../../shared/services/api.service';
import { Collection } from '../collection-list/collection-list';

/**
 * Reusable form for creating or updating a {@link Collection}.
 * In create mode the `collection` input is `null`; in edit mode it is
 * pre-populated with the existing collection data.
 */
@Component({
  selector: 'app-collection-form',
  imports: [ReactiveFormsModule, Button, InputText, Textarea],
  templateUrl: './collection-form.html'
})
export class CollectionForm implements OnInit {
  private readonly api = inject(ApiService);
  private readonly messageService = inject(MessageService);

  /** Pre-populated collection for edit mode, or `null` for create mode. */
  readonly collection = input<Collection | null>(null);

  /** Emitted after a successful create or update. */
  readonly saved = output<void>();

  /** Emitted when the user cancels the form. */
  readonly cancelled = output<void>();

  /** Whether a save request is in flight. */
  saving = false;

  /** Reactive form with name and optional description. */
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true })
  });

  /** @inheritdoc */
  ngOnInit(): void {
    const col = this.collection();
    if (col) {
      this.form.patchValue({ name: col.name, description: col.description ?? '' });
    }
  }

  /**
   * Submits the form. Sends a POST to create a new collection or a PUT to
   * update the existing one, then emits {@link saved}.
   */
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const payload = this.form.getRawValue();
    const col = this.collection();
    const request$ = col
      ? this.api.put(`/collections/${col.id}`, payload)
      : this.api.post('/collections', payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Saved',
          detail: col ? 'Collection updated.' : 'Collection created.'
        });
        this.saved.emit();
      },
      error: () => {
        this.saving = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save collection.' });
      }
    });
  }
}
