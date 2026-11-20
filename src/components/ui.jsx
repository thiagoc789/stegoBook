import { useEffect, useState } from 'react';
import { useApp } from '../lib/context';
import { addMonths, currentMonth, monthLabel } from '../lib/format';
import { COLOR_PERSONA, EMOJI_PERSONA, INICIO_APP } from '../lib/constants';

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

export function Progress({ value, color }) {
  const v = Math.max(0, Math.min(1, value || 0));
  const auto = value > 1 ? 'var(--danger)' : value >= 0.85 ? 'var(--warn)' : 'var(--ok)';
  return <div className="progress"><div style={{ width: `${v * 100}%`, background: color || auto }} /></div>;
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => { window.removeEventListener('keydown', onKey); document.body.classList.remove('no-scroll'); };
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={title}>
        <header className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">✕</button>
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
  return <div className="empty"><span>{emoji}</span><div>{children}</div></div>;
}

export function MonthPicker() {
  const { mes, setMes } = useApp();
  const min = currentMonth() < INICIO_APP ? currentMonth() : INICIO_APP;
  return (
    <div className="month-picker">
      <button type="button" className="icon-btn" disabled={mes <= min} onClick={() => setMes(addMonths(mes, -1))} aria-label="Mes anterior">‹</button>
      <span className="month-label">{monthLabel(mes)}</span>
      <button type="button" className="icon-btn" onClick={() => setMes(addMonths(mes, 1))} aria-label="Mes siguiente">›</button>
    </div>
  );
}

export function PersonaTag({ p }) {
  return <span className="tag" style={{ '--c': COLOR_PERSONA[p] || '#64748b' }}>{EMOJI_PERSONA[p] || '👤'} {p}</span>;
}

export function TipoTag({ tipo }) {
  return tipo === 'gusto'
    ? <span className="tag" style={{ '--c': '#ec4899' }}>✨ gusto</span>
    : <span className="tag" style={{ '--c': '#0ea5e9' }}>✅ necesidad</span>;
}

export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`segmented ${className}`}>
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value;
        const l = typeof o === 'string' ? o : o.label;
        return <button type="button" key={String(v)} className={value === v ? 'active' : ''} onClick={() => onChange(v)}>{l}</button>;
      })}
    </div>
  );
}

/** Campo de dinero: muestra separadores de miles mientras escriben. */
export function MoneyInput({ value, onChange, className = '', ...rest }) {
  const [txt, setTxt] = useState(value ? Number(value).toLocaleString('es-CO') : '');
  useEffect(() => {
    const n = Number(String(txt).replace(/\D/g, ''));
    if ((n || '') !== (Number(value) || '')) setTxt(value ? Number(value).toLocaleString('es-CO') : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className={`money-input ${className}`}>
      <span>$</span>
      <input
        inputMode="numeric" autoComplete="off" placeholder="0" value={txt}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, 13);
          setTxt(digits ? Number(digits).toLocaleString('es-CO') : '');
          onChange(digits ? Number(digits) : '');
        }}
        {...rest}
      />
    </div>
  );
}

/** Reemplaza {m} y {m2} de un texto por montos formateados. */
export function TextoMonto({ s }) {
  const { fmt } = useApp();
  const parts = s.texto.split(/(\{m2?\})/);
  return parts.map((p, i) => (p === '{m}' ? <b key={i}>{fmt(s.monto)}</b> : p === '{m2}' ? <b key={i}>{fmt(s.monto2)}</b> : p));
}

export const confirmar = (msg = '¿Seguro que quieres eliminar esto?') => window.confirm(msg);
