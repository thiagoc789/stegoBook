import { useEffect } from 'react';
import { useApp } from '../lib/context';
import { addMonths, currentMonth, monthLabel } from '../lib/format';
import { categorias, COLOR_PERSONA, EMOJI_PERSONA } from '../lib/constants';

export function Card({ title, action, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="card-head">
          {title && <h3>{title}</h3>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, tone }) {
  return (
    <div className={`stat ${tone ? `tone-${tone}` : ''}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

export function Progress({ value, color, warn = 0.8 }) {
  const v = Math.max(0, Math.min(1, value || 0));
  const auto = value > 1 ? 'var(--danger)' : value >= warn ? 'var(--warn)' : 'var(--ok)';
  return (
    <div className="progress"><div style={{ width: `${v * 100}%`, background: color || auto }} /></div>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={title}>
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Empty({ emoji = '🌱', children }) {
  return <div className="empty"><span>{emoji}</span><p>{children}</p></div>;
}

export function MonthPicker() {
  const { mes, setMes } = useApp();
  return (
    <div className="month-picker">
      <button className="icon-btn" onClick={() => setMes(addMonths(mes, -1))} aria-label="Mes anterior">‹</button>
      <input type="month" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} aria-label="Mes" />
      <span className="month-label">{monthLabel(mes)}</span>
      <button className="icon-btn" onClick={() => setMes(addMonths(mes, 1))} aria-label="Mes siguiente">›</button>
      {mes !== currentMonth() && <button className="btn ghost sm" onClick={() => setMes(currentMonth())}>Hoy</button>}
    </div>
  );
}

export function PersonaTag({ p }) {
  return (
    <span className="tag" style={{ '--c': COLOR_PERSONA[p] || '#64748b' }}>
      {EMOJI_PERSONA[p] || '👤'} {p}
    </span>
  );
}

export function CategoriaSelect({ value, onChange }) {
  const { config } = useApp();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {categorias(config).map((c) => <option key={c.nombre} value={c.nombre}>{c.emoji} {c.nombre}</option>)}
    </select>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value;
        const l = typeof o === 'string' ? o : o.label;
        return (
          <button type="button" key={v} className={value === v ? 'active' : ''} onClick={() => onChange(v)}>{l}</button>
        );
      })}
    </div>
  );
}

export function confirmar(msg = '¿Seguro que quieres eliminar esto?') {
  return window.confirm(msg);
}
