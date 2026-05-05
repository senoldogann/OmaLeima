# TODOS.md

Bu dosya her branch'te plani kucuk, uygulanabilir ve dogrulanabilir adimlara bolmek icin kullanilir.

## Current Todos (Manual QR Token Scanner Smoke)

- [x] Re-read project rules, master plan, progress, todos, plan, review, and Expo/Android QA guidance.
- [x] Confirm the target hosted student/eventVenue/business stamp that blocks a fresh success scan.
- [x] Delete only the approved test stamp row from hosted Supabase.
- [x] Capture and decode iOS Student QR for `Students Ready Party`.
- [x] Register/reuse Android scanner device context and submit the hosted `scan-qr` request.
- [x] Refresh QR after expiry and re-run the scan to get `SUCCESS`.
- [x] Verify the new hosted stamp row and iOS leima count update.
- [x] Log Android scanner UI in with pilot scanner credentials.
- [x] Fix Android scanner CAMERA permission config conflict and rebuild/install dev-client.
- [x] Verify Android scanner UI with `Students Ready Party` selected and camera permission blocker removed.
- [x] Run mobile typecheck, Android debug manifest processing, and scoped diff checks.
- [x] Update `REVIEW.md`, `PLAN.md`, `TODOS.md`, and `PROGRESS.md`.

## Current Todos (Full-Flow Device Smoke)

- [x] Re-read project rules, master plan, progress, todos, plan, review, and Expo/Android QA skill guidance.
- [x] Start a stable LAN Metro dev-client server for iOS and Android.
- [x] Put the iOS simulator on the Student Google sign-in handoff screen and wait for the user to complete Google auth.
- [x] After user completes iOS Google auth, verify PKCE callback, student landing, QR generation, announcements, rewards, and available event context.
- [x] Generate/install an Android dev-client build on the `Pixel_9` emulator because no Android project/APK currently exists.
- [x] Launch Android dev-client against the same LAN Metro URL and smoke the auth/student landing surface where feasible.
- [x] Re-run relevant mobile validation after generated native/build changes.
- [x] Update `REVIEW.md`, `PLAN.md`, `TODOS.md`, and `PROGRESS.md` with final proof, screenshots, and blockers.

## Current Todos (Public Landing Legal Pages + Footer + Visual Balance)

- [x] Re-read project rules, master plan, progress, todos, plan, review, and current public landing files.
- [x] Verify the Finland/GDPR legal footer requirements from official sources and map the needed public pages.
- [x] Add the new working-doc context for the landing/legal slice.
- [x] Generate or select a new tall public image and copy it into the repo public asset folder.
- [x] Fill the empty/tall desktop gallery slot and rebalance gallery image usage.
- [x] Change the requested story/support headings to light green and refine the support/contact card background tones.
- [x] Rebuild the footer as a full-width, proper company/legal footer with real links.
- [x] Add bilingual `/privacy` and `/terms` pages with the provided company details.
- [x] Run admin validation, visual smoke, production deploy, and update `PROGRESS.md`.

## Current Todos (Dynamic Security Regression + Native Smoke)

- [x] Re-read project rules, master plan, progress, todos, plan, review, and active mobile/admin smoke owners.
- [x] Confirm Docker daemon, Supabase CLI, local Supabase API/DB, and source-backed Edge Function runtime are available.
- [x] Apply required local DB migration drift fixes for the current scanner RPC/event-venue contract.
- [x] Re-run admin auth and RLS core dynamic smokes.
- [x] Re-run QR security and scan-race dynamic smokes against local Edge Functions.
- [x] Re-run reward unlock push smoke and add/run announcement push smoke.
- [x] Fix smoke harness drift around scanner context, scanner device id policy, and auth-trigger profile fixtures.
- [x] Restore native push diagnostics regression surface in `student/profile.tsx` without reverting frontend redesign work.
- [x] Run mobile native push, simulator wiring, reward notification bridge audits, profile ESLint, and mobile typecheck.
- [x] Use iOS MCP/Computer Use to build/install/inspect the app on the booted iPhone simulator.
- [x] Check paired physical iPhone visibility and Android SDK/AVD readiness.
- [x] Stabilize iOS dev-client launch with `exp+omaleima-mobile` scheme and LAN Metro URL.
- [x] Complete hosted business scanner login smoke on iOS simulator with pilot scanner credentials.
- [x] Grant iOS camera permission and capture scanner camera-ready plus scanner history proof screenshots.
- [x] Boot the Android `Pixel_9` emulator and capture boot proof.
- [x] Confirm Android app smoke is blocked without an APK/dev-client artifact or generated `apps/mobile/android` project.
- [x] Research current mobile E2E tool options for Expo/React Native iOS/Android simulator/device testing.
- [x] Update `PROGRESS.md` handoff with passed smokes, native blockers, and next steps.

## Current Todos (Public Landing Desktop Footer + Favicon + Unique Media Pass)

- [x] Re-read project rules, master plan, progress, todos, plan, review, and current public landing files.
- [x] Confirm the reported desktop issues from screenshots: empty gallery surface, broken footer, oversized type, favicon mismatch, repeated imagery.
- [x] Fix the shared public CSS syntax/layout issue affecting footer rendering.
- [x] Reduce desktop landing type scale without shrinking the layout back into the old small-image feel.
- [x] Replace repeated bitmap usage with unique public/generated assets and add one new repo image where needed.
- [x] Ensure below-the-fold section images render reliably on desktop by adjusting loading strategy.
- [x] Replace `apps/admin/src/app/favicon.ico` with OmaLeima branding and add matching app-dir icon files.
- [x] Re-run admin validation, local desktop smoke, production deploy, and update `PROGRESS.md`.

## Current Todos (Admin Web Panel Tab Navigation)

- [x] Add `.tab-nav`, `.tab-btn`, `.tab-btn-active` CSS classes to globals.css.
- [x] Reduce `.announcement-card-image` from 16/9 aspect-ratio to 80px thumbnail height.
- [x] Add 3-tab navigation to `club-rewards-panel.tsx` (Event Catalog | Create Reward | Reward Catalog).
- [x] Add 3-tab navigation to `club-events-panel.tsx` (Memberships | Create Event | Manage Events).
- [x] Add 2-tab navigation to `announcements-panel.tsx` (Compose | Announcements).
- [x] Add 2-tab navigation to `club-claims-panel.tsx` (Event Queue | Recent Claims).
- [x] Add 3-tab navigation to `club-department-tags-panel.tsx` (Community Catalog | Publish Tag | Tag Catalog).
- [x] Convert `business-applications-panel.tsx` to client component and add 2-tab navigation (Pending Queue | Decisions).
- [x] Convert `oversight-panel.tsx` to client component and add 3-tab navigation (Clubs & Events | Fraud Signals | Audit Logs).
- [x] Convert `department-tags-panel.tsx` to client component and add 3-tab navigation (Moderation Queue | Custom Tags | Recent Outcomes).
- [x] Run `npm --prefix apps/admin run typecheck` — zero errors.
- [x] Run `npm --prefix apps/admin run lint` — zero warnings/errors.
- [x] Update PROGRESS.md handoff.



- [x] Re-read project rules, master plan, progress, todos, and plan.
- [x] Inspect available security smoke scripts and native simulator/device audit scripts.
- [x] Confirm local Supabase/Docker readiness before trusting any dynamic regression result.
- [x] Re-run the focused admin password-session guard smoke.
- [x] Re-run feasible mobile audits for simulator wiring, reward notification bridge, native push readiness, hosted scan readiness, and realtime readiness.
- [x] Attempt iOS simulator discovery, defaults setup, boot, and build/run via `xcodebuildmcp`.
- [ ] Re-run the local stack dependent auth/RLS/scan/push smokes after Docker + Supabase local services are restored.
- [ ] Resolve or consciously re-baseline the failing mobile native push diagnostics audit with the frontend owner.
- [x] Update `PROGRESS.md` handoff with exact proof gaps and feasible next steps.

## Current Todos (Repository Security Scan + Auth Session Hardening)

- [x] Re-read project rules, master plan, progress, todos, plan, review, and relevant admin/mobile auth surfaces.
- [x] Complete repository-wide discovery across the highest-risk boundaries: session bootstrap, OAuth callback, Edge Functions, and RLS-backed mutations.
- [x] Record the surviving auth findings and the planned fixes in working docs and scan artifacts.
- [x] Add a same-origin provenance guard to the admin password-session route before cookie session persistence.
- [x] Move the mobile Supabase auth client to PKCE and remove raw token deep-link session acceptance.
- [x] Run admin/mobile validation plus focused smoke checks for the hardened auth flows.
- [x] Update `PROGRESS.md` handoff and finalize the security scan report.

## Current Todos (Public Landing Desktop Gallery Refresh + Navbar Behavior)

- [x] Re-read project rules, master plan, progress, todos, plan, review, and the current public landing files.
- [x] Confirm the desktop cropping problem from the provided screenshots and map it to the shared public image-fit rules.
- [x] Update working docs for the landing desktop framing and navbar slice.
- [x] Re-read the latest user correction and confirm the contain-style framing is now too small.
- [x] Select stronger Desktop generated scene-photo assets and copy them into the public workspace.
- [x] Restore a larger cover-led desktop gallery and replace the weaker app-logo/mockup imagery.
- [x] Keep the fixed/floating navbar and mobile hamburger menu behavior intact.
- [x] Run admin validation and browser smoke on desktop/mobile.
- [x] Update `PROGRESS.md` handoff.

## Current Todos (App Store Screenshot Pack)

- [x] Re-read project rules, master plan, progress, todos, plan, and review.
- [x] Confirm current Apple-accepted iPhone and iPad screenshot target sizes.
- [x] Generate 5 iPhone and 5 iPad OmaLeima marketing screenshots.
- [x] Copy and resize the generated images into exact App Store export dimensions.
- [x] Verify output pixel sizes and update `PROGRESS.md` handoff.

## Current Todos (Business Media + Scanner Kiosk Audit)

- [x] Re-read project rules, master plan, progress, todos, plan, review, and active mobile media/scanner owners.
- [x] Confirm the reported broken event cover URL is a zero-byte Supabase storage object.
- [x] Verify current native iOS config already contains camera/location/photo usage strings and Expo native modules.
- [x] Confirm scanner-only business accounts are route-limited away from event join/leave management.
- [x] Remove the obsolete manual token scanner fallback from the business scanner.
- [x] Harden media handling notes and identify whether remaining failures are stale hosted data, old native build, or code defects.
- [x] Run mobile validation and update `PROGRESS.md` handoff.

## Current Todos (Hosted Scan RPC Signature Hotfix)

- [x] Re-read project rules, master plan, progress, todos, and plan after user reported the scanner 500.
- [x] Trace `scan_stamp_atomic` definitions and Edge Function RPC argument keys.
- [x] Confirm hosted Supabase currently lacks the 12-parameter `scan_stamp_atomic` signature.
- [x] Update REVIEW/PLAN/TODOS for the scanner RPC hotfix slice.
- [x] Add an idempotent migration that installs the selected event venue aware RPC signature and reloads PostgREST schema cache.
- [x] Apply the migration to hosted Supabase via MCP.
- [x] Re-query hosted `pg_proc` and verify the 12-parameter signature exists.
- [x] Run scoped local validation and update `PROGRESS.md` handoff.

## Current Todos (Admin + Organizer Web Panel Design Overhaul — Phase 1)

- [x] Re-read project rules, master plan, progress, todos, plan, current shell + dashboard files.
- [x] Inventory admin + club panel routes and identify cross-cutting layout debt.
- [x] Update working docs for Phase 1 of the web panel design overhaul.
- [x] Add `nav-icon.tsx` and extend `DashboardNavItem` with an optional `iconName`.
- [x] Add `page-header.tsx` and switch `DashboardShell` to render it instead of the photo-background hero.
- [x] Add `dashboard-shortcuts-grid.tsx` and shortcut models in `sections.ts` (admin + club).
- [x] Wire `/admin` and `/club` home pages to live count sources via existing read-model snapshots and remove the `Access policy -> /forbidden` nav item.
- [x] Add responsive media queries so the sidebar collapses cleanly on narrow viewports.
- [x] Run admin typecheck, lint, build, scoped diff-check.
- [x] Update `PROGRESS.md` handoff for the Phase 1 slice and outline Phase 2+ scope.

## Current Todos (Finnish Club Sales Presentation)

- [x] Re-read project rules, master plan, progress, todos, and plan.
- [x] Inspect Finnish appro/product notes and available brand imagery.
- [x] Update working docs for the presentation slice.
- [x] Generate the Finnish luxury club pitch PPTX.
- [x] Validate the generated PPTX file and slide structure.
- [x] Update `PROGRESS.md` handoff.

## Current Todos (Partner Presentation V2)

- [x] Inspect Desktop generated images 1-11 and confirm available files.
- [x] Copy selected Desktop generated images into persistent presentation assets.
- [x] Rebuild the deck as a photo-led organizer + business partner presentation.
- [x] Remove startup/LLM-sounding Finnish phrasing from visible copy.
- [x] Validate the new PPTX package and visual preview.
- [x] Update `PROGRESS.md` handoff.

## Current Todos (Public Landing v4 Overflow + Icons)

- [x] Re-read project rules, master plan, progress, todos, plan, review, current public landing files, and frontend skill guidance.
- [x] Copy the selected previously generated haalarit/student and scan photos into public landing assets.
- [x] Update working docs for the public landing v4 polish slice.
- [x] Shorten stat values and remove the brand subtitle language text.
- [x] Add SVG icons to contact/social actions and footer links.
- [x] Tighten responsive typography/card constraints and enable smooth anchor scrolling.
- [x] Run admin validation, visual smoke, deploy if clean, and update `PROGRESS.md` handoff.

## Current Todos (Mobile Role Audit + Leaderboard Visibility + Notification Polish)

- [x] Re-read project rules, master plan, progress, todos, plan, and the concrete mobile owners for leaderboard, organizer home, and notification settings.
- [x] Confirm the leaderboard visibility bug at the read-model level.
- [x] Inspect organizer home metric ownership and notification/profile ownership before editing.
- [x] Update working docs for this audit/fix slice.
- [x] Widen student leaderboard discovery to include public and still-registered non-public leaderboard events without losing registered context.
- [x] Align student event discovery with registered non-public event visibility.
- [x] Correct organizer home summary totals so completed events do not inflate live operational metrics.
- [x] Localize and simplify student notification settings, hide the success-complete CTA, and remove the QA row.
- [x] Remove announcement impression counts from shared user-facing cards.
- [x] Run mobile validation, focused review, and update `PROGRESS.md` handoff.

## Current Todos (Public Landing v3 Navbar + Softer Hero)

- [x] Re-read project rules, master plan, progress, todos, plan, review, and current public landing files.
- [x] Generate/select OmaLeima-aligned no-text raster images for the landing.
- [x] Copy selected generated assets into `apps/admin/public/images/public`.
- [x] Update working docs for the v3 public landing polish slice.
- [x] Add a real public navbar and footer without exposing private admin routes.
- [x] Shorten/balance Finnish hero copy and soften responsive typography.
- [x] Widen the landing container and improve desktop/mobile section spacing.
- [x] Run admin typecheck, lint, build, scoped diff-check, and smoke.
- [ ] Update `PROGRESS.md` handoff after validation.

## Current Todos (Bilingual Public Landing v2 + Imagegen)

- [x] Re-read project rules, current public landing, metadata, and SEO baseline.
- [x] Generate and copy OmaLeima-aligned hero/supporting images into the admin public workspace.
- [x] Update working docs for the bilingual landing slice.
- [x] Replace the temporary single-page public root with a shared professional landing renderer.
- [x] Add an English public route and language-aware metadata.
- [x] Remove the public direct admin CTA and replace it with contact/interest actions.
- [x] Expand sitemap/SEO assets to reflect the bilingual public surface.
- [x] Run admin validation, deploy, and update handoff.

## Current Todos (Public Landing + Web Logo + SEO)

- [x] Re-read project rules, master plan, progress, todos, and plan.
- [x] Inspect current admin root redirect, layout metadata, brand lockups, and available app logo assets.
- [x] Update working docs for the public landing and SEO slice.
- [x] Copy the generated mobile app logo into admin public assets.
- [x] Replace text-only web brand marks with the real OmaLeima logo.
- [x] Add a minimal public root landing page for `omaleima.fi`.
- [x] Add Next.js metadata, manifest, robots, sitemap, and structured data.
- [x] Configure Vercel aliases for `omaleima.fi` and `www.omaleima.fi` after Zone.fi apex DNS points at Vercel.
- [x] Run admin validation and update handoff.

## Current Todos (Business History Filters + Leaderboard Spotlight + Typography Audit)

- [x] Re-read changed working docs and inspect current business history, leaderboard spotlight, and typography token owners.
- [x] Confirm whether history filters/stats can be computed from the existing mobile scan query without a backend change.
- [x] Update the business history query/window and rebuild the screen with stats plus date/event filters.
- [x] Upgrade the `Sinun tilanteesi` spotlight with a theme-safe gradient treatment.
- [x] Finish the typography audit, validate touched files, and update handoff.

## Completed Todos (Previous Waves)

- [x] Complete the database, edge function, mobile MVP, scanner, admin, QA, push, hosted dry-run, support, theme/language, redesign foundation, business media upload, club mobile operations, reward cover slider, verified report fixes, scanner policy, media fallback, business timeline, active event membership, media recovery, scanner duplicate UX, scanner kiosk polish, and mobile announcement feed route slices recorded in `PROGRESS.md`.

## Current Todos (Custom Domain Cutover)

- [x] Re-read project rules, master plan, progress, todos, and plan.
- [x] Inspect existing Vercel/Supabase custom-domain scripts and linked Vercel project config.
- [x] Confirm Vercel CLI auth and `omaleima-admin` production deployment readiness.
- [x] Confirm hosted Supabase Auth is preview-site-url ready and already includes `admin.omaleima.fi` redirect.
- [x] Confirm `admin.omaleima.fi` is blocked only by missing Zone.fi DNS.
- [x] User adds Zone.fi DNS record: `A admin.omaleima.fi 76.76.21.21`.
- [x] After DNS propagation, rerun `npm --prefix apps/admin run audit:custom-domain-cutover`.
- [x] After audit is `READY`, run Supabase Auth custom-domain dry-run and apply.
- [x] Smoke `https://admin.omaleima.fi/login` and hosted auth callback config.

## Current Todos (Scanner Sign-Out + Hosted Event Context Enforcement)

- [x] Re-read project rules, master plan, progress, todos, and plan.
- [x] Inspect the scanner screen, student QR event selection, local scan transport, and hosted `scan-qr` deployment state.
- [x] Update working docs for the scanner enforcement slice.
- [x] Add a top-right sign-out icon to the scanner screen.
- [x] Redeploy hosted `scan-qr` so mismatched event selection returns `EVENT_CONTEXT_MISMATCH` and does not stamp.
- [x] Run validation, verify the hosted function content, and update handoff.

## Current Todos (Tag Modal + Community Card Cleanup)

- [x] Re-read project rules, master plan, progress, todos, and plan.
- [x] Inspect the student tag modal, community announcement card, and public club card owners.
- [x] Update working docs for the tag/community cleanup slice.
- [x] Keep the custom department-tag input visible when the keyboard opens.
- [x] Remove the duplicate notification icon and duplicate read state from community announcement cards.
- [x] Enlarge public student club cards and add an info/contact sheet.
- [x] Run mobile validation, focused review, and update handoff.

## Current Todos (App Logo Assets)

- [x] Read project rules, master plan, progress, todos, and plan.
- [x] Inspect existing Expo icon configuration and mobile asset paths.
- [x] Copy the generated OmaLeima logo source into mobile assets.
- [x] Generate Apple and Android store-size PNG exports.
- [x] Update Expo config to use the new OmaLeima icon assets.
- [x] Verify icon dimensions and alpha state.
- [x] Run mobile config validation.
- [x] Update `PROGRESS.md` handoff.

## Current Todos (Business/Club Tabs + Home Announcement Rails)

- [x] Read project rules, master plan, progress, todos, and plan.
- [x] Inspect the student tab shell, business/club layouts, announcement home/profile surfaces, leima pass, and club announcement upload/date owners.
- [x] Update working docs for the new navigation/announcement slice.
- [x] Replace `business` and `club` mobile stack shells with student-style bottom tabs.
- [x] Move student announcements off profile and present student/business home announcements as rails.
- [x] Center leima pass slots and move the pass stats into a shared bar visible in both QR and pass views.
- [x] Reuse the local calendar editor for `startsAt`/`endsAt` in mobile club announcements.
- [x] Fix announcement-media storage policy so club announcement image upload no longer fails RLS.
- [x] Run `get_errors` on touched mobile files.
- [x] Run mobile `typecheck` and `lint`.
- [x] Run code review subagent and resolve actionable findings.
- [x] Update `PROGRESS.md` handoff.

## Current Todos (Organizer Home Cleanup + Student Club Discovery)

- [x] Re-read the relevant organizer and student mobile surfaces and confirm active clubs are already publicly readable.
- [x] Remove the organizer home quick-action row and home announcement rail.
- [x] Move organizer sign-out to the home header and remove the duplicate profile sign-out surface.
- [x] Add a typed public club directory query for students.
- [x] Show the active club count and horizontal club list on the student events home screen.
- [x] Fix the follow-up local style regression in `club/home.tsx` found by typecheck/lint.
- [x] Expand localized join failure notices and add optional email validation from code-review findings.
- [x] Re-run `get_errors`, mobile `typecheck`, mobile `lint`, scoped `git --no-pager diff --check`, and `code-reviewer`.
- [x] Update `PROGRESS.md` handoff.

## Current Todos (Card Consistency + Community + Event Freshness)

- [x] Re-read project rules, master plan, progress, todos, and plan.
- [x] Inspect current student/business/club layouts, event lists, card rails, public club query, and refresh support.
- [x] Update working docs before code edits.
- [x] Add shared pull-to-refresh support to `AppScreen` and event screens.
- [x] Move student updates + clubs to a visible community tab and hide profile from the tab bar.
- [x] Redesign active club cards with Finnish/English-only copy.
- [x] Filter organizer completed/cancelled events out of upcoming/edit lists and show ended events separately.
- [x] Normalize rail/card heights across touched mobile surfaces.
- [x] Add simultaneous-event warning surfaces.
- [x] Run mobile validation, code review, and update handoff.

## Current Todos (Profile CTA + Form Isolation)

- [x] Re-read project rules, master plan, progress, todos, and plan after compact.
- [x] Inspect the student profile CTA anchors and organizer event form screen composition.
- [x] Update working docs for the decluttering slice.
- [x] Add a shared localized student profile header CTA and use it across student header screens.
- [x] Split organizer event management into filtered list/history/form views so create/edit only shows the form.
- [x] Run mobile validation, focused code review, and update handoff.

## Current Todos (Rail Height + Multi Event QR/Scanner + Live Filters)

- [x] Re-read project rules, master plan, progress, todos, and plan after compact.
- [x] Inspect shared rail, student QR, business scanner, and organizer live filter owners.
- [x] Update working docs for the rail and multi-event slice.
- [x] Add active-card adaptive height to the shared auto-advancing rail.
- [x] Add student QR event selection and tap-to-flip QR/leima cards.
- [x] Move and clarify business scanner multi-event selection.
- [x] Fix organizer live timeline classification for current-window events.
- [x] Run mobile validation, focused code review, and update handoff.

## Current Todos (Swipe QR + Scanner Guard + Announcement Detail)

- [x] Re-read project rules, master plan, progress, todos, and plan.
- [x] Inspect changed files plus QR, scanner, business event, navigation, and announcement owners.
- [x] Update working docs for the swipe QR and scanner guard slice.
- [x] Remove modal empty venue pill and polish business event action buttons.
- [x] Remove redundant back buttons from bottom-tab root pages.
- [x] Pass selected event context to `scan-qr` and reject wrong-event QR scans.
- [x] Replace student QR selector with swipeable hero event selection.
- [x] Replace business scanner event selector with swipeable event cards.
- [x] Add tiedotteet detail routes and make feed cards open them.
- [x] Run mobile/function validation and deep review subagents.
- [x] Update `PROGRESS.md` handoff.

## Current Todos (Scanner Density + Refresh Spinner + Swipe Clamp)

- [x] Re-read project rules, master plan, progress, todos, and plan.
- [x] Inspect current business scanner, OmaQR, announcement feed, and refresh-control surfaces.
- [x] Update working docs for the scanner density slice.
- [x] Compact business scanner copy and make the selected event card fit the screen.
- [x] Replace background-refetch pull-to-refresh spinners with manual refresh state.
- [x] Move announcement push preference action into a quieter but functional card header control.
- [x] Clamp student OmaQR swipe to one neighboring event per gesture.
- [x] Run mobile validation, focused review, and update handoff.

## Current Todos (Comprehensive Mobile UI Premium Redesign)

- [x] Fix club/profile.tsx successText style definition (was removed during replacement).
- [x] Fix business/history.tsx orphaned lineHeight property and duplicate style definitions.
- [x] Fix student/rewards.tsx duplicate railEyebrow style definition.
- [x] Run TypeScript check: `npx tsc --noEmit` — clean.
- [x] Run ESLint on all redesigned files — clean.
- [x] Update PROGRESS.md and TODOS.md handoff.

## Current Todos (OmaQR Overlay + Scanner-Only Tabs)

- [x] Re-read project rules, master plan, progress, todos, and plan.
- [x] Inspect scanner-only access, business tabs, business event action buttons, home camera-opening loading, and OmaQR profile CTA owners.
- [x] Update working docs for the scanner-only navigation slice.
- [x] Move OmaQR profile CTA over the hero image without pushing the hero down.
- [x] Add horizontal breathing room to business event card scanner/history/leave action rows.
- [x] Extend session access with scanner-only role awareness and route scanner-only accounts to scanner.
- [x] Hide scanner-only business tabs except scanner and history, and redirect hidden deep links.
- [x] Remove scanner-only home camera-opening loading surface.
- [x] Run mobile validation, focused review, and update handoff.

## Current Todos (Mobile Tab/Profile UI Regression Polish)

- [x] Re-read project rules, master plan, progress, todos, and plan.
- [x] Inspect tab layouts, shared tab icon rendering, business scanner top bar, and student profile surface.
- [x] Replace invalid MaterialIcons names that rendered as question marks.
- [x] Remove the bottom tab floating gap.
- [x] Keep scanner sign-out visible by letting title copy shrink first.
- [x] Remove visible native push diagnostics controls from student profile.
- [x] Restore profile hero ad-soyad using Google/Auth metadata before database display-name fallback.
- [x] Run typecheck, scoped ESLint, icon glyph-map validation, and iOS/Android visual smoke.
- [x] Update `PROGRESS.md` handoff.

## Current Todos (Student Navigation + QR Density + Leaderboard Simplification)

- [x] Re-read project rules, master plan, progress, todos, and plan.
- [x] Inspect student tab layout, My QR active-event layout, and leaderboard copy.
- [x] Shorten the student Community bottom-tab label without renaming the screen route.
- [x] Move My QR stamp/tier summary into compact QR metadata so the QR sits higher.
- [x] Remove redundant leaderboard explanatory text while preserving state handling.
- [x] Run typecheck, scoped ESLint, visual smoke, and update handoff.

## Next Queue

- [ ] Physical iPhone smoke: student community tab opens tiedotteet + clubs, profile header icon opens profile, and event discovery no longer duplicates these sections.
- [ ] Physical iPhone smoke: student profile `Ainejärjestötagit` modal keeps the custom-tag input visible above the keyboard and the create button remains tappable.
- [ ] Physical iPhone smoke: Yhteisö announcement cards show only one notification bell and one read/new status surface per card.
- [ ] Physical iPhone smoke: enlarged student club cards open the info modal, and club email launches the device mail client when a contact email exists.
- [ ] Physical iPhone smoke: pull-to-refresh reloads newly published organizer events for student and business event pages without app restart.
- [ ] Physical iPhone smoke: organizer completed events are marked `Päättynyt/Completed` only in ended/history contexts and do not appear in upcoming/edit selectors.
- [ ] Physical iPhone smoke: card rails keep equal heights with long Finnish/English content.
- [ ] Physical iPhone smoke: OmaQR multiple active events can be switched, the profile CTA stays above the hero, and tapping QR/leima faces flips the card both ways.
- [ ] Physical iPhone smoke: business scanner with two live joined events shows the event selector before the camera and scans into the selected event context.
- [ ] Hosted smoke: scanner Event A + student Event B must return `EVENT_CONTEXT_MISMATCH` and record no new stamp.
- [ ] Physical iPhone smoke: organizer `Tulossa -> Käynnissä` shows current-window `PUBLISHED` and `ACTIVE` events.
- [ ] Physical iPhone smoke: organizer home no longer shows quick actions or home announcements, header sign-out works once, and tabs still provide access to announcements/events/profile.
- [ ] Physical iPhone smoke: student events screen shows the active club count, club cards scroll cleanly, and logo/fallback rendering stays stable on weak network.
- [ ] Physical iPhone smoke: business and club bottom tabs preserve orientation and scanner-only users see only scanner/history, with no home/events/profile loading bounce.
- [ ] Physical iPhone smoke: student and business home announcement rails auto-advance, CTA/read/preference actions work, and full update feed still opens correctly.
- [ ] Physical iPhone smoke: active QR and leima pass both show the same shared stamp/tier bar and centered empty/full slots on narrow screens.
- [ ] Physical iPhone smoke: club announcement datetime picker behaves like the event editor and club image upload succeeds without RLS errors.
- [ ] Physical iPhone native reinstall once devices are online in Xcode; verify `NSCameraUsageDescription` no longer appears.
- [ ] Physical iPhone smoke: scanner-only login opens camera directly, first scan succeeds, second scan shows already-recorded result, history updates.
- [ ] Physical iPhone smoke: upload organizer profile cover/logo, organizer event cover, and business profile cover/logo, then confirm non-zero public images render across student/business/club screens.
- [ ] Visual acceptance: business joined event slider/popup on physical iPhone.
- [ ] Finish full role review after physical smoke: screen necessity, visual clutter, RLS, media, event management, scanner, and QR flow.
