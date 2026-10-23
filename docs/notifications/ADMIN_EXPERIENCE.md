# AssetIQ Notifications Administrator Experience

## Landing page and daily workflow

The application opens on **Notification health**, a selected-organization overview for administrators. It summarizes unresolved critical and other conditions, repeated groups, and failed or retrying delivery attempts. The prioritized attention list opens the relevant Inbox thread; recent event activity opens Incoming Events; delivery issues open the related Delivery History rows.

Counts and lists are computed from the supplied local fixture and mock delivery records. Source state is distinct from the notification thread status. Acknowledging an Inbox thread does not acknowledge or resolve an alarm in LiftIQ.

## Notification Rules

Rules are listed as a readable summary of the event, scope, recipient, repeat preference, and enabled state. The five-step create/edit flow asks for:

1. Application, event type, severity, and a descriptive rule name.
2. All sample assets in the selected organization or one available fixture asset.
3. An eligible recipient group and one or more of its configured channels.
4. Group repeats, store a reminder interval, or store intent to notify for every occurrence.
5. A plain-language review before saving.

Configuration is saved only in local prototype state. Rules are not matched against incoming events and do not trigger delivery. Source lifecycle observations can be grouped in the event history; reminder scheduling and per-occurrence delivery are not implemented. Personal delivery preferences live separately under **Preferences**.

## Page responsibilities

- **Inbox:** review, acknowledge, mark read, or snooze notification threads; inspect lifecycle history and supported intelligence evidence.
- **Incoming Events:** inspect each source observation, processing outcome, and fixture-backed pattern assessment.
- **Recipients & Groups:** edit example membership, application eligibility, and available channels.
- **Preferences:** adjust personal, browser-local delivery preferences.
- **Delivery History:** inspect simulated recipient/channel attempts. Provider acceptance is not proof of receipt.
- **Audit Log:** inspect seeded and browser-local example records; this is not a durable audit store.
- **Administration:** see the selected organization context and required production connections. Identity/tenant access, event source, delivery providers, and persistent storage are not connected.

## Visual system

The application uses a small set of shared CSS tokens for its navy brand, blue actions, semantic alert colors, neutral surfaces, borders, typography, spacing, radii, and panel shadow. Shared table, form, status, and body text sizes are kept readable across pages; dense event and history tables remain horizontally scrollable on narrow screens rather than compressing their contents.

## Prototype boundary

The organization and role selectors are demonstration controls. The rule builder uses repository catalog and fixture values, and the dashboard uses the currently selected organization for its browser-side view. No backend enforces tenant scope or permissions. A production implementation needs authenticated organization and asset authorization, persistent rules and history, event ingestion and policy evaluation, and delivery provider integrations.
