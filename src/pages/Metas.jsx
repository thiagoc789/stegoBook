import { useMemo, useState } from 'react';
import { useApp } from '../lib/context';
import { add, remove, update } from '../lib/store';
import { PERSONAS } from '../lib/constants';
import {
  cuotaMetas, duenoMeta, estadoMeta, metasDe, resumen,
} from '../lib/finance';
import { addMonths, dateLabel, monthLabel, today } from '../lib/format';
import {
  Card, confirmar, Empty, Field, Modal, MoneyInput, PersonaTag, Progress, Segmented,
} from '../components/ui';

const EMOJIS = ['🎯', '🛟', '🏠', '✈️', '🚗', '💍', '🎓', '💻', '🎄', '🏖️', '🐶', '💰'];
const PERIODO = { semestral: 6, anual: 12 };
const mover = (fecha, n) => `${addMonths(fecha.slice(0, 7), n)}${fecha.slice(7) || '-01'}`;

function plantillas(persona) {
  const y = new Date().getFullYear();
  return [
    { nombre: 'Universidad', emoji: '🎓', objetivo: 3000000, fechaLimite: `${y + 1}-02-01`, dueno: 'Stephania', repetir: 'semestral', aportes: [] },
    { nombre: 'Fondo de emergencia', emoji: '🛟', objetivo: 5000000, fechaLimite: `${y + 1}-12-01`, dueno: persona || 'Ambos', repetir: '', aportes: [] },
  ];
}

function MetaForm({ meta, onClose }) {
  const { persona, yo } = useApp();
  const [f, setF] = useState(meta || { nombre: '', emoji: '🎯', objetivo: '', fechaLimite: '', dueno: persona || 'Ambos', aportes: [] });
  const s = (k) => (v) => setF((o) => ({ ...o, [k]: v?.target ? v.target.value : v }));
  const submit = async (e) => {
    e.preventDefault();
    const { id, ...rest } = f;
    const payload = { ...rest, objetivo: Number(f.objetivo) };
    if (meta?.id) await update('metas', meta.id, payload); else await add('metas', payload);
    onClose();
  };
  return (
    <Modal title={meta?.id ? 'Editar meta' : 'Nueva meta'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="¿De quién es?">
          <Segmented options={[...PERSONAS, 'Ambos']} value={f.dueno || yo} onChange={s('dueno')} />
        </Field>
        <div className="emoji-pick">
          {EMOJIS.map((em) => <button type="button" key={em} className={f.emoji === em ? 'active' : ''} onClick={() => s('emoji')(em)}>{em}</button>)}
        </div>
        <Field label="¿Qué quieren lograr?"><input value={f.nombre} onChange={s('nombre')} placeholder="Fondo de emergencia, viaje, regalos de Navidad…" required /></Field>
        <Field label="¿Cuánto necesitan?"><MoneyInput value={f.objetivo} onChange={s('objetivo')} required /></Field>
        <Field label="¿Para cuándo?" hint="Con la fecha calculamos cuánto apartar cada mes.">
          <input type="date" value={f.fechaLimite} onChange={s('fechaLimite')} />
        </Field>
        <Field label="¿Se repite?" hint={f.repetir ? 'Al cumplirla (o al llegar la fecha) arranca la siguiente con el mismo monto.' : undefined}>
          <Segmented options={[{ value: '', label: 'No' }, { value: 'semestral', label: 'Cada semestre' }, { value: 'anual', label: 'Cada año' }]}
            value={f.repetir || ''} onChange={s('repetir')} />
        </Field>
        <button className="btn primary block" disabled={!f.nombre || !Number(f.objetivo)}>Guardar</button>
      </form>
    </Modal>
  );
}

export function AporteForm({ meta, onClose }) {
  const { persona, yo } = useApp();
  const [monto, setMonto] = useState('');
  const [retiro, setRetiro] = useState(false);
  const [quien, setQuien] = useState(persona || yo);
  const submit = async (e) => {
    e.preventDefault();
    await update('metas', meta.id, { aportes: [...(meta.aportes || []), { monto: Number(monto) * (retiro ? -1 : 1), persona: quien, fecha: today() }] });
    onClose();
  };
  return (
    <Modal title={`${meta.emoji || '🎯'} ${meta.nombre}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Segmented options={[{ value: false, label: '➕ Aportar' }, { value: true, label: '➖ Retirar' }]} value={retiro} onChange={setRetiro} />
        <MoneyInput className="big" value={monto} onChange={setMonto} autoFocus />
        {duenoMeta(meta) === 'Ambos' && <Segmented options={PERSONAS} value={quien} onChange={setQuien} />}
        <button className="btn primary block" disabled={!Number(monto)}>Guardar</button>
      </form>
    </Modal>
  );
}

export default function Metas({ go }) {
  const { data, mes, fmt, persona, casa } = useApp();
  const [edit, setEdit] = useState(null);
  const [aporte, setAporte] = useState(null);
  const [hist, setHist] = useState(null);

  const metas = metasDe(data.metas, persona)
    .sort((a, b) => estadoMeta(a).completa - estadoMeta(b).completa || (a.fechaLimite || '9').localeCompare(b.fechaLimite || '9'));
  const cuota = cuotaMetas(data.metas, persona, mes);
  const r = useMemo(() => resumen(data, mes, persona), [data, mes, persona]);
  const fijos = r.totalFijos;

  return (
    <div className="page">
      <Card className="hero">
        <span className="muted">Para cumplir {persona ? 'tus' : 'sus'} metas a tiempo hay que apartar</span>
        <strong className="hero-num">{fmt(cuota)}<small> /mes</small></strong>
        {r.ingresos > 0 && (
          <p className="small hero-note">
            Eso es el {Math.round((cuota / r.ingresos) * 100)}% del ingreso.{' '}
            {r.disponible >= cuota
              ? <span className="txt-ok">Con lo que va del mes, alcanza ✅</span>
              : <span className="txt-danger">Con lo que va del mes faltan {fmt(cuota - r.disponible)}. Mira “Qué recortar” en Inicio.</span>}
          </p>
        )}
        {persona && <p className="small muted">Las metas “Ambos” cuentan la mitad para cada uno.</p>}
        <button className="btn primary" onClick={() => setEdit({})}>+ Nueva meta</button>
        <div className="atajos">
          {plantillas(persona).filter((p) => !data.metas.some((m) => m.nombre === p.nombre)).map((p) => (
            <button key={p.nombre} type="button" onClick={() => setEdit(p)}>{p.emoji} {p.nombre}</button>
          ))}
        </div>
      </Card>

      <Card className="highlight casa-link">
        <div className="row gap">
          <span className="goal-emoji">🏠</span>
          <div className="grow">
            <h3>Plan: irnos a vivir juntos</h3>
            <p className="small muted">{casa ? 'Lista de la casa, arriendo y fecha estimada.' : 'Qué necesitan, cuánto cuesta y cuándo lo tendrían.'}</p>
          </div>
        </div>
        <button className="btn primary sm" onClick={() => go('casa')}>{casa ? 'Abrir plan →' : 'Armar el plan →'}</button>
      </Card>

      {!metas.some((m) => /emergencia/i.test(m.nombre)) && fijos > 0 && (
        <Card className="highlight">
          <p className="small">🛟 <b>Consejo:</b> la primera meta debería ser un fondo de emergencia de 3 meses de gastos fijos ({fmt(fijos * 3)}).</p>
          <button className="btn ghost sm" onClick={() => setEdit({ nombre: 'Fondo de emergencia', emoji: '🛟', objetivo: Math.round(fijos * 3), dueno: persona || 'Ambos', fechaLimite: `${addMonths(mes, 12)}-01`, aportes: [] })}>
            Crear fondo de emergencia
          </button>
        </Card>
      )}

      {metas.length === 0 ? <Card><Empty emoji="🎯">Aún no hay metas.</Empty></Card> : metas.map((m) => {
        const e = estadoMeta(m, mes);
        return (
          <Card key={m.id} className={`goal ${e.completa ? 'complete' : ''}`}>
            <div className="goal-head">
              <span className="goal-emoji">{m.emoji || '🎯'}</span>
              <div className="grow">
                <h3>{m.nombre}</h3>
                <small className="muted">{m.fechaLimite ? `Para el ${dateLabel(m.fechaLimite)}` : 'Sin fecha'} · </small><PersonaTag p={duenoMeta(m)} />
              </div>
              <button className="icon-btn" onClick={() => setEdit(m)} aria-label="Editar">✏️</button>
              <button className="icon-btn danger" onClick={() => confirmar() && remove('metas', m.id)} aria-label="Eliminar">🗑</button>
            </div>
            <div className="row-between"><strong className="goal-amount">{fmt(e.ahorrado)}</strong><span className="muted small">de {fmt(e.objetivo)} · {Math.round(e.progreso * 100)}%</span></div>
            <Progress value={e.progreso} color={e.completa ? 'var(--ok)' : 'var(--accent)'} />
            {e.completa ? <p className="txt-ok">🎉 ¡Meta cumplida!</p> : (
              <p className="small">
                {e.cuotaMensual != null
                  ? <>Apartar <b>{fmt(e.cuotaMensual)}</b> al mes durante {e.mesesRestantes} {e.mesesRestantes === 1 ? 'mes' : 'meses'} (hasta {monthLabel(m.fechaLimite.slice(0, 7))}).</>
                  : <>Faltan {fmt(e.falta)}. Pónganle fecha para saber cuánto apartar al mes.</>}
                {e.aportesMes > 0 && <> Este mes: +{fmt(e.aportesMes)}.</>}
              </p>
            )}
            {m.repetir && (
              <p className="ciclos">🔁 Se repite {m.repetir === 'semestral' ? 'cada semestre' : 'cada año'}
                {(m.ciclos || []).length > 0 && ` · ${m.ciclos.length} ${m.ciclos.length === 1 ? 'ciclo cumplido' : 'ciclos cumplidos'}`}</p>
            )}
            {m.repetir && m.fechaLimite && (e.completa || m.fechaLimite <= today()) && (
              <button className="btn ghost sm" onClick={() => confirmar(`¿Empezar a ahorrar para el siguiente ${m.repetir === 'semestral' ? 'semestre' : 'año'}? Lo ahorrado se guarda en el historial y la meta arranca en cero para el ${dateLabel(mover(m.fechaLimite, PERIODO[m.repetir]))}.`)
                && update('metas', m.id, {
                  fechaLimite: mover(m.fechaLimite, PERIODO[m.repetir]), aportes: [],
                  ciclos: [...(m.ciclos || []), { hasta: m.fechaLimite, ahorrado: e.ahorrado }],
                })}>
                🔁 Empezar el siguiente {m.repetir === 'semestral' ? 'semestre' : 'año'}
              </button>
            )}
            <div className="row gap">
              <button className="btn primary sm" onClick={() => setAporte(m)}>+ Aportar</button>
              {m.casa && <button className="btn ghost sm" onClick={() => go('casa')}>Ver plan 🏠</button>}
              {(m.aportes || []).length > 0 && <button className="btn ghost sm" onClick={() => setHist(hist === m.id ? null : m.id)}>Historial</button>}
            </div>
            {hist === m.id && (
              <ul className="list compact">
                {[...(m.aportes || [])].reverse().map((a, i) => (
                  <li key={i}><PersonaTag p={a.persona} /><span className="grow muted">{dateLabel(a.fecha)}</span>
                    <strong className={a.monto < 0 ? 'txt-danger' : 'txt-ok'}>{a.monto > 0 ? '+' : ''}{fmt(a.monto)}</strong></li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}

      {edit && <MetaForm meta={edit.id || edit.nombre ? edit : null} onClose={() => setEdit(null)} />}
      {aporte && <AporteForm meta={aporte} onClose={() => setAporte(null)} />}
    </div>
  );
}
