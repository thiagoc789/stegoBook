import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine,
} from 'recharts';
import { useApp } from '../lib/context';
import {
  estadoMeta, fijoAplicaEn, prevision, promedioPorCategoria, totalAhorradoMetas,
} from '../lib/finance';
import { addMonths, currentMonth, monthLabel } from '../lib/format';
import { FRECUENCIAS, infoCategoria } from '../lib/constants';
import { Card, Empty, Field, Stat } from '../components/ui';

function Slider({ label, value, onChange, min = 0, max = 50, step = 1, suffix = '%' }) {
  return (
    <label className="slider">
      <span className="row-between"><span>{label}</span><b>{value}{suffix}</b></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export default function Previsiones() {
  const { data, fmt, config } = useApp();
  const [meses, setMeses] = useState(12);
  const [recorte, setRecorte] = useState(0);
  const [aumento, setAumento] = useState(0);
  const [extra, setExtra] = useState('');
  const [ahorroInicial, setAhorroInicial] = useState(() => Math.round(totalAhorradoMetas(data.metas)));
  const [cortes, setCortes] = useState({});
  const [objetivo, setObjetivo] = useState('');

  const promCat = useMemo(() => promedioPorCategoria(data), [data]);
  const topCats = Object.entries(promCat).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const base = useMemo(() => prevision(data, meses, { ahorroInicial: Number(ahorroInicial) || 0 }), [data, meses, ahorroInicial]);
  const esc = useMemo(() => prevision(data, meses, {
    recorteVariablePct: recorte, aumentoSalarialPct: aumento, ingresoExtra: Number(extra) || 0,
    ahorroInicial: Number(ahorroInicial) || 0, recortesCategoria: cortes,
  }), [data, meses, recorte, aumento, extra, ahorroInicial, cortes]);

  const hayEscenario = recorte || aumento || Number(extra) || Object.values(cortes).some(Boolean);
  const chart = base.map((b, i) => ({
    mes: monthLabel(b.mes, true),
    'Ahorro acumulado (actual)': Math.round(b.acumulado),
    ...(hayEscenario ? { 'Con cambios': Math.round(esc[i].acumulado) } : {}),
  }));

  const finBase = base.at(-1)?.acumulado || 0;
  const finEsc = esc.at(-1)?.acumulado || 0;
  const balProm = esc.reduce((a, x) => a + x.balance, 0) / (esc.length || 1);
  const primerNegativo = esc.find((x) => x.acumulado < 0);

  const proximosGrandes = [];
  for (let i = 0; i < 12; i++) {
    const m = addMonths(currentMonth(), i);
    data.gastosFijos.filter((f) => (f.frecuencia || 'mensual') !== 'mensual' && fijoAplicaEn(f, m))
      .forEach((f) => proximosGrandes.push({ ...f, mes: m }));
  }

  const cuotasMetas = data.metas.reduce((a, m) => a + (estadoMeta(m).cuotaMensual || 0), 0);
  const mesObjetivo = Number(objetivo) > 0 ? esc.find((x) => x.acumulado >= Number(objetivo)) : null;

  if (!data.salarios.length) {
    return <div className="page"><h2>Previsiones</h2><Card><Empty emoji="🔮">Registren salarios y gastos fijos para poder proyectar el futuro.</Empty></Card></div>;
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>Previsiones</h2>
        <select value={meses} onChange={(e) => setMeses(Number(e.target.value))} aria-label="Horizonte">
          <option value={6}>6 meses</option><option value={12}>12 meses</option><option value={24}>24 meses</option><option value={36}>3 años</option>
        </select>
      </div>

      <div className="stats">
        <Stat label="Excedente mensual promedio" value={fmt(balProm)} tone={balProm >= 0 ? 'ok' : 'danger'} />
        <Stat label={`Ahorro en ${monthLabel(esc.at(-1).mes)}`} value={fmt(finEsc)} tone={finEsc >= 0 ? 'ok' : 'danger'} />
        {hayEscenario ? <Stat label="Diferencia por los cambios" value={`${finEsc - finBase >= 0 ? '+' : ''}${fmt(finEsc - finBase)}`} tone={finEsc >= finBase ? 'ok' : 'danger'} />
          : <Stat label="Gasto variable estimado" value={fmt(base[0]?.variables)} sub="promedio de los últimos 3 meses" />}
        <Stat label="Cuotas de metas" value={fmt(cuotasMetas)} sub={balProm >= cuotasMetas ? '✅ les alcanza' : '⚠️ no alcanza'} tone={balProm >= cuotasMetas ? 'ok' : 'warn'} />
      </div>

      {primerNegativo && (
        <Card className="danger-card">🚨 Si siguen así, en <b>{monthLabel(primerNegativo.mes)}</b> su ahorro acumulado sería negativo ({fmt(primerNegativo.acumulado)}). Usen el simulador para ver qué recortar.</Card>
      )}

      <Card title="📈 Proyección de ahorro acumulado">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chart} margin={{ left: -10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 12, fill: 'var(--muted)' }} />
            <YAxis tickFormatter={(v) => fmt(v, true)} tick={{ fontSize: 11, fill: 'var(--muted)' }} width={70} />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)' }} />
            <Legend />
            <ReferenceLine y={0} stroke="var(--danger)" strokeDasharray="4 4" />
            {Number(objetivo) > 0 && <ReferenceLine y={Number(objetivo)} stroke="var(--accent)" strokeDasharray="4 4" label={{ value: 'Objetivo', fill: 'var(--accent)', fontSize: 12 }} />}
            <Line type="monotone" dataKey="Ahorro acumulado (actual)" stroke="#94a3b8" strokeWidth={2} dot={false} />
            {hayEscenario && <Line type="monotone" dataKey="Con cambios" stroke="#7c5cff" strokeWidth={3} dot={false} />}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid-2 cols">
        <Card title="🧪 Simulador “¿y si…?”">
          <Field label="Ahorro con el que arrancan">
            <input type="number" min="0" value={ahorroInicial} onChange={(e) => setAhorroInicial(e.target.value)} />
          </Field>
          <Slider label="Recortar todos los gastos variables" value={recorte} onChange={setRecorte} />
          <Slider label="Aumento de salario" value={aumento} onChange={setAumento} max={30} />
          <Field label="Ingreso extra mensual (freelance, arriendo…)">
            <input type="number" min="0" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="0" />
          </Field>
          {topCats.length > 0 && <h4 className="sub">Recortar por categoría</h4>}
          {topCats.map(([c, v]) => {
            const info = infoCategoria(c, config);
            const pctCorte = cortes[c] || 0;
            return (
              <Slider key={c} label={`${info.emoji} ${c} (${fmt(v)}/mes → ${fmt(v * (1 - pctCorte / 100))})`}
                value={pctCorte} max={100} step={5} onChange={(x) => setCortes({ ...cortes, [c]: x })} />
            );
          })}
          {hayEscenario && <button className="btn ghost sm" onClick={() => { setRecorte(0); setAumento(0); setExtra(''); setCortes({}); }}>Reiniciar</button>}
        </Card>

        <div className="col">
          <Card title="🎯 ¿Cuándo llegamos a…?">
            <Field label="Monto que quieren tener ahorrado">
              <input type="number" min="0" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Ej: 20.000.000" />
            </Field>
            {Number(objetivo) > 0 && (mesObjetivo
              ? <p>Lo alcanzarían en <b>{monthLabel(mesObjetivo.mes)}</b> 🎉</p>
              : <p className="txt-warn">No lo alcanzan en los próximos {meses} meses con este escenario.</p>)}
          </Card>

          <Card title="📅 Pagos grandes que vienen">
            {proximosGrandes.length === 0 ? <Empty emoji="📅">No hay pagos no mensuales (seguros, impuestos, matrículas…) programados.</Empty> : (
              <ul className="list compact">
                {proximosGrandes.map((f) => (
                  <li key={f.id + f.mes}>
                    <span className="cat-dot">{infoCategoria(f.categoria, config).emoji}</span>
                    <div className="grow"><b>{f.concepto}</b><small>{monthLabel(f.mes)} · {FRECUENCIAS[f.frecuencia].label}</small></div>
                    <strong>{fmt(f.monto)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card title="Detalle mes a mes">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Mes</th><th>Ingresos</th><th>Fijos</th><th>Variables</th><th>Balance</th><th>Acumulado</th></tr></thead>
            <tbody>
              {esc.map((x) => (
                <tr key={x.mes}>
                  <td>{monthLabel(x.mes, true)}</td>
                  <td>{fmt(x.ingresos)}</td>
                  <td>{fmt(x.fijos)}</td>
                  <td>{fmt(x.variables)}</td>
                  <td className={x.balance >= 0 ? 'txt-ok' : 'txt-danger'}>{fmt(x.balance)}</td>
                  <td className={x.acumulado >= 0 ? '' : 'txt-danger'}><b>{fmt(x.acumulado)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">Supuestos: salarios vigentes, gastos fijos programados (según su frecuencia) y gasto variable igual al promedio de los últimos 3 meses con datos.</p>
      </Card>
    </div>
  );
}
