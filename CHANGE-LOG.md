# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- PostgreSQL schema with users, collections, collected_cards, lorcana_repo
- Express/TypeScript backend with auth, collections, cards, and public repo endpoints
- Angular 21 + PrimeNG 21 Aura frontend with dark mode toggle
- Public splash gallery with card lightbox and add-to-collection flow
- Collection inventory with image grid, search/filter, and edit/delete
- Card form using set_code + card_number lookup (no raw repo ID exposed)
- Auth guard with returnUrl redirect
- Dark mode persisted to localStorage
- GitHub Actions CI (backend typecheck + test + build, frontend build)

### Changed

### Removed

[unreleased]: https://github.com/shane-zachary-guzman/bynder