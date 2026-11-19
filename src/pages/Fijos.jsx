import { useState } from 'react';
import { useApp } from '../lib/context';
import { add, remove, update } from '../lib/store';
import { FRECUENCIAS, infoCategoria, PAGADORES } from '../lib/constants';
import { fijoAplicaEn, fijoMensualizado } from '../lib/finance';
import { currentMonth, monthLabel } from '../lib/format';
import {
  Card, CategoriaSelect, confirmar, Empty, Field, Modal, MonthPicker, PersonaTag, Segmented, Stat,
} from '../components/ui';

function FijoForm({ fijo, onClose }) {
  const { yo } = useApp();
  const [f, setF] = useState(fijo || {
    concepto: '', monto: '', categoria: 'Vivienda', pagadoPor: yo, dia: 1,
    frecuencia: 'mensual', desde: currentMonth(), hasta: '',
  });
  const s = (k) => (v) => setF((o) => ({ ...o, [k]: v?.target ? v.target.value : v }));
  const submit = async (e) => {
    e.preventDefault();
    const { id, ...rest } = f;
    const payload = { ...rest, monto: Number(f.monto), dia: Number(f.dia) || 1, hasta: f.hasta || null };
    if (fijo?.id) await update('gastosFijos', fijo.id, payload);
    else await add('gastosFijos', { ...payload, pagados: {} });
    onClose();
  };
  return (
    <Modal title={fijo ? 'Editar gasto fijo' : 'Nuevo gasto fijo'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Concepto"><input value={f.concepto} onChange={s('concepto')} placeholder="Arriendo, internet, Netflix…" required autoFocus /></Field>
        <div className="grid-2">
          <Field label="Monto"><input type="number" inputMode="decimal" min="0" step="any" value={f.monto} onChange={s('monto')} required /></Field>
          <Field label="Categoría"><CategoriaSelect value={f.categoria} onChange={s('categoria')} /></Field>
        </div>
        <div className="grid-2">
          <Field label="Frecuencia">
            <select value={f.frecuencia} onChange={s('frecuencia')}>
              {Object.entries(FRECUENCIAS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="Día de pago"><input type="number" min="1" max="31" value={f.dia} onChange={s('dia')} /></Field>
        </div>
        <div className="grid-2">
          <Field label="Desde (mes)" hint={f.frecuencia !== 'mensual' ? 'Primer mes en que se cobra.' : undefined}>
            <input type="month" value={f.desde} onChange={s('desde')} required />
          </Field>
          <Field label="Hasta (opcional)" hint="Déjalo vacío si no tiene fin."><input type="month" value={f.hasta || ''} onChange={s('hasta')} /></Field>
        </div>
        <Field label="¿Quién lo paga?"><Segmented options={PAGADORES} value={f.pagadoPor} onChange={s('pagadoPor')} /></Field>
        <button className="btn primary block">Guardar</button>
      </form>
    </Modal>
  );
}

export default function Fijos() {
  const { data, mes, fmt, config } = useApp();
  const [edit, setEdit] = useState(null);

  const delMes = data.gastosFijos.filter((f) => fijoAplicaEn(f, mes)).sort((a, b) => (a.dia || 0) - (b.dia || 0));
  const todos = [...data.gastosFijos].sort((a, b) => a.concepto.localeCompare(b.concepto));
  const total = delMes.reduce((a, f) => a + Number(f.monto), 0);
  const pagado = delMes.filter((f) => f.pagados?.[mes]).reduce((a, f) => a + Number(f.monto), 0);
  const mensualizado = data.gastosFijos.filter((f) => !f.hasta || f.hasta >= currentMonth()).reduce((a, f) => a + fijoMensualizado(f), 0);

  const togglePago = (f) => update('gastosFijos', f.id, { pagados: { ...(f.pagados || {}), [mes]: !f.pagados?.[mes] } });

  const finalizar = (f) => {
    if (confirmar(`¿Terminar "${f.concepto}"? Dejará de contarse desde el mes siguiente a ${monthLabel(mes)} (el historial se conserva).`)) {
      update('gastosFijos', f.id, { hasta: mes });
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h2>Gastos fijos</h2>
        <MonthPicker />
      </div>

      <div className="stats">
        <Stat label={`Fijos de ${monthLabel(mes)}`} value={fmt(total)} sub={`${delMes.length} pagos`} />
        <Stat label="Ya pagado" value={fmt(pagado)} tone="ok" sub={`${delMes.filter((f) => f.pagados?.[mes]).length} de ${delMes.length}`} />
        <Stat label="Por pagar" value={fmt(total - pagado)} tone={total - pagado > 0 ? 'warn' : 'ok'} />
        <Stat label="Provisión mensual" value={fmt(mensualizado)} sub="incluye anuales/semestrales repartidos" />
      </div>

      <Card title={`✅ Checklist de pagos · ${monthLabel(mes)}`} action={<button className="btn primary sm" onClick={() => setEdit({})}>+ Fijo</button>}>
        {delMes.length === 0 ? <Empty emoji="📅">Agreguen arriendo, servicios, suscripciones, cuotas…</Empty> : (
          <ul className="list">
            {delMes.map((f) => {
              const c = infoCategoria(f.categoria, config);
              const ok = !!f.pagados?.[mes];
              return (
                <li key={f.id} className={ok ? 'done' : ''}>
                  <input type="checkbox" className="check" checked={ok} onChange={() => togglePago(f)} aria-label="Pagado" />
                  <span className="cat-dot" style={{ "--c": c.color }}>{c.emoji}</span>
                  <div className="grow">
                    <b>{f.concepto}</b>
                    <small>Día {f.dia} · {FRECUENCIAS[f.frecuencia || 'mensual'].label} · {f.categoria}</small>
                  </div>
                  <div className="right"><strong>{fmt(f.monto)}</strong><PersonaTag p={f.pagadoPor} /></div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Todos los gastos fijos">
        {todos.length === 0 ? <Empty>Aún no hay gastos fijos.</Empty> : (
          <ul className="list">
            {todos.map((f) => {
              const c = infoCategoria(f.categoria, config);
              const terminado = f.hasta && f.hasta < currentMonth();
              return (
                <li key={f.id} className={terminado ? 'muted-row' : ''}>
                  <span className="cat-dot" style={{ "--c": c.color }}>{c.emoji}</span>
                  <div className="grow">
                    <b>{f.concepto}</b>
                    <small>
                      {FRECUENCIAS[f.frecuencia || 'mensual'].label} · desde {monthLabel(f.desde || currentMonth(), true)}
                      {f.hasta ? ` hasta ${monthLabel(f.hasta, true)}` : ''}
                      {f.frecuencia && f.frecuencia !== 'mensual' ? ` · ≈ ${fmt(fijoMensualizado(f))}/mes` : ''}
                    </small>
                  </div>
                  <strong>{fmt(f.monto)}</strong>
                  <div className="row gap-s">
                    <button className="icon-btn" onClick={() => setEdit(f)} aria-label="Editar">✏️</button>
                    {!f.hasta && <button className="icon-btn" onClick={() => finalizar(f)} title="Terminar" aria-label="Terminar">⏹</button>}
                    <button className="icon-btn danger" onClick={() => confirmar('¿Eliminar por completo? Se borrará también del historial.') && remove('gastosFijos', f.id)} aria-label="Eliminar">🗑</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {edit && <FijoForm fijo={edit.id ? edit : null} onClose={() => setEdit(null)} />}
    </div>
  );
}
