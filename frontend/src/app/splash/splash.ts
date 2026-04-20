import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Dialog } from 'primeng/dialog';
import { Tag } from 'primeng/tag';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { Select } from 'primeng/select';
import { InputNumber } from 'primeng/inputnumber';
import { Button } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ApiService } from '../shared/services/api.service';
import { AuthService } from '../shared/services/auth.service';
import { CollectionService, Collection } from '../shared/services/collection.service';

/**
 * Describes a single card-repo tab in the gallery. Add future games here.
 */
export interface RepoTab {
  /** Route segment used in the API call: GET /api/repo/{id} */
  id: string;
  /** Human-readable label shown on the tab button. */
  label: string;
  /** PrimeIcons class for the tab icon. */
  icon: string;
}

/**
 * Registered card repository tabs. To add a new game, append an entry here
 * and ensure a matching GET /api/repo/{id} backend endpoint exists.
 */
export const REPO_TABS: RepoTab[] = [
  { id: 'lorcana', label: 'Lorcana', icon: 'pi pi-star' },
  // { id: 'mtg',     label: 'Magic: The Gathering', icon: 'pi pi-bolt' },
  // { id: 'pokemon', label: 'Pokémon',               icon: 'pi pi-bolt' },
];

/**
 * A single card entry as returned by GET /api/repo/{id}.
 */
export interface RepoCard {
  /** Numeric primary key of the card record. */
  id: number;
  /** Short code identifying the set, e.g. `'TFC'`. */
  set_code: string;
  /** Full human-readable name of the set. */
  set_name: string;
  /** Card number within its set, e.g. `'001/204'`. */
  card_number: string;
  /** Display name of the card. */
  name: string;
  /** Ink color for Lorcana cards, or `null` when not applicable. */
  ink_color: string | null;
  /** Primary card type, e.g. `'Character'`, or `null` when unknown. */
  card_type: string | null;
  /** Rarity tier, e.g. `'Rare'`, or `null` when unknown. */
  rarity: string | null;
  /** Lore points this card can quest for, or `null` if non-questing. */
  lore_value: number | null;
  /** Absolute URL to the card art image, or `null` if unavailable. */
  image_url: string | null;
  /** Game-specific numeric/boolean attributes. */
  metadata: {
    /** Ink cost to play this card. */
    strength?: number;
    /** Damage this card can withstand. */
    willpower?: number;
    /** Number of ink needed to play this card. */
    cost?: number;
    /** Whether the card can be placed in the inkwell. */
    inkwell?: boolean;
    [key: string]: unknown;
  };
}

/** Selectable condition options for the add-to-collection form. */
const CONDITION_OPTIONS: { label: string; value: string }[] = [
  { label: 'Mint',              value: 'mint' },
  { label: 'Near Mint',         value: 'near_mint' },
  { label: 'Lightly Played',    value: 'lightly_played' },
  { label: 'Moderately Played', value: 'moderately_played' },
  { label: 'Heavily Played',    value: 'heavily_played' },
  { label: 'Damaged',           value: 'damaged' },
];

/** Selectable treatment options for the add-to-collection form. */
const TREATMENT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Normal',     value: 'normal' },
  { label: 'Foil',       value: 'foil' },
  { label: 'Serialized', value: 'serialized' },
  { label: 'Enchanted',  value: 'enchanted' },
  { label: 'Promo',      value: 'promo' },
];

/**
 * Splash gallery page. Displays a browseable grid of cards from one or more
 * card repositories, organised by game via tabs. Selecting a card opens a
 * lightbox with detailed stats. Authenticated users can add any card to one
 * of their collections directly from the lightbox.
 */
@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [
    FormsModule,
    Dialog, Tag, ProgressSpinner,
    Tabs, TabList, Tab, TabPanels, TabPanel,
    Select, InputNumber, Button, Toast,
  ],
  templateUrl: './splash.html',
  styleUrl: './splash.scss'
})
export class Splash implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  readonly auth = inject(AuthService);
  private readonly collectionSvc = inject(CollectionService);

  // ─── Gallery state ──────────────────────────────────────────────────────────

  /** All registered repo tabs, bound to the tab list in the template. */
  readonly tabs = REPO_TABS;

  /** Index of the currently active tab. */
  readonly activeTabIndex = signal(0);

  /** Cards loaded for the active tab. */
  readonly cards = signal<RepoCard[]>([]);

  /** API error message, or null when the last request succeeded. */
  readonly error = signal<string | null>(null);

  /** Whether a card-list request is in flight. */
  readonly loading = signal(false);

  // ─── Lightbox state ─────────────────────────────────────────────────────────

  /** The card whose lightbox is open, or `null` when closed. */
  readonly selectedCard = signal<RepoCard | null>(null);

  /** Controls lightbox dialog visibility. */
  readonly lightboxVisible = signal(false);

  // ─── Add-to-collection state ─────────────────────────────────────────────────

  /** Controls add-to-collection dialog visibility. */
  readonly addDialogVisible = signal(false);

  /** User's collections, fetched when the add dialog opens. */
  readonly addCollections = signal<Collection[]>([]);

  /** ID of the collection selected in the add form. */
  readonly addCollectionId = signal<number | null>(null);

  /** Selected condition for the card being added. */
  readonly addCondition = signal<string>('near_mint');

  /** Selected treatment for the card being added. */
  readonly addTreatment = signal<string>('normal');

  /** Quantity of the card being added. */
  readonly addQuantity = signal<number>(1);

  /** Whether the add form submission is in flight. */
  readonly addSubmitting = signal(false);

  /** Validation/server error for the add form, or `null` when clear. */
  readonly addError = signal<string | null>(null);

  /** Condition options exposed to the template. */
  readonly conditionOptions = CONDITION_OPTIONS;

  /** Treatment options exposed to the template. */
  readonly treatmentOptions = TREATMENT_OPTIONS;

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  /** @inheritdoc */
  ngOnInit(): void {
    this.loadCards(REPO_TABS[0]!);
  }

  // ─── Gallery methods ─────────────────────────────────────────────────────────

  /**
   * Handles tab-change events emitted by `p-tabs (valueChange)`.
   * Updates the active tab index and fetches cards for the selected game.
   * @param index - Zero-based index of the newly selected tab.
   */
  onTabChange(index: number): void {
    this.activeTabIndex.set(index);
    this.loadCards(REPO_TABS[index]!);
  }

  /**
   * Fetches the card list for the given repo tab from `GET /api/repo/{id}`.
   * Sets `loading` while the request is in flight and populates `cards` on success.
   * @param tab - The repo tab whose cards should be loaded.
   */
  loadCards(tab: RepoTab): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get<RepoCard[]>(`/repo/${tab.id}`).subscribe({
      next: (data) => {
        this.cards.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.cards.set([]);
        this.error.set(`Failed to load cards (${err?.status ?? 'unknown error'}). Check the console for details.`);
        this.loading.set(false);
        console.error('Gallery load error:', err);
      }
    });
  }

  // ─── Lightbox methods ────────────────────────────────────────────────────────

  /**
   * Opens the lightbox for the given card.
   * @param card - The card to display in the lightbox.
   */
  openLightbox(card: RepoCard): void {
    this.selectedCard.set(card);
    this.lightboxVisible.set(true);
  }

  /**
   * Closes the lightbox dialog. Clears `selectedCard` after a 300 ms delay so
   * the dialog close animation completes before the content is removed.
   */
  closeLightbox(): void {
    this.lightboxVisible.set(false);
    setTimeout(() => this.selectedCard.set(null), 300);
  }

  // ─── Add-to-collection methods ───────────────────────────────────────────────

  /**
   * Opens the add-to-collection dialog for the currently selected card.
   * Fetches the user's collections on first open; resets form state each time.
   */
  openAddDialog(): void {
    this.addError.set(null);
    this.addCollectionId.set(null);
    this.addCondition.set('near_mint');
    this.addTreatment.set('normal');
    this.addQuantity.set(1);

    this.collectionSvc.getCollections().subscribe({
      next: (cols) => {
        this.addCollections.set(cols);
        if (cols.length === 1) {
          this.addCollectionId.set(cols[0]!.id);
        }
      },
      error: () => {
        this.addCollections.set([]);
      }
    });

    this.addDialogVisible.set(true);
  }

  /**
   * Submits the add-to-collection form.
   * Posts to `POST /api/collections/:id/cards/by-set` using the set code and card
   * number from the currently selected card, resolving the internal `repo_card_id`
   * on the server side.
   */
  submitAdd(): void {
    const card = this.selectedCard();
    const collectionId = this.addCollectionId();
    if (!card || !collectionId) return;

    this.addSubmitting.set(true);
    this.addError.set(null);

    this.api.post(`/collections/${collectionId}/cards/by-set`, {
      game:        REPO_TABS[this.activeTabIndex()]!.id,
      set_code:    card.set_code,
      card_number: card.card_number,
      condition:   this.addCondition(),
      treatment:   this.addTreatment(),
      quantity:    this.addQuantity(),
    }).subscribe({
      next: () => {
        this.addSubmitting.set(false);
        this.addDialogVisible.set(false);
        this.messages.add({
          severity: 'success',
          summary: 'Card added',
          detail: `${card.name} was added to your collection.`,
          life: 4000,
        });
      },
      error: (err) => {
        this.addSubmitting.set(false);
        const msg = err?.error?.error ?? `Failed to add card (${err?.status ?? 'unknown error'}).`;
        this.addError.set(msg);
      }
    });
  }

  /**
   * Navigates to the collections page and closes both dialogs.
   * Used when the user has no collections and needs to create one first.
   */
  goToCollections(): void {
    this.addDialogVisible.set(false);
    this.lightboxVisible.set(false);
    this.router.navigate(['/collections']);
  }
}
