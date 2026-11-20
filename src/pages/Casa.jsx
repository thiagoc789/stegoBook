import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../lib/context';
import { add, remove, set, update } from '../lib/store';
import { EMOJI_PERSONA, PERSONAS } from '../lib/constants';
import { estadoMeta } from '../lib/finance';
import {
  CATEGORIAS_CASA, costoMensual, deudasDe, fechaMeta, LISTA_SUGERIDA, participacion, PLAN_DEFAULT, totales, viviendaHoy,
} from '../lib/casa';
import { monthLabel } from '../lib/format';
import {
  Card, confirmar, Field, Modal, MoneyInput, Progress, Segmented,
} from '../components/ui';
import { AporteForm } from './Metas';

const NOMBRE_META = 'Irnos a vivir juntos';
const guardarPlan = (patch) => set('config', 'casa', patch);

/** Campo de dinero que guarda al salir del campo (para no escribir en la base de datos en cada tecla). */
function CampoPlan({ label, valor, k, hint }) {
  const [v, setV] = useState(valor);
  useEffect(() => setV(valor), [valor]);
  return (
    <Field label={label} hint={hint}>
      <MoneyInput value={v} onChange={setV} onBlur={() => Number(v || 0) !== Number(valor || 0) && guardarPlan({ [k]: Number(v) || 0 })} />
    </Field>
  );
}

function ItemForm({ item, onClose }) {
  const [f, setF] = useState(item || { nombre: '', categoria: 'Cocina', costo: '', prioridad: 'indispensable', estado: 'pendiente' });
  const s = (k) => (v) => setF((o) => ({ ...o, [k]: v?.target ? v.target.value : v }));
  const submit = async (e) => {
    e.preventDefault();
    const { id, ...rest } = f;
    const payload = { ...rest, costo: Number(f.costo) || 0 };
    if (item?.id) await update('casaItems', item.id, payload); else await add('casaItems', payload);
    onClose();
  };
  return (
    <Modal title={item ? 'Editar' : 'Agregar a la lista'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <input value={f.nombre} onChange={s('nombre')} placeholder="Ej: Nevera, cama, ollas…" required autoFocus={!item} />
        <Field label="Costo aproximado"><MoneyInput value={f.costo} onChange={s('costo')} /></Field>
        <Field label="Categoría">
          <select value={f.categoria} onChange={s('categoria')}>{CATEGORIAS_CASA.map((c) => <option key={c.nombre} value={c.nombre}>{c.emoji} {c.nombre}</option>)}</select>
        </Field>
        <Segmented options={[{ value: 'indispensable', label: '⭐ Indispensable' }, { value: 'despues', label: '⏳ Para después' }]} value={f.prioridad} onChange={s('prioridad')} />
        <Segmented options={[{ value: 'pendiente', label: 'Falta' }, { value: 'tengo', label: '🎁 Ya lo tenemos' }, { value: 'comprado', label: '✅ Comprado' }]} value={f.estado} onChange={s('estado')} />
        <button className="btn primary block">Guardar</button>
        {item && <button type="button" className="btn ghost block danger-txt" onClick={async () => { if (confirmar()) { await remove('casaItems', item.id); onClose(); } }}>Eliminar</button>}
      </form>
    </Modal>
  );
}

function Empezar() {
  const { data } = useApp();
  const [creando, setCreando] = useState(false);
  const arriendoHoy = PERSONAS.reduce((a, p) => a + viviendaHoy(data, p), 0);
  const empezar = async () => {
    setCreando(true);
    const existente = data.metas.find((m) => m.nombre === NOMBRE_META);
    const metaId = existente ? existente.id
      : await add('metas', { nombre: NOMBRE_META, emoji: '🏠', dueno: 'Ambos', objetivo: 0, fechaLimite: '', aportes: [], casa: true });
    await guardarPlan({ ...PLAN_DEFAULT, ...(arriendoHoy > 0 ? { arriendo: Math.round(arriendoHoy / 50000) * 50000 } : {}), metaId });
    if (!data.casaItems.length) for (const it of LISTA_SUGERIDA) await add('casaItems', it); // eslint-disable-line no-await-in-loop
  };
  return (
    <div className="page">
      <Card className="hero">
        <span className="goal-emoji">🏠</span>
        <h3>Plan para irnos a vivir juntos</h3>
        <p className="small">Arma la lista de lo indispensable (con precios aproximados que pueden cambiar), el arriendo y los gastos de la casa, y cuánto ahorran al mes. La app calcula <b>cuándo tendrían todo listo</b> y cuánto pone cada uno.</p>
        <button className="btn primary" disabled={creando} onClick={empezar}>{creando ? 'Creando…' : 'Empezar el plan'}</button>
      </Card>
    </div>
  );
}

export default function Casa({ go }) {
  const { data, casa, fmt } = useApp();
  const [modal, setModal] = useState(null);
  const [filtro, setFiltro] = useState('indispensable');
  const [ahorroTxt, setAhorroTxt] = useState(null);

  const plan = { ...PLAN_DEFAULT, ...(casa || {}) };
  const items = data.casaItems;
  const t = useMemo(() => totales(plan, items), [casa, items]); // eslint-disable-line react-hooks/exhaustive-deps
  const meta = data.metas.find((m) => m.id === plan.metaId) || data.metas.find((m) => m.nombre === NOMBRE_META);
  const ahorrado = meta ? estadoMeta(meta).ahorrado : 0;
  const falta = Math.max(0, t.indispensable - ahorrado);
  const deudas = deudasDe(data);
  const fecha = fechaMeta(falta, plan.ahorroMensual);
  const fechaDeudas = fechaMeta(falta, plan.ahorroMensual, deudas, { conDeudas: true });
  const part = participacion(data, plan);
  const mensualCasa = costoMensual(plan);

  // Mantiene la meta "Irnos a vivir juntos" sincronizada con el plan (aparece en Metas y en los topes de gustos)
  useEffect(() => {
    if (!casa || !meta) return;
    const objetivo = Math.round(t.indispensable);
    const fechaLimite = fecha ? `${fecha.mes}-28` : '';
    if (Number(meta.objetivo) !== objetivo || meta.fechaLimite !== fechaLimite) update('metas', meta.id, { objetivo, fechaLimite, casa: true });
  }, [casa ? 1 : 0, meta?.id, t.indispensable, fecha?.mes]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!casa) return <Empezar />;

  const lista = items.filter((i) => (filtro === 'despues' ? i.prioridad === 'despues' : i.prioridad !== 'despues'));
  const porCat = CATEGORIAS_CASA.map((c) => ({ ...c, items: lista.filter((i) => (i.categoria || 'Aseo y hogar') === c.nombre) })).filter((c) => c.items.length);
  const ciclo = { pendiente: 'comprado', comprado: 'tengo', tengo: 'pendiente' };

  return (
    <div className="page">
      <button className="link" onClick={() => go('metas')}>← Metas</button>

      <Card className="hero">
        <span className="muted">Tendrían todo lo indispensable en</span>
        <strong className="hero-num cap">{fecha ? monthLabel(fecha.mes) : '—'}</strong>
        {fecha && <span className="small muted">{fecha.meses === 0 ? '¡Ya tienen lo necesario! 🎉' : `en ${fecha.meses} ${fecha.meses === 1 ? 'mes' : 'meses'}, ahorrando ${fmt(plan.ahorroMensual)} al mes entre los dos`}</span>}
        <Progress value={t.indispensable ? ahorrado / t.indispensable : 0} color="var(--accent)" />
        <div className="hero-row"><span>Ahorrado <b>{fmt(ahorrado)}</b></span><span>Necesitan <b>{fmt(t.indispensable)}</b></span></div>
        {fechaDeudas && fecha && fechaDeudas.mes < fecha.mes && (
          <p className="small hero-note">💸 Si suman lo que se libera al terminar deudas: <b className="cap">{monthLabel(fechaDeudas.mes)}</b>.</p>
        )}
        {meta ? <button className="btn primary sm" onClick={() => setModal({ t: 'aporte' })}>+ Aportar al ahorro</button> : (
          <button className="btn primary sm" onClick={async () => {
            const id = await add('metas', { nombre: NOMBRE_META, emoji: '🏠', dueno: 'Ambos', objetivo: Math.round(t.indispensable), fechaLimite: fecha ? `${fecha.mes}-28` : '', aportes: [], casa: true });
            guardarPlan({ metaId: id });
          }}>Crear la meta de ahorro</button>
        )}
      </Card>

      <Card title="💰 ¿Cuánto ahorran al mes?">
        <MoneyInput value={ahorroTxt ?? plan.ahorroMensual} onChange={setAhorroTxt}
          onBlur={() => { if (ahorroTxt != null) { guardarPlan({ ahorroMensual: Number(ahorroTxt) || 0 }); setAhorroTxt(null); } }} />
        <div className="atajos mt">
          {[800000, 1000000, 1500000, 2000000, 2500000, 3000000].map((v) => (
            <button key={v} type="button" className={Number(plan.ahorroMensual) === v ? 'active' : ''} onClick={() => guardarPlan({ ahorroMensual: v })}>
              {fmt(v)} → {(() => { const f = fechaMeta(falta, v); return f ? monthLabel(f.mes, true) : '—'; })()}
            </button>
          ))}
        </div>
        <Segmented className="mt" options={[{ value: 'proporcional', label: 'Según lo que gana cada uno' }, { value: 'mitad', label: '50 / 50' }]}
          value={plan.reparto} onChange={(v) => guardarPlan({ reparto: v })} />
        <div className="duo mt">
          {PERSONAS.map((p) => (
            <div key={p} className="aporte-p">
              <span>{EMOJI_PERSONA[p]} {p}</span>
              <b>{fmt(plan.ahorroMensual * part[p])}/mes</b>
              <small className="muted">{part.ingresos[p] ? `${Math.round(((plan.ahorroMensual * part[p]) / part.ingresos[p]) * 100)}% de su ingreso` : 'sin ingreso registrado'}</small>
            </div>
          ))}
        </div>
      </Card>

      <Card title={`📦 Lo que necesitamos · ${t.comprados + t.tengo}/${items.length}`} action={<button className="btn primary sm" onClick={() => setModal({ t: 'item' })}>+ Agregar</button>}>
        <Segmented options={[{ value: 'indispensable', label: `⭐ Indispensable · ${fmt(t.cosas)}` }, { value: 'despues', label: `⏳ Después · ${fmt(t.despues)}` }]} value={filtro} onChange={setFiltro} />
        <p className="small muted mt">Toca el círculo para marcar: falta → ✅ comprado → 🎁 ya lo tenemos (no cuesta). Toca el nombre para editar el precio.</p>
        {porCat.map((c) => (
          <div key={c.nombre} className="casa-cat">
            <h4 className="sub">{c.emoji} {c.nombre}</h4>
            <ul className="list compact">
              {c.items.map((i) => (
                <li key={i.id} className={i.estado !== 'pendiente' ? 'done' : ''}>
                  <button className={`estado e-${i.estado}`} onClick={() => update('casaItems', i.id, { estado: ciclo[i.estado] || 'pendiente' })} aria-label="Cambiar estado">
                    {i.estado === 'comprado' ? '✓' : i.estado === 'tengo' ? '🎁' : ''}
                  </button>
                  <button className="grow item-name" onClick={() => setModal({ t: 'item', item: i })}>{i.nombre}</button>
                  <strong className={i.estado === 'tengo' ? 'tachado' : ''}>{fmt(i.costo)}</strong>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!items.length && <button className="btn ghost sm mt" onClick={async () => { for (const it of LISTA_SUGERIDA) await add('casaItems', it); }}>Cargar lista sugerida</button>}
      </Card>

      <Card title="🚪 Para arrancar">
        <ul className="list compact">
          <li><span className="grow">Arriendo adelantado / depósito ({plan.mesesAdelanto} {Number(plan.mesesAdelanto) === 1 ? 'mes' : 'meses'})</span><strong>{fmt(t.adelanto)}</strong></li>
          <li><span className="grow">Colchón: un mes de gastos de la casa</span><strong>{fmt(t.colchon)}</strong></li>
          <li><span className="grow">Cosas indispensables que faltan</span><strong>{fmt(t.cosas)}</strong></li>
          <li><b className="grow">Total para irse</b><strong>{fmt(t.indispensable)}</strong></li>
        </ul>
        <div className="row gap mt">
          <Field label="Meses de arriendo adelantado">
            <Segmented options={[0, 1, 2].map((n) => ({ value: n, label: String(n) }))} value={Number(plan.mesesAdelanto)} onChange={(v) => guardarPlan({ mesesAdelanto: v })} />
          </Field>
          <Field label="Colchón de 1 mes">
            <Segmented options={[{ value: true, label: 'Sí' }, { value: false, label: 'No' }]} value={!!plan.colchon} onChange={(v) => guardarPlan({ colchon: v })} />
          </Field>
        </div>
      </Card>

      <Card title={`🏡 Costo de vivir juntos · ${fmt(mensualCasa)}/mes`}>
        <div className="grid-2">
          <CampoPlan label="Arriendo" k="arriendo" valor={plan.arriendo} />
          <CampoPlan label="Administración" k="administracion" valor={plan.administracion} />
          <CampoPlan label="Servicios (luz, agua, gas)" k="servicios" valor={plan.servicios} />
          <CampoPlan label="Internet" k="internet" valor={plan.internet} />
          <CampoPlan label="Mercado del mes" k="mercado" valor={plan.mercado} />
        </div>
        <h4 className="sub">Cada uno pagaría</h4>
        <ul className="list compact">
          {PERSONAS.map((p) => {
            const nuevo = mensualCasa * part[p];
            const hoy = viviendaHoy(data, p);
            return (
              <li key={p}>
                <span className="grow">{EMOJI_PERSONA[p]} {p} <small>hoy paga {fmt(hoy)} en arriendo y servicios (sin mercado)</small></span>
                <strong>{fmt(nuevo)}</strong>
              </li>
            );
          })}
        </ul>
        {(() => {
          const hoyTotal = PERSONAS.reduce((a, p) => a + viviendaHoy(data, p), 0);
          const casaSinMercado = mensualCasa - Number(plan.mercado || 0);
          if (!hoyTotal) return <p className="small muted">Registren sus arriendos actuales en “Mi plata” para comparar.</p>;
          const dif = hoyTotal - casaSinMercado;
          return (
            <p className={`small ${dif >= 0 ? 'txt-ok' : 'txt-warn'}`}>
              {dif >= 0 ? `🎉 Viviendo juntos pagarían ${fmt(dif)} menos al mes en arriendo y servicios que hoy por separado.` : `Viviendo juntos pagarían ${fmt(-dif)} más al mes en arriendo y servicios que hoy por separado.`}
            </p>
          );
        })()}
      </Card>

      {modal?.t === 'item' && <ItemForm item={modal.item} onClose={() => setModal(null)} />}
      {modal?.t === 'aporte' && meta && <AporteForm meta={meta} onClose={() => setModal(null)} />}
    </div>
  );
}
