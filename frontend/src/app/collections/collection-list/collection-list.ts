import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DataView } from 'primeng/dataview';
import { Dialog } from 'primeng/dialog';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Tag } from 'primeng/tag';
import { ApiService } from '../../shared/services/api.service';
import { CollectionForm } from '../collection-form/collection-form';

/**
 * A user's card collection, as returned by `GET /api/collections`.
 */
export interface Collection {
  /** Numeric primary key. */
  id: number;
  /** Human-readable collection name. */
  name: string;
  /** Optional description text. */
  description: string | null;
  /** ISO-8601 creation timestamp. */
  created_at: string;
}

/**
 * Displays all of the current user's collections and provides UI for
 * creating, editing, and deleting them.
 */
@Component({
  selector: 'app-collection-list',
  imports: [RouterLink, DatePipe, Button, Card, DataView, Dialog, ConfirmDialog, CollectionForm],
  templateUrl: './collection-list.html',
  providers: [ConfirmationService]
})
export class CollectionList implements OnInit {
  private readonly api = inject(ApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  /** The list of collections belonging to the current user. */
  readonly collections = signal<Collection[]>([]);

  /** Whether the collection list is being fetched. */
  readonly loading = signal(false);

  /** Controls visibility of the create/edit dialog. */
  readonly showForm = signal(false);

  /** The collection being edited, or `null` when creating a new one. */
  readonly editTarget = signal<Collection | null>(null);

  /** @inheritdoc */
  ngOnInit(): void {
    this.loadCollections();
  }

  /**
   * Fetches all collections from the API and populates the signal.
   */
  loadCollections(): void {
    this.loading.set(true);
    this.api.get<Collection[]>('/collections').subscribe({
      next: (data) => {
        this.collections.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load collections.' });
        this.loading.set(false);
      }
    });
  }

  /**
   * Opens the dialog in create mode (no pre-populated data).
   */
  openCreate(): void {
    this.editTarget.set(null);
    this.showForm.set(true);
  }

  /**
   * Opens the dialog in edit mode for the given collection.
   * @param collection - The collection to edit.
   */
  openEdit(collection: Collection): void {
    this.editTarget.set(collection);
    this.showForm.set(true);
  }

  /**
   * Closes the dialog and reloads the collection list after a successful
   * create or update.
   */
  onSaved(): void {
    this.showForm.set(false);
    this.loadCollections();
  }

  /**
   * Presents a confirmation dialog and deletes the collection if confirmed.
   * @param collection - The collection to delete.
   */
  confirmDelete(collection: Collection): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${collection.name}"? This cannot be undone.`,
      header: 'Delete Collection',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.api.delete(`/collections/${collection.id}`).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Collection removed.' });
            this.loadCollections();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete collection.' });
          }
        });
      }
    });
  }
}
