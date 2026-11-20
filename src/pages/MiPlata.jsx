import { useState } from 'react';
import { useApp } from '../lib/context';
import { add, remove, removeMany, update } from '../lib/store';
import { CATEGORIAS, infoCategoria, INICIO_APP, PERSONAS } from '../lib/constants';
import { clasificar } from '../lib/clasificar';
import { activoEn, fijoAplicaEn, personaDe, tipoDe } from '../lib/finance';
import { addMonths, currentMonth, dateLabel, monthLabel, today } from '../lib/format';
import {
  Card, confirmar, Empty, Field, Modal, MoneyInput, PersonaTag, Segmented,
} from '../components/ui';

function SalarioForm({ persona, salario, onClose }) {
  const { mes, fmt: fmtMonto } = useApp();
  const [concepto, setConcepto] = useState(salario?.concepto || 'Salario');
  const [monto, setMonto] = useState(salario?.monto || '');
  const submit = async (e) => {
    e.preventDefault();
    const payload = { persona, concepto, monto: Number(monto) };
    if (!salario) {
      await add('salarios', { ...payload, desde: mes < currentMonth() ? mes : currentMonth(), hasta: null });
    } else if ((salario.desde || '') >= mes || Number(monto) === Number(salario.monto)) {
      await update('salarios', salario.id, payload);
    } else {
      // cambió el monto: se guarda historial para no alterar los meses anteriores
      await update('salarios', salario.id, { hasta: addMonths(mes, -1) });
      await add('salarios', { ...payload, desde: mes, hasta: salario.hasta || null });
    }
    onClose();
  };
  return (
    <Modal title={salario ? 'Cambiar ingreso fijo' : 'Ingreso fijo mensual'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Monto mensual (lo que llega a la cuenta)"><MoneyInput className="big" value={monto} onChange={setMonto} autoFocus /></Field>
        <Field label="Concepto"><input value={concepto} onChange={(e) => setConcepto(e.target.value)} /></Field>
        {salario && <p className="small muted">Si cambias el monto, aplica desde {monthLabel(mes)}; los meses anteriores no cambian.</p>}
        <button className="btn primary block" disabled={!Number(monto)}>Guardar</button>
        {salario && (
          <button type="button" className="btn ghost block danger-txt" onClick={() => { if (confirmar(`¿Eliminar "${salario.concepto}" de ${fmtMonto(salario.monto)}? Se borra de todos los meses.`)) { remove('salarios', salario.id); onClose(); } }}>
            Eliminar este ingreso
          </button>
        )}
      </form>
    </Modal>
  );
}

function ExtraForm({ persona, onClose }) {
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(today());
  const submit = async (e) => {
    e.preventDefault();
    await add('ingresos', { persona, concepto: concepto || 'Ingreso extra', monto: Number(monto), fecha });
    onClose();
  };
  return (
    <Modal title="Ingreso extra" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <MoneyInput className="big" value={monto} onChange={setMonto} autoFocus />
        <input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Prima, bono, venta, freelance…" />
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <button className="btn primary block" disabled={!Number(monto)}>Guardar</button>
      </form>
    </Modal>
  );
}

function FijoForm({ persona, fijo, onClose }) {
  const { mes } = useApp();
  const [f, setF] = useState(fijo || { concepto: '', monto: '', categoria: 'Vivienda', tipo: 'necesidad' });
  const [auto, setAuto] = useState(!fijo);
  const onConcepto = (v) => {
    const r = auto ? clasificar(v) : null;
    setF((o) => ({ ...o, concepto: v, ...(r ? { categoria: r.categoria, tipo: r.tipo } : {}) }));
  };
  const submit = async (e) => {
    e.preventDefault();
    const payload = { persona, concepto: f.concepto, monto: Number(f.monto), categoria: f.categoria, tipo: f.tipo };
    if (fijo?.id) await update('gastosFijos', fijo.id, payload);
    else await add('gastosFijos', { ...payload, frecuencia: 'mensual', desde: mes < currentMonth() ? mes : currentMonth(), hasta: null });
    onClose();
  };
  return (
    <Modal title={fijo ? 'Editar gasto fijo' : 'Nuevo gasto fijo'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <input value={f.concepto} onChange={(e) => onConcepto(e.target.value)} placeholder="Arriendo, internet, Netflix, gimnasio…" required autoFocus />
        <Field label="Monto mensual"><MoneyInput value={f.monto} onChange={(v) => setF({ ...f, monto: v })} /></Field>
        <Field label="Categoría">
          <select value={f.categoria} onChange={(e) => { setAuto(false); setF({ ...f, categoria: e.target.value, tipo: infoCategoria(e.target.value).tipo }); }}>
            {CATEGORIAS.map((c) => <option key={c.nombre} value={c.nombre}>{c.emoji} {c.nombre}</option>)}
          </select>
        </Field>
        <Segmented options={[{ value: 'necesidad', label: '✅ Necesidad' }, { value: 'gusto', label: '✨ Gusto' }]} value={f.tipo}
          onChange={(v) => { setAuto(false); setF({ ...f, tipo: v }); }} />
        {f.categoria === 'Deudas' && <p className="small txt-warn">💳 Las cuotas de créditos, tarjetas y préstamos agrégalas en la pestaña Deudas: allá se suman solas a tus fijos y ves cuándo terminas.</p>}
        <button className="btn primary block" disabled={!f.concepto || !Number(f.monto)}>Guardar</button>
      </form>
    </Modal>
  );
}

function Configuracion() {
  const { data, config, yo, setYo, fmt } = useApp();
  const [copiado, setCopiado] = useState(false);
  const base = `${window.location.origin}${window.location.pathname}`;
  const linkRapido = `${base}?rapido=1&quien=${yo}`;
  const enPrueba = currentMonth() < INICIO_APP;

  const borrarPrueba = async () => {
    if (!confirmar('Se borrarán TODOS los gastos del día a día, ingresos extra y aportes a metas de los dos. Se conservan salarios, gastos fijos y metas. ¿Continuar?')) return;
    await removeMany('gastos', data.gastos.map((g) => g.id));
    await removeMany('ingresos', data.ingresos.map((g) => g.id));
    for (const m of data.metas) if ((m.aportes || []).length) await update('metas', m.id, { aportes: [] }); // eslint-disable-line no-await-in-loop
    // salarios y fijos arrancan en diciembre
    for (const s of [...data.salarios, ...data.gastosFijos]) {
      const col = data.salarios.includes(s) ? 'salarios' : 'gastosFijos';
      if (s.hasta && s.hasta < INICIO_APP) await remove(col, s.id); // eslint-disable-line no-await-in-loop
      else if (!s.desde || s.desde < INICIO_APP) await update(col, s.id, { desde: INICIO_APP }); // eslint-disable-line no-await-in-loop
    }
    alert('Listo, quedó limpio para empezar 🎉');
  };

  const respaldo = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ ...data, config: [{ id: 'general', ...config }] }, null, 2)], { type: 'application/json' }));
    a.download = `stegobook-respaldo-${today()}.json`;
    a.click();
  };

  return (
    <>
      <Card title="⚡ Gasto rápido desde la pantalla de inicio">
        <p className="small"><b>Android:</b> en Chrome toca ⋮ → <i>Instalar app</i>. Luego mantén presionado el ícono de StegoBook → <i>Gasto rápido</i> y arrástralo a tu pantalla.</p>
        <p className="small"><b>iPhone:</b> abre la app <i>Atajos</i> → <i>＋</i> → acción <i>Abrir URL</i> con tu link (abajo) → <i>Compartir → Agregar a pantalla de inicio</i>. También puedes ponerlo en el widget de Atajos.</p>
        <div className="row gap">
          <input readOnly value={linkRapido} onFocus={(e) => e.target.select()} aria-label="Link de gasto rápido" />
          <button type="button" className="btn ghost sm" onClick={async () => { try { await navigator.clipboard.writeText(linkRapido); setCopiado(true); } catch { /* */ } }}>{copiado ? '✓' : 'Copiar'}</button>
        </div>
      </Card>

      <Card title="⚙️ Ajustes">
        <Field label="Este celular es de">
          <Segmented options={PERSONAS} value={yo} onChange={setYo} />
        </Field>
        <div className="row gap wrap mt">
          <button className="btn ghost sm" onClick={respaldo}>⬇ Descargar respaldo</button>
          <button className="btn ghost sm danger-txt" onClick={borrarPrueba}>🧹 Borrar datos de prueba</button>
        </div>
        {enPrueba && <p className="small muted mt">Estamos en construcción hasta el 1 de diciembre. Ese día usen “Borrar datos de prueba” para arrancar limpio ({data.gastos.length} gastos de prueba, {fmt(data.gastos.reduce((a, g) => a + Number(g.monto || 0), 0))}).</p>}
      </Card>
    </>
  );
}

export default function MiPlata() {
  const { data, mes, fmt, persona, setVista } = useApp();
  const [modal, setModal] = useState(null);

  if (!persona) {
    return (
      <div className="page">
        <Card title="¿De quién quieres configurar la plata?">
          <div className="row gap">{PERSONAS.map((p) => <button key={p} className="btn ghost grow" onClick={() => setVista(p)}><PersonaTag p={p} /></button>)}</div>
        </Card>
        <Configuracion />
      </div>
    );
  }

  const de = (x) => personaDe(x) === persona;
  const salarios = data.salarios.filter((s) => de(s) && activoEn(s, mes));
  const extras = data.ingresos.filter((i) => de(i) && (i.fecha || '').startsWith(mes));
  const fijos = data.gastosFijos.filter((f) => de(f) && fijoAplicaEn(f, mes)).sort((a, b) => b.monto - a.monto);
  const totalFijos = fijos.reduce((a, f) => a + Number(f.monto), 0);

  const quitarFijo = (f) => {
    if (!confirmar(`¿Dejar de contar "${f.concepto}" desde ${monthLabel(mes)}?`)) return;
    if ((f.desde || '') >= mes) remove('gastosFijos', f.id);
    else update('gastosFijos', f.id, { hasta: addMonths(mes, -1) });
  };

  return (
    <div className="page">
      <Card title="💼 Ingreso mensual" action={<button className="btn primary sm" onClick={() => setModal({ t: 'salario' })}>+ Agregar</button>}>
        {salarios.length === 0 ? <Empty emoji="💼">Agrega tu salario (lo que te llega cada mes).</Empty> : (
          <ul className="list">
            {salarios.map((s) => (
              <li key={s.id} className="clickable" onClick={() => setModal({ t: 'salario', item: s })}>
                <span className="cat-dot" style={{ '--c': '#10b981' }}>💼</span>
                <div className="grow"><b>{s.concepto}</b><small>Toca para cambiar el monto</small></div>
                <strong className="txt-ok">{fmt(s.monto)}</strong>
                <button className="icon-btn danger" aria-label="Eliminar"
                  onClick={(e) => { e.stopPropagation(); if (confirmar(`¿Eliminar "${s.concepto}" de ${fmt(s.monto)}? Se borra de todos los meses.`)) remove('salarios', s.id); }}>🗑</button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={`🎉 Ingresos extra · ${monthLabel(mes)}`} action={<button className="btn ghost sm" onClick={() => setModal({ t: 'extra' })}>+ Extra</button>}>
        {extras.length === 0 ? <p className="muted small">Primas, bonos, ventas… solo de este mes.</p> : (
          <ul className="list">
            {extras.map((x) => (
              <li key={x.id}>
                <span className="cat-dot" style={{ '--c': '#10b981' }}>🎉</span>
                <div className="grow"><b>{x.concepto}</b><small>{dateLabel(x.fecha)}</small></div>
                <strong className="txt-ok">+{fmt(x.monto)}</strong>
                <button className="icon-btn danger" onClick={() => confirmar() && remove('ingresos', x.id)} aria-label="Eliminar">🗑</button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={`📌 Gastos fijos · ${fmt(totalFijos)}/mes`} action={<button className="btn primary sm" onClick={() => setModal({ t: 'fijo' })}>+ Fijo</button>}>
        {fijos.length === 0 ? <Empty emoji="📌">Lo que pagas todos los meses: arriendo, servicios, plan de celular, suscripciones, cuotas…</Empty> : (
          <ul className="list">
            {fijos.map((f) => {
              const c = infoCategoria(f.categoria);
              return (
                <li key={f.id} className="clickable" onClick={() => setModal({ t: 'fijo', item: f })}>
                  <span className="cat-dot" style={{ '--c': c.color }}>{c.emoji}</span>
                  <div className="grow"><b>{f.concepto}</b><small>{f.categoria} · {tipoDe(f) === 'gusto' ? '✨ gusto' : '✅ necesidad'}</small></div>
                  <strong>{fmt(f.monto)}</strong>
                  <button className="icon-btn danger" onClick={(e) => { e.stopPropagation(); quitarFijo(f); }} aria-label="Quitar">🗑</button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Configuracion />

      {modal?.t === 'salario' && <SalarioForm persona={persona} salario={modal.item} onClose={() => setModal(null)} />}
      {modal?.t === 'extra' && <ExtraForm persona={persona} onClose={() => setModal(null)} />}
      {modal?.t === 'fijo' && <FijoForm persona={persona} fijo={modal.item} onClose={() => setModal(null)} />}
    </div>
  );
}
