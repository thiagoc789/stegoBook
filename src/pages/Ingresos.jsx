import { useState } from 'react';
import { useApp } from '../lib/context';
import { add, remove, update } from '../lib/store';
import { PERSONAS } from '../lib/constants';
import { activoEn, resumenMes } from '../lib/finance';
import { currentMonth, dateLabel, monthLabel, today } from '../lib/format';
import {
  Card, confirmar, Empty, Field, Modal, MonthPicker, PersonaTag, Segmented, Stat,
} from '../components/ui';

function SalarioForm({ salario, onClose }) {
  const { yo } = useApp();
  const [f, setF] = useState(salario || { persona: yo, concepto: 'Salario', monto: '', desde: currentMonth(), hasta: '' });
  const s = (k) => (v) => setF((o) => ({ ...o, [k]: v?.target ? v.target.value : v }));
  const submit = async (e) => {
    e.preventDefault();
    const { id, ...rest } = f;
    const payload = { ...rest, monto: Number(f.monto), hasta: f.hasta || null };
    if (salario?.id) await update('salarios', salario.id, payload); else await add('salarios', payload);
    onClose();
  };
  return (
    <Modal title={salario ? 'Editar ingreso fijo' : 'Nuevo salario / ingreso fijo'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Persona"><Segmented options={PERSONAS} value={f.persona} onChange={s('persona')} /></Field>
        <Field label="Concepto"><input value={f.concepto} onChange={s('concepto')} required /></Field>
        <Field label="Monto mensual (neto, lo que llega a la cuenta)">
          <input type="number" inputMode="decimal" min="0" step="any" value={f.monto} onChange={s('monto')} required autoFocus />
        </Field>
        <div className="grid-2">
          <Field label="Desde"><input type="month" value={f.desde} onChange={s('desde')} required /></Field>
          <Field label="Hasta (opcional)"><input type="month" value={f.hasta || ''} onChange={s('hasta')} /></Field>
        </div>
        <button className="btn primary block">Guardar</button>
      </form>
    </Modal>
  );
}

function ExtraForm({ extra, onClose }) {
  const { yo } = useApp();
  const [f, setF] = useState(extra || { persona: yo, concepto: '', monto: '', fecha: today() });
  const s = (k) => (v) => setF((o) => ({ ...o, [k]: v?.target ? v.target.value : v }));
  const submit = async (e) => {
    e.preventDefault();
    const { id, ...rest } = f;
    const payload = { ...rest, monto: Number(f.monto) };
    if (extra?.id) await update('ingresos', extra.id, payload); else await add('ingresos', payload);
    onClose();
  };
  return (
    <Modal title="Ingreso extra" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Persona"><Segmented options={PERSONAS} value={f.persona} onChange={s('persona')} /></Field>
        <Field label="Concepto"><input value={f.concepto} onChange={s('concepto')} placeholder="Prima, bono, freelance, venta…" required autoFocus /></Field>
        <div className="grid-2">
          <Field label="Monto"><input type="number" inputMode="decimal" min="0" step="any" value={f.monto} onChange={s('monto')} required /></Field>
          <Field label="Fecha"><input type="date" value={f.fecha} onChange={s('fecha')} required /></Field>
        </div>
        <button className="btn primary block">Guardar</button>
      </form>
    </Modal>
  );
}

export default function Ingresos() {
  const { data, mes, fmt } = useApp();
  const [editS, setEditS] = useState(null);
  const [editE, setEditE] = useState(null);
  const r = resumenMes(data, mes);

  const extras = r.extras.sort((a, b) => b.fecha.localeCompare(a.fecha));

  const cambiarSalario = (s) => {
    const nuevo = window.prompt(`Nuevo monto para "${s.concepto}" de ${s.persona} a partir de ${monthLabel(mes)}:`, s.monto);
    if (!nuevo || Number(nuevo) <= 0) return;
    const [y, m] = mes.split('-').map(Number);
    const prev = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}`;
    update('salarios', s.id, { hasta: prev });
    add('salarios', { persona: s.persona, concepto: s.concepto, monto: Number(nuevo), desde: mes, hasta: s.hasta || null });
  };

  return (
    <div className="page">
      <div className="page-head">
        <h2>Ingresos</h2>
        <MonthPicker />
      </div>

      <div className="stats">
        <Stat label="Total del mes" value={fmt(r.ingresos)} tone="ok" />
        {PERSONAS.map((p) => (
          <Stat key={p} label={p} value={fmt(r.ingresoPorPersona[p])}
            sub={r.ingresos ? `${Math.round((r.ingresoPorPersona[p] / r.ingresos) * 100)}% del hogar` : ''} />
        ))}
        <Stat label="Extras" value={fmt(r.ingresoExtras)} sub={`${extras.length} ingresos`} />
      </div>

      <Card title="💼 Salarios e ingresos fijos" action={<button className="btn primary sm" onClick={() => setEditS({})}>+ Salario</button>}>
        {data.salarios.length === 0 ? <Empty emoji="💼">Agreguen el salario de Stephania y el de Santiago.</Empty> : (
          <ul className="list">
            {[...data.salarios].sort((a, b) => (b.desde || '').localeCompare(a.desde || '')).map((s) => {
              const activo = activoEn(s, mes);
              return (
                <li key={s.id} className={activo ? '' : 'muted-row'}>
                  <PersonaTag p={s.persona} />
                  <div className="grow">
                    <b>{s.concepto}</b>
                    <small>desde {monthLabel(s.desde, true)}{s.hasta ? ` hasta ${monthLabel(s.hasta, true)}` : ' · vigente'}</small>
                  </div>
                  <strong>{fmt(s.monto)}</strong>
                  <div className="row gap-s">
                    {activo && !s.hasta && <button className="icon-btn" title="Cambió el salario" onClick={() => cambiarSalario(s)} aria-label="Cambiar salario">📈</button>}
                    <button className="icon-btn" onClick={() => setEditS(s)} aria-label="Editar">✏️</button>
                    <button className="icon-btn danger" onClick={() => confirmar() && remove('salarios', s.id)} aria-label="Eliminar">🗑</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="muted small">Si a alguien le suben el sueldo usa 📈: se guarda el historial y los meses pasados no cambian.</p>
      </Card>

      <Card title={`🎉 Ingresos extra · ${monthLabel(mes)}`} action={<button className="btn primary sm" onClick={() => setEditE({})}>+ Extra</button>}>
        {extras.length === 0 ? <Empty emoji="🎉">Primas, bonos, freelance, ventas…</Empty> : (
          <ul className="list">
            {extras.map((x) => (
              <li key={x.id} className="clickable" onClick={() => setEditE(x)}>
                <PersonaTag p={x.persona} />
                <div className="grow"><b>{x.concepto}</b><small>{dateLabel(x.fecha)}</small></div>
                <strong className="txt-ok">+{fmt(x.monto)}</strong>
                <button className="icon-btn danger" onClick={(e) => { e.stopPropagation(); if (confirmar()) remove('ingresos', x.id); }} aria-label="Eliminar">🗑</button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editS && <SalarioForm salario={editS.id ? editS : null} onClose={() => setEditS(null)} />}
      {editE && <ExtraForm extra={editE.id ? editE : null} onClose={() => setEditE(null)} />}
    </div>
  );
}
