import { useEffect } from 'react'
import { Check, X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Severity, ThreadStatus } from '../data/types'

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`badge severity-${severity.toLowerCase()}`}><i />{severity}</span>
}

export function StatusBadge({ status }: { status: ThreadStatus | string }) {
  return <span className={`badge status-${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span>
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="page-heading-action">{action}</div>}</div>
}

export function Drawer({ title, subtitle, children, onClose, wide = false }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const handle = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [onClose])
  return <div className="overlay" onMouseDown={onClose}><aside className={`drawer ${wide ? 'drawer-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => e.stopPropagation()}><header className="drawer-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></header><div className="drawer-content">{children}</div></aside></div>
}

export function Modal({ title, children, onClose, footer }: { title: string; children: ReactNode; onClose: () => void; footer?: ReactNode }) {
  useEffect(() => {
    const handle = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [onClose])
  return <div className="overlay modal-overlay" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={e => e.stopPropagation()}><header className="modal-header"><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></header><div className="modal-content">{children}</div>{footer && <footer className="modal-footer">{footer}</footer>}</section></div>
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const timer = window.setTimeout(onClose, 3200); return () => window.clearTimeout(timer) }, [onClose])
  return <div className="toast" role="status"><span className="toast-check"><Check size={15} /></span>{message}<button onClick={onClose} aria-label="Dismiss"><X size={15} /></button></div>
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return <div className="empty-state"><span className="empty-icon">—</span><strong>{title}</strong>{detail && <span>{detail}</span>}</div>
}

export function Toggle({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}><span /></button>
}
