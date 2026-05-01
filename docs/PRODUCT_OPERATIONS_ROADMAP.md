# Product Operations Roadmap

This document records the current product direction for event-day operations, organizer mobile access, announcements, and security. It is intentionally a roadmap, not an implementation changelog.

## External Context Checked

- Hameenkadun Appro event info: https://appro.fi/info/
- Hameenkadun Appro English overview: https://appro.fi/in-english/
- Tahko Appro info: https://www.tahkofest.fi/info/tahko-appro/
- University of Oulu interest society appro: https://www.oulu.fi/en/events/interest-society-appro-event-all-students
- Kide.app event marketplace examples: https://kide.app/

## Product Direction

OmaLeima should stay centered on Finnish student event culture: appropassi, leimat, haalarimerkit, checkpoints, afterparties, club organizers, and venue partners. The product should not become a generic QR app.

The secure QR scan remains the canonical leima path. The next usability improvement should reduce staff friction without weakening server-side verification.

## Event-Day Scanning

The current scanner flow is secure, but it is too heavy for a crowded counter if staff must repeatedly unlock the phone, pick the event, and recover from scan states.

The next scanner feature should be **event-day scanner mode**:

- staff signs in once before the shift
- scanner is locked to one event and one venue
- camera stays open and screen stays awake during the shift
- the UI has one dominant state: ready to scan
- success and failure use large visual, haptic, and sound feedback
- after a successful scan, staff sees the result and taps one obvious next action
- venue switching is allowed only for roles with explicit access
- manual token entry remains a fallback, not the default path

Security boundaries must stay server-owned:

- QR tokens stay short-lived and server-signed
- scan writes stay inside atomic RPC / Edge Function flow
- scanner user, business, venue, event, and device context are recorded
- duplicate, replayed, expired, and wrong-venue scans still fail explicitly
- offline scan confirmation should not mark a leima as earned until the server confirms it

Future scanner convenience options:

- named scanner devices for each venue
- staff PIN re-auth for shared devices
- optional guided-access/kiosk setup instructions
- event-day scanner health panel for organizers
- NFC or printed checkpoint codes only after the QR flow is proven in pilots

## `/club` Mobile Area

Organizer mobile access should be a separate role area, not a redirect into business scanner screens. Business screens are for venues and staff who give leimat. Club screens are for event operators who run the whole event.

Initial `/club` mobile scope:

- event-day dashboard
- active event status
- participant count and leima progress overview
- venue/checkpoint health overview
- reward claim queue
- organizer announcements
- safety/support broadcast
- quick links to web admin for heavy editing

Admin can stay web-only. Organizer and club staff should eventually work on both web and mobile because they operate events in the field.

## Announcements

OmaLeima needs two announcement systems.

### Platform Announcements

Platform admins can publish announcements that appear as in-app popups when users open the app.

Required properties:

- title and body
- target audience: all users, students, businesses, organizers, or specific event participants
- severity: info, operational, warning, critical
- start time and expiry time
- one-time dismissal per user
- audit log of creator and updates
- optional push delivery only when appropriate

### Organizer Announcements

Organizers can publish event- or club-scoped announcements.

Required properties:

- club id and optional event id
- target: registered participants, followers, venue staff, or claim-desk staff
- push opt-in and in-app feed visibility
- delivery log and failure state
- moderation/audit trail
- expiry time

Students should control notification preferences:

- platform updates
- organizer/club announcements
- event-day reminders
- reward unlocks
- quiet hours
- language

## Security Direction

Open sign-in is acceptable for students, but privileged surfaces must never rely on UI-only checks. Admin, organizer, and business powers must come from active memberships, invitations, and RLS-backed server checks.

Next security model improvements:

- invitation-based onboarding for business and club roles
- explicit accepted/active/suspended membership states
- platform admin can revoke access immediately
- organizer can invite club staff for scoped event work
- business owner/manager can invite scanner staff
- device assignment for scanner stations
- audit logs for event edits, announcement sends, reward claims, scan anomalies, and access changes
- fraud signals for repeated invalid QR, fast repeated scans, wrong venue attempts, and unusual device activity

## Data Model Slices To Build Later

The next backend slices should be small and explicit:

1. `scanner_devices`
   - business id, venue id, display name, status, last seen, assigned role
2. `event_stamp_rules`
   - event id, default max stamps per venue, degree/tier rules
3. `event_venue_rules`
   - event venue id, max stamps override, instructions, operational notes
4. `platform_announcements`
   - platform-owned announcement records and audience targeting
5. `announcement_reads`
   - per-user read/dismiss state
6. `organizer_announcements`
   - club/event-owned announcements
7. `notification_preferences`
   - channel-level opt-in state and quiet hours
8. `club_mobile_sessions` or equivalent read models
   - optimized event-day dashboard data for `/club`

## Recommended Implementation Order

1. Event-day scanner mode
2. `/club` mobile read-only event dashboard
3. Reward claim queue in `/club`
4. Platform announcements with in-app popup and read state
5. Organizer announcements with in-app feed
6. Organizer announcement push subscriptions
7. Invitation-based role onboarding
8. Event and venue stamp rule model
9. Scanner device assignment and optional kiosk hardening

This order keeps the pilot usable before adding broad communication and permission systems.

## Current Project Review Snapshot

The current MVP foundation is logically coherent:

- student login, event discovery, QR, rewards, leaderboard, support, theme, and language are already present
- business login, event joining, scanner, scan history, business profile media, and support are already present
- admin/club web covers platform admin, organizer events, rewards, claims, tags, oversight, hosted audits, and smoke scripts
- security-critical QR and stamp writes stay server-side through Edge Functions and atomic RPCs
- RLS policies and restricted RPC grants exist for the high-risk tables reviewed in this pass

No new immediate blocker was found during this review pass. The remaining gaps are product scope gaps, not small hidden bugs:

- scanner flow is secure but needs event-day/kiosk ergonomics before real crowded usage
- pure organizer mobile access needs `/club`, not business-screen reuse
- platform and organizer announcements need schema, read state, targeting, and push consent
- privileged roles need invitation and revocation flows before broad rollout
- event rules need configurable stamp limits and reward tiers for broader Finnish appro formats
- visual assets should keep using real uploaded event/business media first, then purpose-specific fallbacks

Visual direction after the asset pass:

- login onboarding uses general event-night imagery
- event discovery uses appropassi, entry, and QR checkpoint imagery
- My QR uses QR checkpoint imagery when no real event cover exists
- rewards and celebration use leima/pass-focused imagery
- leaderboard uses the main OmaLeima operation hero
- business scanner uses club-control imagery when the venue has no uploaded cover
- admin shell hero uses club-control imagery while login keeps the operation hero
- dark/light gravity-line textures are shared through the mobile screen shell at low opacity
