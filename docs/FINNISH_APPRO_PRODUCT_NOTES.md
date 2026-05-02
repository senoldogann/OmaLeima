# Finnish Appro Product Notes

This document captures current product assumptions for OmaLeima after checking Finnish student appro examples. It is not a changelog; it is the current roadmap context for event-rule and event-day UX work.

## Sources Checked

- Supabase Storage Access Control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase public Storage assets: https://supabase.com/docs/guides/storage/serving/downloads
- Expo ImagePicker: https://docs.expo.dev/versions/latest/sdk/imagepicker/
- University of Oulu interest society appro: https://www.oulu.fi/en/events/interest-society-appro-event-all-students
- Hameenkadun Appro info: https://appro.fi/info/
- Hameenkadun Appro in English: https://appro.fi/in-english/
- Tahko Appro info: https://www.tahkofest.fi/info/tahko-appro/
- Dumppi haalarietiketti: https://dumppi.fi/uusi-opiskelija/haalarietiketti/

## Observed Event Pattern

- An appro is a checkpoint route where students collect stamps into an appropassi.
- Stamps can come from bars, restaurants, partner stands, food stalls, tasks, or checkpoint challenges.
- Students usually receive a haalarimerkki or degree-level reward after collecting enough stamps.
- Stamp thresholds differ by event. Hameenkadun Appro uses degree levels such as Approbatur, Cum Laude, Laudatur, Tohtori, and Emeritus.
- Venue limits differ by event and participant level. Some events accept one stamp per venue, while Tahko Appro allows a maximum of two stamps from the same restaurant.
- Some events include a fixed collection window, afterparty access, wristband exchange, official venue posters, and limited patch inventory.
- Haalarimerkit are culturally important because students sew them onto haalarit and use them as visible student-history artifacts.

## Current OmaLeima Fit

- The QR token, scanner, stamp, reward, leaderboard, and support foundation matches the core appropassi flow.
- Business profile media now supports real venue identity through uploaded logo and cover images.
- The current hard invariant `1 student + 1 event + 1 venue = maximum 1 leima` is good for the first pilot, but it is not broad enough for all Finnish appro formats.

## Product Gaps To Plan Next

- Event-level degree tiers:
  - label, required stamp count, display order, and inventory policy
  - examples: `Approbatur 7`, `Cum Laude 9`, `Laudatur 12`, `Tohtori 15`
- Event and venue stamp limits:
  - default max stamps per venue
  - optional venue-specific override
  - optional participant-level override for advanced degrees
- Venue/checkpoint metadata:
  - official venue status
  - opening hours during the event
  - alcohol-free option availability
  - student offer text
  - task/challenge instructions
  - queue or operational notes for staff
- Reward claim desk:
  - separate scanner/operator role for handing out haalarimerkit
  - claim cutoff time and inventory visibility
  - proof screen for collected stamps and unlocked tier
- Event-day guidance:
  - map/list of suorituspaikat
  - wristband or afterparty instructions when the event uses them
  - support/safety information and organizer announcements
- Student memory layer:
  - venue-logo based stamp animation after a successful leima
  - collected leima timeline or diary after the event
  - haalarimerkki unlock state that feels like a real patch earned, not a generic badge

## Recommended Sequence

1. Finish the current Storage-backed business media flow.
2. Add a small, explicit event-rule schema for stamp tiers and per-venue limits.
3. Add admin/club UI for those rules before changing scanner behavior.
4. Extend scanner RPCs to enforce the new limit model atomically.
5. Add student-facing event details for venue rules, offers, alcohol-free options, and claim instructions.
6. Add reward claim desk tooling after the tier model is stable.

## Related Operations Plan

The broader event-day operations, `/club` mobile, announcement, push subscription, and access-control roadmap now lives in `docs/PRODUCT_OPERATIONS_ROADMAP.md`.
