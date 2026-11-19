import { useMemo, useState } from 'react';
import { useApp } from '../lib/context';
import { add, remove, update } from '../lib/store';
import { categorias, infoCategoria } from '../lib/constants';
import { addMonths, currentMonth, daysInMonth, pct } from '../lib/format';
import { resumenMes } from '../lib/finance';
import { Card, CategoriaSelect, Empty, Field, Modal, MonthPicker, Progress, Stat } from '../components/ui';

function promedioCategoria(data, cat, mes) {
  const vals = [1, 2, 3].map((i) => resumenMes(data, addMonths(mes, -i)).porCategoria[cat] || 0).filter((v) => v > 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

export default function Presupuestos() {
  const { data, mes, fmt, config } = useApp();
  const [nuevo, setNuevo] = useState(null);
  const r = useMemo(() => resumenMes(data, mes), [data, mes]);
  const usados = new Set(data.presupuestos.map((p) => p.categoria));

  const filas = data.presupuestos.map((p) => {
    const gastado = r.porCategoria[p.categoria] || 0;
    return { ...p, gastado, ratio: Number(p.limite) ? gastado / Number(p.limite) : 0, prom: promedioCategoria(data, p.categoria, mes) };
  }).sort((a, b) => b.ratio - a.ratio);

  const totalLimite = filas.reduce((a, p) => a + Number(p.limite || 0), 0);
  const totalGastado = filas.reduce((a, p) => a + p.gastado, 0);
  const sinPresupuesto = Object.entries(r.porCategoria).filter(([c]) => !usados.has(c));
  const esActual = mes === currentMonth();
  const avanceMes = esActual ? new Date().getDate() / daysInMonth(mes) : 1;

  const sugerir = async () => {
    const cats = categorias(config).map((c) => c.nombre).filter((c) => !usados.has(c));
    let n = 0;
    for (const c of cats) {
      const p = promedioCategoria(data, c, currentMonth());
      if (p > 0) { await add('presupuestos', { categoria: c, limite: Math.round((p * 0.9) / 1000) * 1000 || Math.round(p * 0.9) }); n++; }
    }
    alert(n ? `Se crearon ${n} presupuestos con un 10% menos que su promedio de los últimos 3 meses.` : 'No hay suficiente historial para sugerir presupuestos.');
  };

  return (
    <div className="page">
      <div className="page-head">
        <h2>Presupuestos</h2>
        <MonthPicker />
      </div>

      <div className="stats">
        <Stat label="Presupuestado" value={fmt(totalLimite)} />
        <Stat label="Gastado" value={fmt(totalGastado)} tone={totalGastado > totalLimite ? 'danger' : 'ok'} />
        <Stat label="Disponible" value={fmt(totalLimite - totalGastado)} tone={totalLimite - totalGastado < 0 ? 'danger' : undefined} />
        {esActual && <Stat label="Mes transcurrido" value={pct(avanceMes)} sub="compárenlo con el % gastado" />}
      </div>

      <Card title="Límites por categoría" action={
        <div className="row gap">
          <button className="btn ghost sm" onClick={sugerir}>🪄 Sugerir</button>
          <button className="btn primary sm" onClick={() => setNuevo({ categoria: categorias(config).find((c) => !usados.has(c.nombre))?.nombre || 'Otros', limite: '' })}>+ Presupuesto</button>
        </div>
      }>
        {filas.length === 0 ? <Empty emoji="📊">Pongan un tope mensual a las categorías donde más se les va la plata (restaurantes, domicilios, ropa…).</Empty> : (
          <div className="budgets">
            {filas.map((p) => {
              const c = infoCategoria(p.categoria, config);
              const adelantado = esActual && p.ratio > avanceMes + 0.1 && p.ratio <= 1;
              return (
                <div key={p.id} className="budget">
                  <div className="row-between">
                    <span><span className="cat-dot sm" style={{ "--c": c.color }}>{c.emoji}</span> <b>{p.categoria}</b></span>
                    <span className="row gap-s">
                      <input className="inline-num" type="number" min="0" defaultValue={p.limite}
                        onBlur={(e) => Number(e.target.value) !== Number(p.limite) && update('presupuestos', p.id, { limite: Number(e.target.value) })}
                        aria-label="Límite" />
                      <button className="icon-btn danger" onClick={() => remove('presupuestos', p.id)} aria-label="Eliminar">🗑</button>
                    </span>
                  </div>
                  <Progress value={p.ratio} />
                  <div className="row-between small">
                    <span className={p.ratio > 1 ? 'txt-danger' : 'muted'}>
                      {fmt(p.gastado)} de {fmt(p.limite)} ({pct(p.ratio)})
                      {p.ratio > 1 && ` · excedido por ${fmt(p.gastado - p.limite)}`}
                      {adelantado && ' · ⚠️ van más rápido que el mes'}
                    </span>
                    {p.prom > 0 && <span className="muted">prom. {fmt(p.prom)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {sinPresupuesto.length > 0 && (
        <Card title="Categorías con gasto pero sin presupuesto">
          <ul className="list compact">
            {sinPresupuesto.sort((a, b) => b[1] - a[1]).map(([cat, v]) => {
              const c = infoCategoria(cat, config);
              return (
                <li key={cat}>
                  <span className="cat-dot" style={{ "--c": c.color }}>{c.emoji}</span>
                  <div className="grow"><b>{cat}</b></div>
                  <strong>{fmt(v)}</strong>
                  <button className="btn ghost sm" onClick={() => setNuevo({ categoria: cat, limite: Math.round(v) })}>Limitar</button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {nuevo && (
        <Modal title="Nuevo presupuesto" onClose={() => setNuevo(null)}>
          <form className="form" onSubmit={async (e) => {
            e.preventDefault();
            const existente = data.presupuestos.find((p) => p.categoria === nuevo.categoria);
            if (existente) await update('presupuestos', existente.id, { limite: Number(nuevo.limite) });
            else await add('presupuestos', { categoria: nuevo.categoria, limite: Number(nuevo.limite) });
            setNuevo(null);
          }}>
            <Field label="Categoría"><CategoriaSelect value={nuevo.categoria} onChange={(v) => setNuevo({ ...nuevo, categoria: v })} /></Field>
            <Field label="Límite mensual" hint={(() => { const p = promedioCategoria(data, nuevo.categoria, mes); return p ? `Promedio últimos 3 meses: ${fmt(p)}` : undefined; })()}>
              <input type="number" min="0" inputMode="decimal" value={nuevo.limite} onChange={(e) => setNuevo({ ...nuevo, limite: e.target.value })} required autoFocus />
            </Field>
            <button className="btn primary block">Guardar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
