import { useState } from 'react';
import { useApp } from '../lib/context';
import { add, remove, update } from '../lib/store';
import { PERSONAS } from '../lib/constants';
import { estadoMeta, totalAhorradoMetas } from '../lib/finance';
import { addMonths, currentMonth, dateLabel, monthDiff, monthLabel, today } from '../lib/format';
import { Card, confirmar, Empty, Field, Modal, PersonaTag, Progress, Segmented, Stat } from '../components/ui';

const EMOJIS = ['🎯', '🏠', '✈️', '🚗', '💍', '👶', '🛟', '🎓', '💻', '🐶', '🏖️', '💰'];

export function MetaForm({ meta, onClose }) {
  const [f, setF] = useState(meta || { nombre: '', emoji: '🎯', objetivo: '', fechaLimite: '', tipo: 'meta', aportes: [] });
  const s = (k) => (v) => setF((o) => ({ ...o, [k]: v?.target ? v.target.value : v }));
  const submit = async (e) => {
    e.preventDefault();
    const { id, ...rest } = f;
    const payload = { ...rest, objetivo: Number(f.objetivo) };
    if (meta?.id) await update('metas', meta.id, payload); else await add('metas', payload);
    onClose();
  };
  return (
    <Modal title={meta?.id ? 'Editar meta' : 'Nueva meta de ahorro'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Ícono">
          <div className="emoji-pick">
            {EMOJIS.map((em) => <button type="button" key={em} className={f.emoji === em ? 'active' : ''} onClick={() => s('emoji')(em)}>{em}</button>)}
          </div>
        </Field>
        <Field label="Nombre"><input value={f.nombre} onChange={s('nombre')} placeholder="Fondo de emergencia, viaje a Cartagena…" required autoFocus /></Field>
        <div className="grid-2">
          <Field label="¿Cuánto necesitan?"><input type="number" min="0" inputMode="decimal" value={f.objetivo} onChange={s('objetivo')} required /></Field>
          <Field label="¿Para cuándo?"><input type="date" value={f.fechaLimite} onChange={s('fechaLimite')} /></Field>
        </div>
        <Field label="Tipo">
          <Segmented options={[{ value: 'meta', label: '🎯 Meta' }, { value: 'emergencia', label: '🛟 Fondo de emergencia' }]} value={f.tipo} onChange={s('tipo')} />
        </Field>
        <button className="btn primary block">Guardar</button>
      </form>
    </Modal>
  );
}

function AporteForm({ meta, onClose }) {
  const { yo } = useApp();
  const [f, setF] = useState({ monto: '', persona: yo, fecha: today(), retiro: false });
  const submit = async (e) => {
    e.preventDefault();
    const monto = Number(f.monto) * (f.retiro ? -1 : 1);
    await update('metas', meta.id, { aportes: [...(meta.aportes || []), { monto, persona: f.persona, fecha: f.fecha }] });
    onClose();
  };
  return (
    <Modal title={`${meta.emoji} ${meta.nombre}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Segmented options={[{ value: false, label: '➕ Aportar' }, { value: true, label: '➖ Retirar' }]} value={f.retiro} onChange={(v) => setF({ ...f, retiro: v })} />
        <Field label="Monto"><input className="big-input" type="number" min="0" inputMode="decimal" value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} required autoFocus /></Field>
        <div className="grid-2">
          <Field label="¿Quién?"><Segmented options={[...PERSONAS, 'Compartido']} value={f.persona} onChange={(v) => setF({ ...f, persona: v })} /></Field>
          <Field label="Fecha"><input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></Field>
        </div>
        <button className="btn primary block">Guardar</button>
      </form>
    </Modal>
  );
}

function ritmoAporte(meta) {
  const ap = (meta.aportes || []).filter((a) => a.monto > 0);
  if (!ap.length) return 0;
  const primero = ap.map((a) => a.fecha).sort()[0].slice(0, 7);
  const meses = Math.max(1, monthDiff(primero, currentMonth()) + 1);
  return ap.reduce((a, x) => a + x.monto, 0) / meses;
}

export default function Metas() {
  const { data, fmt, config } = useApp();
  const [edit, setEdit] = useState(null);
  const [aporte, setAporte] = useState(null);
  const [verHist, setVerHist] = useState(null);

  const metas = [...data.metas].sort((a, b) => estadoMeta(a).completa - estadoMeta(b).completa || (a.fechaLimite || '9').localeCompare(b.fechaLimite || '9'));
  const total = totalAhorradoMetas(data.metas);
  const cuotaTotal = data.metas.reduce((a, m) => a + (estadoMeta(m).cuotaMensual || 0), 0);
  const fijosMes = data.gastosFijos.filter((f) => !f.hasta || f.hasta >= currentMonth()).reduce((a, f) => a + Number(f.monto), 0);
  const tieneEmergencia = data.metas.some((m) => m.tipo === 'emergencia');

  return (
    <div className="page">
      <div className="page-head">
        <h2>Metas de ahorro</h2>
        <button className="btn primary" onClick={() => setEdit({})}>+ Nueva meta</button>
      </div>

      <div className="stats">
        <Stat label="Total ahorrado" value={fmt(total)} tone="ok" />
        <Stat label="Metas activas" value={data.metas.filter((m) => !estadoMeta(m).completa).length} />
        <Stat label="Necesitan ahorrar" value={fmt(cuotaTotal)} sub="al mes para cumplir a tiempo" />
      </div>

      {!tieneEmergencia && fijosMes > 0 && (
        <Card className="highlight">
          <p>🛟 <b>Consejo:</b> antes que cualquier otra meta, armen un <b>fondo de emergencia</b> de 3 a 6 meses de gastos fijos
            ({fmt(fijosMes * 3)} – {fmt(fijosMes * 6)}).</p>
          <button className="btn primary sm" onClick={() => setEdit({ nombre: 'Fondo de emergencia', emoji: '🛟', objetivo: Math.round(fijosMes * 6), tipo: 'emergencia', fechaLimite: `${addMonths(currentMonth(), 12)}-01`, aportes: [] })}>
            Crear fondo de emergencia
          </button>
        </Card>
      )}

      {metas.length === 0 ? <Card><Empty emoji="🎯">Una meta clara hace más fácil decir “no” a los gastos innecesarios.</Empty></Card> : (
        <div className="goals">
          {metas.map((m) => {
            const e = estadoMeta(m);
            const ritmo = ritmoAporte(m);
            const mesesAlRitmo = ritmo > 0 ? Math.ceil(e.falta / ritmo) : null;
            const vaTarde = e.mesesRestantes && mesesAlRitmo && mesesAlRitmo > e.mesesRestantes;
            return (
              <Card key={m.id} className={`goal ${e.completa ? 'complete' : ''}`}>
                <div className="goal-head">
                  <span className="goal-emoji">{m.emoji || '🎯'}</span>
                  <div className="grow">
                    <h3>{m.nombre}</h3>
                    <small className="muted">{m.fechaLimite ? `Para ${dateLabel(m.fechaLimite)}` : 'Sin fecha límite'}</small>
                  </div>
                  <button className="icon-btn" onClick={() => setEdit(m)} aria-label="Editar">✏️</button>
                  <button className="icon-btn danger" onClick={() => confirmar() && remove('metas', m.id)} aria-label="Eliminar">🗑</button>
                </div>
                <div className="goal-amount"><strong>{fmt(e.ahorrado)}</strong> <span className="muted">de {fmt(e.objetivo)}</span></div>
                <Progress value={e.progreso} color={e.completa ? 'var(--ok)' : 'var(--accent)'} />
                <div className="row-between small"><span>{Math.round(e.progreso * 100)}%</span><span>Faltan {fmt(e.falta)}</span></div>
                {e.completa ? <p className="txt-ok">🎉 ¡Meta cumplida!</p> : (
                  <ul className="goal-facts">
                    {e.cuotaMensual != null && <li>Deben ahorrar <b>{fmt(e.cuotaMensual)}/mes</b> durante {e.mesesRestantes} meses</li>}
                    {ritmo > 0 && <li>A su ritmo actual ({fmt(ritmo)}/mes) la cumplen en <b>{monthLabel(addMonths(currentMonth(), mesesAlRitmo))}</b></li>}
                    {vaTarde && <li className="txt-warn">⚠️ A este ritmo no llegan a tiempo</li>}
                    {e.aportesMes > 0 && <li>Este mes han aportado {fmt(e.aportesMes)}</li>}
                  </ul>
                )}
                <div className="row gap">
                  <button className="btn primary sm" onClick={() => setAporte(m)}>+ Aportar</button>
                  {(m.aportes || []).length > 0 && <button className="btn ghost sm" onClick={() => setVerHist(verHist === m.id ? null : m.id)}>Historial</button>}
                </div>
                {verHist === m.id && (
                  <ul className="list compact hist">
                    {[...(m.aportes || [])].reverse().map((a, i) => (
                      <li key={i}>
                        <PersonaTag p={a.persona} />
                        <span className="grow muted">{dateLabel(a.fecha)}</span>
                        <strong className={a.monto < 0 ? 'txt-danger' : 'txt-ok'}>{a.monto > 0 ? '+' : ''}{fmt(a.monto)}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {edit && <MetaForm meta={edit.id ? edit : (Object.keys(edit).length ? edit : null)} onClose={() => setEdit(null)} />}
      {aporte && <AporteForm meta={aporte} onClose={() => setAporte(null)} />}
      <p className="muted small center">Ahorro objetivo del hogar: {config.metaAhorroPct}% del ingreso (se cambia en Ajustes).</p>
    </div>
  );
}
