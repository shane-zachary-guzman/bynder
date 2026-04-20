import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Tag } from 'primeng/tag';
import { Breadcrumb } from 'primeng/breadcrumb';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { Select } from 'primeng/select';
import { ApiService } from '../../shared/services/api.service';
import { CardForm } from '../card-form/card-form';

/** Filter option shape used by condition and treatment selects. */
interface FilterOption { label: string; value: string; }

const CONDITION_OPTIONS: FilterOption[] = [
  { label: 'Mint',              value: 'mint' },
  { label: 'Near Mint',         value: 'near_mint' },
  { label: 'Lightly Played',    value: 'lightly_played' },
  { label: 'Moderately Played', value: 'moderately_played' },
  { label: 'Heavily Played',    value: 'heavily_played' },
  { label: 'Damaged',           value: 'damaged' },
];

const TREATMENT_OPTIONS: FilterOption[] = [
  { label: 'Normal',     value: 'normal' },
  { label: 'Foil',       value: 'foil' },
  { label: 'Serialized', value: 'serialized' },
  { label: 'Enchanted',  value: 'enchanted' },
  { label: 'Promo',      value: 'promo' },
];

/**
 * A card entry within a collection, as returned by
 * `GET /api/collections/:id/cards`.
 */
export interface CollectedCard {
  /** Numeric primary key of the collection-card join record. */
  id: number;
  /** Foreign key referencing the card in the shared card repository. */
  repo_card_id: number;
  /** Trading card game identifier, e.g. `'lorcana'`. */
  game: string;
  /** Physical condition of the card. */
  condition: string;
  /** Special treatment applied to the card, e.g. `'foil'`. */
  treatment: string;
  /** Number of copies owned. */
  quantity: number;
  /** Estimated resale value, or `null` if unknown. */
  estimated_value: string | null;
  /** Optional personal notes about this copy. */
  notes: string | null;
  /** ISO-8601 creation timestamp. */
  created_at: string;
  // ─── Enriched repo fields (joined server-side) ────────────────────────────
  /** Display name from the repo table, or `null` when unresolved. */
  name: string | null;
  /** Absolute URL to the card art image, or `null` when unavailable. */
  image_url: string | null;
  /** Short set code, e.g. `'TFC'`. */
  set_code: string | null;
  /** Card number within its set, e.g. `'001/204'`. */
  card_number: string | null;
  /** Full human-readable set name. */
  set_name: string | null;
}

/**
 * Displays all cards in a specific collection and provides UI for
 * adding, editing, and removing them.
 */
@Component({
  selector: 'app-card-list',
  imports: [
    FormsModule,
    Button, Dialog, ConfirmDialog, Tag, Breadcrumb, CardForm,
    InputText, IconField, InputIcon, Select,
  ],
  templateUrl: './card-list.html',
  styleUrl: './card-list.scss',
  providers: [ConfirmationService]
})
export class CardList implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  /** The numeric ID of the currently viewed collection. */
  readonly collectionId = signal(0);

  /** Display name of the collection, shown in the breadcrumb. */
  readonly collectionName = signal('Collection');

  /** Cards belonging to the current collection. */
  readonly cards = signal<CollectedCard[]>([]);

  /** Whether the card list is being fetched. */
  readonly loading = signal(false);

  /** Controls visibility of the add/edit dialog. */
  readonly showForm = signal(false);

  /** The card being edited, or `null` when adding a new one. */
  readonly editTarget = signal<CollectedCard | null>(null);

  // ─── Filter state ────────────────────────────────────────────────────────

  /** Free-text search term matched against name, set name, set code, and card number. */
  readonly searchTerm = signal('');

  /** Selected set code filter, or `null` for all sets. */
  readonly filterSet = signal<string | null>(null);

  /** Selected condition filter, or `null` for all conditions. */
  readonly filterCondition = signal<string | null>(null);

  /** Selected treatment filter, or `null` for all treatments. */
  readonly filterTreatment = signal<string | null>(null);

  /** Condition options for the filter dropdown. */
  readonly conditionOptions = CONDITION_OPTIONS;

  /** Treatment options for the filter dropdown. */
  readonly treatmentOptions = TREATMENT_OPTIONS;

  /**
   * Unique set options derived from the loaded cards, used to populate the
   * set filter dropdown. Only shown when the collection spans more than one set.
   */
  readonly setOptions = computed<FilterOption[]>(() => {
    const seen = new Map<string, string>();
    for (const card of this.cards()) {
      if (card.set_code) seen.set(card.set_code, card.set_name ?? card.set_code);
    }
    return Array.from(seen.entries())
      .map(([value, label]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  /**
   * Cards after applying all active filters.
   * Filters by free-text search, set, condition, and treatment.
   */
  readonly filteredCards = computed<CollectedCard[]>(() => {
    const term  = this.searchTerm().toLowerCase().trim();
    const set   = this.filterSet();
    const cond  = this.filterCondition();
    const treat = this.filterTreatment();

    return this.cards().filter(card => {
      if (term) {
        const haystack = [card.name, card.set_name, card.set_code, card.card_number]
          .filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (set   && card.set_code  !== set)   return false;
      if (cond  && card.condition !== cond)  return false;
      if (treat && card.treatment !== treat) return false;
      return true;
    });
  });

  /** `true` when at least one filter is active. */
  readonly hasActiveFilters = computed(() =>
    !!this.searchTerm() || !!this.filterSet() || !!this.filterCondition() || !!this.filterTreatment()
  );

  /** Breadcrumb items for the page header. Mutated once the collection name resolves. */
  readonly breadcrumbs = [
    { label: 'Home', icon: 'pi pi-home', routerLink: '/' },
    { label: 'Collections', routerLink: '/collections' },
    { label: 'Collection', routerLink: '' },
  ];

  /** @inheritdoc */
  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.collectionId.set(id);
    this.loadCollection(id);
    this.loadCards();
  }

  /**
   * Fetches the collection record to resolve its display name for the breadcrumb.
   * @param id - Numeric collection ID from the route.
   */
  loadCollection(id: number): void {
    this.api.get<{ id: number; name: string }>(`/collections/${id}`).subscribe({
      next: (col) => {
        this.collectionName.set(col.name);
        const crumb = this.breadcrumbs[2]!;
        crumb.label = col.name;
        crumb.routerLink = `/collections/${id}`;
      },
      error: () => {
        const crumb = this.breadcrumbs[2]!;
        crumb.label = `Collection ${id}`;
        crumb.routerLink = `/collections/${id}`;
      }
    });
  }

  /**
   * Fetches all cards for the current collection from the API.
   */
  loadCards(): void {
    this.loading.set(true);
    this.api.get<CollectedCard[]>(`/collections/${this.collectionId()}/cards`).subscribe({
      next: (data) => {
        this.cards.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load cards.' });
        this.loading.set(false);
      }
    });
  }

  /**
   * Resets all active filters back to their default (empty) state.
   */
  clearFilters(): void {
    this.searchTerm.set('');
    this.filterSet.set(null);
    this.filterCondition.set(null);
    this.filterTreatment.set(null);
  }

  /**
   * Opens the dialog in add mode.
   */
  openCreate(): void {
    this.editTarget.set(null);
    this.showForm.set(true);
  }

  /**
   * Opens the dialog in edit mode for the given card.
   * @param card - The card entry to edit.
   */
  openEdit(card: CollectedCard): void {
    this.editTarget.set(card);
    this.showForm.set(true);
  }

  /**
   * Closes the dialog and reloads the card list after a successful save.
   */
  onSaved(): void {
    this.showForm.set(false);
    this.loadCards();
  }

  /**
   * Presents a confirmation dialog and deletes the card if confirmed.
   * @param card - The card entry to delete.
   */
  confirmDelete(card: CollectedCard): void {
    this.confirmationService.confirm({
      message: `Remove "${card.name ?? `Card #${card.repo_card_id}`}" from this collection?`,
      header: 'Remove Card',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.api.delete(`/collections/${this.collectionId()}/cards/${card.id}`).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Removed', detail: 'Card removed.' });
            this.loadCards();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to remove card.' });
          }
        });
      }
    });
  }
}
