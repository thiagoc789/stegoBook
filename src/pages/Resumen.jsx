import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { useApp } from '../lib/context';
import {
  consejos, estadoMeta, proyeccionCierreMes, repartoJusto, resumenMes,
} from '../lib/finance';
import { addMonths, currentMonth, dateLabel, monthLabel, pct } from '../lib/format';
import { COLOR_PERSONA, infoCategoria, PERSONAS } from '../lib/constants';
import { Card, Empty, MonthPicker, PersonaTag, Progress, Stat } from '../components/ui';

const ICON = { ok: '✅', alerta: '⚠️', peligro: '🚨', info: '💡' };

export default function Resumen({ go }) {
  const { data, mes, fmt, config } = useApp();
  const r = useMemo(() => resumenMes(data, mes), [data, mes]);
  const cierre = useMemo(() => proyeccionCierreMes(data, mes), [data, mes]);
  const reparto = repartoJusto(r, config.reparto);
  const tips = useMemo(() => consejos(data, mes, config, data.presupuestos), [data, mes, config]);
  const esActual = mes === currentMonth();

  const pie = Object.entries(r.porCategoria)
    .map(([nombre, value]) => ({ nombre, value, ...infoCategoria(nombre, config) }))
    .sort((a, b) => b.value - a.value);

  const tendencia = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const m = addMonths(mes, i - 5);
    const x = resumenMes(data, m);
    return { mes: monthLabel(m, true), Ingresos: x.ingresos, Gastos: x.gastos, Ahorro: Math.max(0, x.balance) };
  }), [data, mes]);

  const pendientesFijos = esActual
    ? r.fijos.filter((f) => !f.pagados?.[mes] && Number(f.dia || 1) <= new Date().getDate())
    : [];

  const top = [...r.variables].sort((a, b) => b.monto - a.monto).slice(0, 5);
  const metasActivas = data.metas.filter((m) => !estadoMeta(m).completa).slice(0, 3);

  const regla = [
    { label: 'Necesidades', real: r.necesidades, ideal: 0.5, color: '#3b82f6' },
    { label: 'Gustos', real: r.deseos, ideal: 0.3, color: '#ec4899' },
    { label: 'Ahorro', real: Math.max(0, r.balance), ideal: 0.2, color: '#10b981' },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <h2>Resumen</h2>
        <MonthPicker />
      </div>

      <div className="stats">
        <Stat label="Ingresos" value={fmt(r.ingresos)} sub={r.ingresoExtras ? `${fmt(r.ingresoExtras)} extra` : 'salarios'} />
        <Stat label="Gastos" value={fmt(r.gastos)} sub={`${fmt(r.totalFijos)} fijos · ${fmt(r.totalVariables)} variables`} />
        <Stat label="Balance" value={fmt(r.balance)} tone={r.balance >= 0 ? 'ok' : 'danger'} sub={r.balance >= 0 ? 'les queda' : 'déficit'} />
        <Stat label="Tasa de ahorro" value={pct(r.tasaAhorro)} sub={`meta ${config.metaAhorroPct}%`}
          tone={r.tasaAhorro >= config.metaAhorroPct / 100 ? 'ok' : r.tasaAhorro < 0 ? 'danger' : 'warn'} />
      </div>

      {esActual && r.ingresos > 0 && (
        <Card title="🔮 Así va a cerrar el mes" className="highlight">
          <div className="cierre">
            <div>
              <p>A este ritmo ({fmt(cierre.ritmo)}/día en gastos variables) terminarían el mes con:</p>
              <strong className={cierre.balanceEstimado >= 0 ? 'txt-ok' : 'txt-danger'} style={{ fontSize: '1.8rem' }}>
                {fmt(cierre.balanceEstimado)}
              </strong>
              <p className="muted">Gastos estimados: {fmt(cierre.gastosEstimado)} · Día {cierre.transcurridos} de {cierre.dias}</p>
            </div>
            <div className="daily">
              <span>Pueden gastar hasta</span>
              <strong>{fmt(cierre.diarioDisponible)}</strong>
              <span>por día hasta fin de mes</span>
            </div>
          </div>
        </Card>
      )}

      {tips.length > 0 && (
        <Card title="Alertas y consejos">
          <ul className="tips">
            {tips.map((t, i) => <li key={i} className={`tip-${t.tipo}`}>{ICON[t.tipo]} {t.texto}</li>)}
            {pendientesFijos.map((f) => (
              <li key={f.id} className="tip-alerta">
                📅 {f.concepto} ({fmt(f.monto)}) vencía el día {f.dia} y no está marcado como pagado.{' '}
                <button className="link" onClick={() => go('fijos')}>Ver fijos</button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid-2 cols">
        <Card title="¿En qué se va la plata?">
          {pie.length === 0 ? <Empty emoji="🧾">Aún no hay gastos este mes.</Empty> : (
            <div className="pie-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="nombre" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {pie.map((p) => <Cell key={p.nombre} fill={p.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="legend">
                {pie.slice(0, 8).map((p) => (
                  <li key={p.nombre}>
                    <i style={{ background: p.color }} /> {p.emoji} {p.nombre}
                    <span>{fmt(p.value)} <small>{pct(p.value / r.gastos)}</small></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card title="Últimos 6 meses">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={tendencia} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: 'var(--muted)' }} />
              <YAxis tickFormatter={(v) => fmt(v, true)} tick={{ fontSize: 11, fill: 'var(--muted)' }} width={70} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)' }} />
              <Legend />
              <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid-2 cols">
        <Card title="Regla 50 / 30 / 20">
          {r.ingresos === 0 ? <Empty>Registren ingresos para comparar.</Empty> : regla.map((x) => (
            <div key={x.label} className="rule-row">
              <div className="row-between">
                <span>{x.label}</span>
                <span><strong>{pct(x.real / r.ingresos)}</strong> <small className="muted">ideal {pct(x.ideal)}</small></span>
              </div>
              <div className="progress rule">
                <div style={{ width: `${Math.min(100, (x.real / r.ingresos) * 100)}%`, background: x.color }} />
                <b style={{ left: `${x.ideal * 100}%` }} />
              </div>
            </div>
          ))}
          <p className="muted small">Necesidades = fijos + gastos marcados como necesarios. Gustos = gastos marcados como “gusto”.</p>
        </Card>

        <Card title="⚖️ Reparto justo entre los dos">
          <p className="muted small">
            Modo: {config.reparto === 'mitad' ? '50 / 50' : 'proporcional al ingreso'}. Solo cuenta lo que cada uno pagó por su cuenta
            (lo “Compartido” sale de la cuenta conjunta).
          </p>
          {PERSONAS.map((p) => (
            <div key={p} className="person-row">
              <PersonaTag p={p} />
              <div className="person-nums">
                <span>Gana {fmt(r.ingresoPorPersona[p])} ({pct(reparto.share[p])})</span>
                <span>Pagó {fmt(reparto.pagado[p])} · le tocaba {fmt(reparto.deberia[p])}</span>
              </div>
            </div>
          ))}
          <div className="settle">
            {reparto.monto < 1 ? '✨ Están a paz y salvo.' : (
              <>
                <strong style={{ color: COLOR_PERSONA[reparto.deudor] }}>{reparto.deudor}</strong> le debe{' '}
                <strong>{fmt(reparto.monto)}</strong> a{' '}
                <strong style={{ color: COLOR_PERSONA[reparto.acreedor] }}>{reparto.acreedor}</strong>
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="grid-2 cols">
        <Card title="Gastos más grandes del mes" action={<button className="link" onClick={() => go('gastos')}>Ver todos</button>}>
          {top.length === 0 ? <Empty emoji="🧾">Sin gastos variables.</Empty> : (
            <ul className="list compact">
              {top.map((g) => {
                const c = infoCategoria(g.categoria, config);
                return (
                  <li key={g.id}>
                    <span className="cat-dot" style={{ "--c": c.color }}>{c.emoji}</span>
                    <div className="grow"><b>{g.concepto}</b><small>{dateLabel(g.fecha)} · {g.pagadoPor}</small></div>
                    <strong>{fmt(g.monto)}</strong>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="🎯 Metas" action={<button className="link" onClick={() => go('metas')}>Ver metas</button>}>
          {metasActivas.length === 0 ? <Empty emoji="🎯">Creen una meta de ahorro.</Empty> : metasActivas.map((m) => {
            const e = estadoMeta(m);
            return (
              <div key={m.id} className="goal-mini">
                <div className="row-between"><span>{m.emoji || '🎯'} {m.nombre}</span><small>{fmt(e.ahorrado)} / {fmt(e.objetivo)}</small></div>
                <Progress value={e.progreso} color="var(--accent)" />
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
