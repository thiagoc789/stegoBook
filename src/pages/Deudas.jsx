import { useMemo, useState } from 'react';
import { useApp } from '../lib/context';
import { add, remove, update } from '../lib/store';
import { PERSONAS } from '../lib/constants';
import { personaDe } from '../lib/finance';
import {
  saldoHoy, simular, TIPOS_DEUDA,
} from '../lib/deudas';
import { currentMonth, monthLabel, today } from '../lib/format';
import {
  Card, confirmar, Empty, Field, Modal, MoneyInput, PersonaTag, Progress, Segmented,
} from '../components/ui';

function DeudaForm({ deuda, onClose }) {
  const { persona, yo } = useApp();
  const [f, setF] = useState(deuda || { persona: persona || yo, tipo: 'tarjeta', nombre: '', saldo: '', cuota: '', tasaEA: '' });
  const s = (k) => (v) => setF((o) => ({ ...o, [k]: v?.target ? v.target.value : v }));
  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      persona: f.persona, tipo: f.tipo, nombre: f.nombre.trim() || TIPOS_DEUDA[f.tipo].label,
      cuota: Number(f.cuota), tasaEA: Number(f.tasaEA) || 0, dia: Number(f.dia) || null,
    };
    if (deuda?.id) await update('deudas', deuda.id, payload);
    else await add('deudas', { ...payload, saldo: Number(f.saldo), saldoOriginal: Number(f.saldo), desde: currentMonth(), fechaSaldo: currentMonth(), saldoActualizado: new Date().toISOString(), abonos: [] });
    onClose();
  };
  return (
    <Modal title={deuda ? 'Editar deuda' : 'Nueva deuda'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {!deuda && <Segmented options={PERSONAS} value={f.persona} onChange={s('persona')} />}
        <div className="chips-tipo">
          {Object.entries(TIPOS_DEUDA).map(([k, t]) => (
            <button type="button" key={k} className={f.tipo === k ? 'active' : ''} onClick={() => s('tipo')(k)}>{t.emoji} {t.label}</button>
          ))}
        </div>
        <Field label="Nombre"><input value={f.nombre} onChange={s('nombre')} placeholder={f.tipo === 'tarjeta' ? 'Ej: Visa Bancolombia' : f.tipo === 'familiar' ? 'Ej: Préstamo papá' : 'Ej: Crédito carro'} /></Field>
        {!deuda && (
          <Field label="¿Cuánto debes hoy?" hint="Míralo en la app del banco o en el último extracto.">
            <MoneyInput value={f.saldo} onChange={s('saldo')} />
          </Field>
        )}
        <Field label="Cuota que pagas al mes" hint={f.tipo === 'tarjeta' ? 'Lo que piensas pagar cada mes (el mínimo o más).' : 'Se suma sola a tus gastos fijos, no la agregues también allá.'}>
          <MoneyInput value={f.cuota} onChange={s('cuota')} />
        </Field>
        <Field label="Día de pago (opcional)"><input type="number" inputMode="numeric" min="1" max="31" value={f.dia || ''} onChange={s('dia')} placeholder="Ej: 15" /></Field>
        <Field label="Tasa de interés efectiva anual (% E.A.)" hint="Tarjetas en Colombia suelen estar entre 25% y 30% E.A. Un préstamo familiar sin intereses: 0.">
          <input type="number" inputMode="decimal" min="0" max="200" step="0.01" value={f.tasaEA} onChange={s('tasaEA')} placeholder="Ej: 28" />
        </Field>
        <button className="btn primary block" disabled={(!deuda && !Number(f.saldo)) || !Number(f.cuota)}>Guardar</button>
      </form>
    </Modal>
  );
}

function MontoModal({ titulo, ayuda, onSave, onClose, inicial = '' }) {
  const [v, setV] = useState(inicial);
  return (
    <Modal title={titulo} onClose={onClose}>
      <form className="form" onSubmit={async (e) => { e.preventDefault(); await onSave(Number(v)); onClose(); }}>
        <MoneyInput className="big" value={v} onChange={setV} autoFocus />
        {ayuda && <p className="small muted">{ayuda}</p>}
        <button className="btn primary block" disabled={v === ''}>Guardar</button>
      </form>
    </Modal>
  );
}

function PlanPago({ deudas }) {
  const { fmt } = useApp();
  const [extra, setExtra] = useState(200000);
  const sinPlan = useMemo(() => simular(deudas), [deudas]);
  const conPlan = useMemo(() => simular(deudas, { extra, bolaDeNieve: true }), [deudas, extra]);
  const orden = [...deudas].filter((d) => saldoHoy(d) > 0).sort((a, b) => b.tasaEA - a.tasaEA || saldoHoy(a) - saldoHoy(b));
  const ahorro = sinPlan.interesTotal - conPlan.interesTotal;
  const mesesMenos = sinPlan.meses - conPlan.meses;
  if (!orden.length) return null;

  return (
    <Card title="🧭 Plan para salir de deudas">
      <p className="small">Paga todas las cuotas y pon <b>todo el dinero extra a la deuda con el interés más alto</b>. Cuando termines una, su cuota pasa a la siguiente (bola de nieve).</p>
      <Field label="¿Cuánto extra puedes abonar al mes?">
        <MoneyInput value={extra} onChange={(v) => setExtra(Number(v) || 0)} />
      </Field>
      <div className="atajos">
        {[0, 100000, 200000, 300000, 500000, 1000000].map((v) => (
          <button type="button" key={v} className={extra === v ? 'active' : ''} onClick={() => setExtra(v)}>{v ? fmt(v) : 'Sin extra'}</button>
        ))}
      </div>

      <div className="plan-result">
        <div><small className="muted">Solo pagando cuotas</small><b>{monthLabel(sinPlan.fin)}</b><small>{fmt(sinPlan.interesTotal)} en intereses</small></div>
        <div className="accent"><small className="muted">Con el plan</small><b>{monthLabel(conPlan.fin)}</b><small>{fmt(conPlan.interesTotal)} en intereses</small></div>
      </div>
      {(mesesMenos > 0 || ahorro > 1000) && (
        <p className="small txt-ok">🎉 Terminas {mesesMenos > 0 ? `${mesesMenos} ${mesesMenos === 1 ? 'mes' : 'meses'} antes` : 'antes'} y te ahorras {fmt(ahorro)} en intereses.</p>
      )}
      {sinPlan.nunca.length > 0 && <p className="small txt-danger">🚨 Con la cuota actual, {sinPlan.nunca.join(', ')} no se termina de pagar nunca (la cuota no cubre los intereses).</p>}

      <h4 className="sub">Orden de pago</h4>
      <ol className="orden">
        {orden.map((d, i) => {
          const fin = conPlan.porDeuda[d.id]?.fin;
          return (
            <li key={d.id}>
              <span className="num">{i + 1}</span>
              <div className="grow"><b>{TIPOS_DEUDA[d.tipo]?.emoji} {d.nombre}</b><small>{d.tasaEA ? `${d.tasaEA}% E.A.` : 'sin intereses'} · debes {fmt(saldoHoy(d))}</small></div>
              <div className="right"><small className="muted">termina</small><b>{fin ? monthLabel(fin, true) : '—'}</b></div>
            </li>
          );
        })}
      </ol>
      <h4 className="sub">💸 Dinero que se libera</h4>
      <ul className="list compact">
        {orden.map((d) => ({ d, fin: conPlan.porDeuda[d.id]?.fin })).filter((x) => x.fin).sort((a, b) => a.fin.localeCompare(b.fin)).map(({ d, fin }) => (
          <li key={d.id}><span className="grow">Desde {monthLabel(fin)} sin <b style={{ display: 'inline' }}>{d.nombre}</b></span><strong className="txt-ok">+{fmt(d.cuota)}/mes</strong></li>
        ))}
      </ul>
      <p className="small muted">Ese dinero liberado puede ir directo a la meta de vivir juntos 🏠.</p>
    </Card>
  );
}

export default function Deudas() {
  const { data, fmt, persona, setVista } = useApp();
  const [modal, setModal] = useState(null);
  const deudas = data.deudas.filter((d) => !persona || personaDe(d) === persona);
  const activas = deudas.filter((d) => saldoHoy(d) > 0);
  const total = activas.reduce((a, d) => a + saldoHoy(d), 0);
  const cuotas = activas.reduce((a, d) => a + Number(d.cuota), 0);
  const sim = useMemo(() => simular(activas), [activas]);

  return (
    <div className="page">
      <Card className="hero">
        <span className="muted">{persona ? 'Debes en total' : 'Deben en total'}</span>
        <strong className="hero-num">{fmt(total)}</strong>
        <div className="hero-row"><span>Cuotas <b>{fmt(cuotas)}/mes</b></span>{activas.length > 0 && <span>Libre de deudas <b>{monthLabel(sim.fin, true)}</b></span>}</div>
        {activas.length > 0 && <p className="small hero-note">Pagando solo las cuotas, se van <b>{fmt(sim.interesTotal)}</b> en intereses.</p>}
        <button className="btn primary" onClick={() => setModal({ t: 'nueva' })}>+ Agregar deuda</button>
      </Card>

      {!persona && PERSONAS.map((p) => {
        const ds = data.deudas.filter((d) => personaDe(d) === p && saldoHoy(d) > 0);
        return (
          <Card key={p}>
            <div className="row-between">
              <PersonaTag p={p} />
              <span className="small">{fmt(ds.reduce((a, d) => a + saldoHoy(d), 0))} · cuotas {fmt(ds.reduce((a, d) => a + Number(d.cuota), 0))}/mes</span>
            </div>
            <button className="link mt" onClick={() => setVista(p)}>Ver plan de {p} →</button>
          </Card>
        );
      })}

      {deudas.length === 0 ? <Card><Empty emoji="💳">Agrega tarjetas, créditos y préstamos. Las cuotas se suman solas a tus gastos fijos.</Empty></Card> : deudas.map((d) => {
        const saldo = saldoHoy(d);
        const orig = Number(d.saldoOriginal || d.saldo) || 1;
        const s1 = simular([d]);
        return (
          <Card key={d.id} className={`goal ${saldo === 0 ? 'complete' : ''}`}>
            <div className="goal-head">
              <span className="goal-emoji">{TIPOS_DEUDA[d.tipo]?.emoji || '📄'}</span>
              <div className="grow">
                <h3>{d.nombre}{d.prueba && ' 🧪'}</h3>
                <small className="muted">{d.tasaEA ? `${d.tasaEA}% E.A.` : 'Sin intereses'} · cuota {fmt(d.cuota)}</small>
                {!persona && <> <PersonaTag p={personaDe(d)} /></>}
              </div>
              <button className="icon-btn" onClick={() => setModal({ t: 'editar', d })} aria-label="Editar">✏️</button>
              <button className="icon-btn danger" onClick={() => confirmar() && remove('deudas', d.id)} aria-label="Eliminar">🗑</button>
            </div>
            <div className="row-between"><strong className="goal-amount">{fmt(saldo)}</strong><span className="small muted">pagado {Math.round(Math.max(0, 1 - saldo / orig) * 100)}%</span></div>
            <Progress value={1 - saldo / orig} color="var(--ok)" />
            {saldo === 0 ? <p className="txt-ok">🎉 ¡Pagada!</p> : (
              <p className="small">
                {s1.nunca.length ? <span className="txt-danger">La cuota no alcanza ni para los intereses.</span>
                  : <>Terminas en <b>{monthLabel(s1.fin)}</b>{s1.interesTotal > 1000 ? <> · faltan {fmt(s1.interesTotal)} de intereses</> : null}.</>}
              </p>
            )}
            <div className="row gap wrap">
              <button className="btn primary sm" onClick={() => setModal({ t: 'abono', d })}>+ Abono extra</button>
              <button className="btn ghost sm" onClick={() => setModal({ t: 'saldo', d })}>Actualizar saldo</button>
            </div>
          </Card>
        );
      })}

      {persona && activas.length > 0 && <PlanPago deudas={activas} />}

      {persona && activas.some((d) => d.tipo === 'tarjeta') && (
        <Card className="highlight"><p className="small">💡 Las compras nuevas con tarjeta regístralas como un gasto normal con ＋. Aquí solo va lo que ya debes. Si puedes, deja de usar la tarjeta hasta pagarla.</p></Card>
      )}

      {modal?.t === 'nueva' && <DeudaForm onClose={() => setModal(null)} />}
      {modal?.t === 'editar' && <DeudaForm deuda={modal.d} onClose={() => setModal(null)} />}
      {modal?.t === 'abono' && (
        <MontoModal titulo={`Abono extra · ${modal.d.nombre}`} ayuda="Lo que pagaste además de la cuota. Se resta del saldo y cuenta como gasto de este mes."
          onClose={() => setModal(null)} onSave={(v) => update('deudas', modal.d.id, { abonos: [...(modal.d.abonos || []), { monto: v, fecha: today(), creado: new Date().toISOString() }] })} />
      )}
      {modal?.t === 'saldo' && (
        <MontoModal titulo={`Saldo actual · ${modal.d.nombre}`} inicial={Math.round(saldoHoy(modal.d))}
          ayuda="Escribe lo que dice el banco hoy. La app estima el saldo cada mes, pero con esto queda exacto."
          onClose={() => setModal(null)} onSave={(v) => update('deudas', modal.d.id, { saldo: v, fechaSaldo: currentMonth(), saldoActualizado: new Date().toISOString() })} />
      )}
    </div>
  );
}
