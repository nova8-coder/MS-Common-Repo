import type { LiftIQEvent } from '../integrations/notifications/liftiqEvent'
import { buildNotificationThreadUrl, getNotificationInboxUrl } from '../integrations/notifications/liftiqEvent'

type Preview = { event: LiftIQEvent; unread: boolean }

export function NotificationBell({ previews }: { previews: Preview[] }) {
  const unreadCount = previews.filter(preview => preview.unread).length
  const inboxUrl = getNotificationInboxUrl()
  const label = unreadCount
    ? `Open AssetIQ Notifications inbox; ${unreadCount} unread mock notifications`
    : 'Open AssetIQ Notifications inbox; mock data'

  return (
    <details className="integration-notification-menu">
      <summary className="topbar-bell-btn" aria-label={label} title={label}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="integration-bell-count" aria-hidden="true">{unreadCount}</span>}
      </summary>
      <div className="integration-notification-dropdown" aria-label="Recent mock notifications">
        <div className="integration-notification-heading">
          <strong>Recent LiftIQ notifications</strong>
          <span>MOCK DATA</span>
        </div>
        {previews.length ? previews.slice(0, 3).map(({ event }) => (
          <a className="integration-notification-preview" href={buildNotificationThreadUrl(event)} key={event.eventId}>
            <b>{event.summary}</b>
            <small>{event.stationId} · {event.eventType}</small>
          </a>
        )) : <p className="integration-notification-empty">No supported active alarm fixtures.</p>}
        <a className="integration-notification-all" href={inboxUrl}>View all notifications</a>
        <small className="integration-notification-footnote">Unread count is based on LiftIQ demo alarm flags.</small>
      </div>
    </details>
  )
}
