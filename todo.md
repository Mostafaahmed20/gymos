# GymOS - Project TODO

## Phase 1: Database Schema & Project Setup
- [x] Create comprehensive database schema (all tables)
- [x] Run migrations
- [x] Set up global theming (dark gym aesthetic)
- [x] Configure routing structure in App.tsx

## Phase 2: Backend - Core Routers
- [x] Auth router (login, logout, me, role-based access)
- [x] Trainees router (CRUD, search, filter, profile)
- [x] Trainers router (CRUD, assign trainees)
- [x] Subscriptions router (create, renew, freeze, cancel, alerts)
- [x] Payments router (record, edit, delete, filter, revenue)
- [x] Workout plans router (create, assign, clone, archive)

## Phase 3: Backend - Extended Routers
- [x] Attendance router (record, search, daily/weekly/monthly)
- [x] Progress router (body measurements, charts, photos)
- [x] Marketing router (campaigns, templates, send offers)
- [x] Supplements router (products, stock, orders, categories)
- [x] Notifications router (admin + user notifications)
- [x] Reports router (revenue, subscriptions, attendance, sales)
- [x] User portal router (profile, workout, progress, attendance, store, notifications)

## Phase 4: Admin Frontend - Core Pages
- [x] Admin layout with sidebar navigation
- [x] Admin dashboard (summary cards + charts)
- [x] Trainees list page (table, search, filter, pagination)
- [x] Trainee detail page (all sections: info, subscription, payments, workout, progress, attendance)
- [x] Add/Edit trainee form
- [x] Trainers list page
- [x] Subscriptions management page
- [x] Payments management page

## Phase 5: Admin Frontend - Extended Pages
- [x] Workout plans management page
- [x] Attendance management page
- [x] Marketing/campaigns page
- [x] Supplement store management page
- [x] Reports & analytics page
- [x] Settings page

## Phase 6: User Frontend - All Pages
- [x] User dashboard (welcome, subscription status, today's workout)
- [x] User profile page
- [x] Workout plan viewer (daily exercises)
- [x] Progress tracking page (measurements, charts)
- [x] Attendance history page
- [x] Supplement store (browse, cart, orders)
- [x] Notifications page

## Phase 7: Final Integration & Testing
- [x] Write vitest tests for all routers (11 tests passing)
- [x] TypeScript zero errors
- [x] Final checkpoint and delivery

## Arabic Language Support (i18n + RTL)

- [ ] Create LanguageContext with Arabic/English toggle and RTL support
- [ ] Create translation files: en.ts and ar.ts with all UI strings
- [ ] Update index.css with RTL-aware font (Cairo for Arabic)
- [ ] Update AdminLayout with language switcher
- [ ] Update UserLayout with language switcher
- [ ] Translate Home (landing page)
- [ ] Translate all Admin pages (Dashboard, Trainees, Trainers, Subscriptions, Payments, Workouts, Attendance, Marketing, Supplements, Reports, Settings)
- [ ] Translate all User pages (Dashboard, Profile, Workout, Progress, Attendance, Store, Notifications)

## Language Switcher UX Improvements
- [x] Add prominent AR/EN toggle button in User portal top header bar (visible immediately after login)
- [x] Add AR/EN toggle button in Admin portal top header bar
