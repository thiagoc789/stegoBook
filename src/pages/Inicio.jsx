import { useMemo } from 'react';
import { useApp } from '../lib/context';
import {
  cuotaMetas, estadoMeta, metasDe, resumen, ritmoMes, sugerencias,
} from '../lib/finance';
import { COLOR_PERSONA, infoCategoria, PERSONAS } from '../lib/constants';
import { pct } from '../lib/format';
import { Card, Empty, PersonaTag, Progress, TextoMonto } from '../components/ui';
import TopeGustos from '../components/TopeGustos';
import PagosMes from '../components/PagosMes';

const ICON = { ok: '✅', alerta: '⚠️', peligro: '🚨', info: '💡', recorte: '✂️' };

function Hero({ r, cuota }) {
  const { fmt } = useApp();
  const ritmo = ritmoMes(r);
  const libre = r.disponible - cuota;
  const diario = ritmo.esActual && ritmo.restantes > 0 ? Math.max(0, libre / ritmo.restantes) : null;
  return (
    <Card className="hero">
      <span className="muted">Te queda este mes</span>
      <strong className={`hero-num ${r.disponible < 0 ? 'txt-danger' : ''}`}>{fmt(r.disponible)}</strong>
      <Progress value={r.ingresos ? r.gastos / r.ingresos : 0} />
      <div className="hero-row">
        <span>Ingresos <b>{fmt(r.ingresos)}</b></span>
        <span>Gastado <b>{fmt(r.gastos)}</b></span>
      </div>
      {cuota > 0 && (
        <p className="small hero-note">🎯 Apartando {fmt(cuota)} para metas quedan <b className={libre < 0 ? 'txt-danger' : ''}>{fmt(libre)}</b> libres.</p>
      )}
      {diario != null && r.ingresos > 0 && (
        <p className="small hero-note">📆 Puedes gastar hasta <b>{fmt(diario)}</b> por día los {ritmo.restantes} días que quedan.</p>
      )}
    </Card>
  );
}

function NecesidadGusto({ r }) {
  const { fmt } = useApp();
  const total = r.gastos || 1;
  const pG = r.ingresos ? r.gustos / r.ingresos : 0;
  return (
    <Card title="Necesidades vs. gustos">
      <div className="ng-bar">
        <div style={{ width: `${(r.necesidades / total) * 100}%` }} className="nec" />
        <div style={{ width: `${(r.gustos / total) * 100}%` }} className="gus" />
      </div>
      <div className="ng-legend">
        <div><i className="nec" /> Necesidades<b>{fmt(r.necesidades)}</b><small>{pct(r.necesidades / total)} del gasto</small></div>
        <div><i className="gus" /> Gustos<b>{fmt(r.gustos)}</b><small>{r.ingresos ? `${pct(pG)} del ingreso` : ''}</small></div>
      </div>
      {r.ingresos > 0 && (
        <p className={`small ${pG > 0.3 ? 'txt-warn' : 'muted'}`}>
          {pG > 0.3 ? '⚠️ ' : ''}Meta sana: gustos máximo 30% del ingreso ({fmt(r.ingresos * 0.3)}).
        </p>
      )}
    </Card>
  );
}

function Categorias({ r, go }) {
  const { fmt } = useApp();
  if (!r.porCategoria.length) return <Card title="¿En qué se va la plata?"><Empty emoji="🧾">Todavía no hay gastos este mes. Toca <b>＋</b> para registrar el primero.</Empty></Card>;
  const max = r.porCategoria[0].total;
  return (
    <Card title="¿En qué se va la plata?" action={<button className="link" onClick={() => go('movimientos')}>Ver gastos</button>}>
      <ul className="cats">
        {r.porCategoria.map((c) => {
          const info = infoCategoria(c.nombre);
          return (
            <li key={c.nombre}>
              <div className="row-between">
                <span>{info.emoji} {c.nombre}</span>
                <span><b>{fmt(c.total)}</b> <small className="muted">{pct(c.total / r.gastos)}</small></span>
              </div>
              <div className="cat-bar">
                <div className="nec" style={{ width: `${(c.necesidad / max) * 100}%` }} />
                <div className="gus" style={{ width: `${(c.gusto / max) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="muted small"><i className="dot nec" /> necesidad <i className="dot gus" /> gusto</p>
    </Card>
  );
}

function Recortar({ tips }) {
  if (!tips.length) return null;
  return (
    <Card title="✂️ Qué recortar y cómo vamos">
      <ul className="tips">
        {tips.map((t, i) => <li key={i} className={`tip-${t.tipo}`}>{ICON[t.tipo]} <span><TextoMonto s={t} /></span></li>)}
      </ul>
    </Card>
  );
}

function MetasMini({ metas, go }) {
  const { fmt, mes } = useApp();
  return (
    <Card title="🎯 Metas" action={<button className="link" onClick={() => go('metas')}>{metas.length ? 'Ver metas' : 'Crear meta'}</button>}>
      {!metas.length ? <p className="muted small">Una meta clara hace más fácil decir “no” a un gusto.</p> : metas.map((m) => {
        const e = estadoMeta(m, mes);
        return (
          <div key={m.id} className="goal-mini">
            <div className="row-between"><span>{m.emoji || '🎯'} {m.nombre}</span><small>{fmt(e.ahorrado)} / {fmt(e.objetivo)}</small></div>
            <Progress value={e.progreso} color="var(--accent)" />
            {e.cuotaMensual != null && <small className="muted">Ahorrar {fmt(e.cuotaMensual)}/mes</small>}
          </div>
        );
      })}
    </Card>
  );
}

function Comparativo() {
  const { data, mes, fmt } = useApp();
  return (
    <div className="duo">
      {PERSONAS.map((p) => {
        const r = resumen(data, mes, p);
        return (
          <Card key={p} className="duo-card" >
            <PersonaTag p={p} />
            <strong className={`duo-num ${r.disponible < 0 ? 'txt-danger' : ''}`}>{fmt(r.disponible)}</strong>
            <small className="muted">le queda</small>
            <Progress value={r.ingresos ? r.gastos / r.ingresos : 0} color={COLOR_PERSONA[p]} />
            <small>Gastó {fmt(r.gastos)} de {fmt(r.ingresos)}</small>
            <small>✨ Gustos: {r.ingresos ? pct(r.gustos / r.ingresos) : '—'} del ingreso</small>
          </Card>
        );
      })}
    </div>
  );
}

export default function Inicio({ go }) {
  const { data, mes, persona } = useApp();
  const r = useMemo(() => resumen(data, mes, persona), [data, mes, persona]);
  const cuota = useMemo(() => cuotaMetas(data.metas, persona, mes), [data.metas, persona, mes]);
  const tips = useMemo(() => sugerencias(data, r, persona, cuota), [data, r, persona, cuota]);
  const metas = metasDe(data.metas, persona).filter((m) => !estadoMeta(m, mes).completa).slice(0, 3);
  const sinIngreso = r.ingresos === 0;

  return (
    <div className="page">
      {!persona && <Comparativo />}
      {sinIngreso && (
        <Card className="highlight">
          <p>👋 Para empezar, registra {persona ? 'tu salario y tus gastos fijos' : 'los salarios y gastos fijos de cada uno'} (arriendo, servicios, suscripciones…).</p>
          <button className="btn primary sm" onClick={() => go('miplata')}>Ir a Mi plata</button>
        </Card>
      )}
      <TopeGustos />
      <Hero r={r} cuota={cuota} />
      <PagosMes />
      <Recortar tips={tips} />
      <NecesidadGusto r={r} />
      <Categorias r={r} go={go} />
      <MetasMini metas={metas} go={go} />
    </div>
  );
}
