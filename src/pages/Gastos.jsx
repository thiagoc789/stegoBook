import { useMemo, useState } from 'react';
import { useApp } from '../lib/context';
import { remove } from '../lib/store';
import { categorias, infoCategoria, PAGADORES } from '../lib/constants';
import { dateLabel } from '../lib/format';
import { Card, confirmar, Empty, MonthPicker, PersonaTag } from '../components/ui';
import GastoForm from '../components/GastoForm';

export default function Gastos() {
  const { data, mes, fmt, config } = useApp();
  const [edit, setEdit] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [quien, setQuien] = useState('');
  const [tipo, setTipo] = useState('');

  const lista = useMemo(() => data.gastos
    .filter((g) => (g.fecha || '').startsWith(mes))
    .filter((g) => !cat || g.categoria === cat)
    .filter((g) => !quien || g.pagadoPor === quien)
    .filter((g) => !tipo || g.tipo === tipo)
    .filter((g) => !q || `${g.concepto} ${g.nota || ''}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.creado || '').localeCompare(a.creado || '')),
  [data.gastos, mes, cat, quien, tipo, q]);

  const total = lista.reduce((a, g) => a + Number(g.monto || 0), 0);
  const porDia = lista.reduce((acc, g) => { (acc[g.fecha] ||= []).push(g); return acc; }, {});

  const exportar = () => {
    const rows = [['Fecha', 'Concepto', 'Categoría', 'Pagó', 'Tipo', 'Monto', 'Nota'],
      ...lista.map((g) => [g.fecha, g.concepto, g.categoria, g.pagadoPor, g.tipo, g.monto, g.nota || ''])];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    a.download = `gastos-${mes}.csv`;
    a.click();
  };

  return (
    <div className="page">
      <div className="page-head">
        <h2>Gastos variables</h2>
        <MonthPicker />
      </div>

      <Card>
        <div className="filters">
          <input placeholder="🔍 Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias(config).map((c) => <option key={c.nombre} value={c.nombre}>{c.emoji} {c.nombre}</option>)}
          </select>
          <select value={quien} onChange={(e) => setQuien(e.target.value)}>
            <option value="">Todos</option>
            {PAGADORES.map((p) => <option key={p}>{p}</option>)}
          </select>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Necesidad y gusto</option>
            <option value="necesidad">Solo necesidades</option>
            <option value="deseo">Solo gustos</option>
          </select>
        </div>
        <div className="row-between total-bar">
          <span>{lista.length} gastos</span>
          <strong>Total: {fmt(total)}</strong>
          <div className="row gap">
            <button className="btn ghost sm" onClick={exportar} disabled={!lista.length}>⬇ CSV</button>
            <button className="btn primary sm" onClick={() => setEdit({})}>+ Gasto</button>
          </div>
        </div>
      </Card>

      {lista.length === 0 ? (
        <Card><Empty emoji="🧾">No hay gastos registrados con estos filtros.</Empty></Card>
      ) : Object.entries(porDia).map(([dia, gs]) => (
        <Card key={dia} title={dateLabel(dia)} action={<small className="muted">{fmt(gs.reduce((a, g) => a + Number(g.monto), 0))}</small>}>
          <ul className="list">
            {gs.map((g) => {
              const c = infoCategoria(g.categoria, config);
              return (
                <li key={g.id} onClick={() => setEdit(g)} className="clickable">
                  <span className="cat-dot" style={{ "--c": c.color }}>{c.emoji}</span>
                  <div className="grow">
                    <b>{g.concepto}</b>
                    <small>{g.categoria}{g.nota ? ` · ${g.nota}` : ''}</small>
                  </div>
                  <div className="right">
                    <strong>{fmt(g.monto)}</strong>
                    <div className="row gap-s">
                      {g.tipo === 'deseo' && <span className="tag" style={{ '--c': '#ec4899' }}>✨ gusto</span>}
                      <PersonaTag p={g.pagadoPor} />
                    </div>
                  </div>
                  <button className="icon-btn danger" aria-label="Eliminar"
                    onClick={(e) => { e.stopPropagation(); if (confirmar()) remove('gastos', g.id); }}>🗑</button>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}

      {edit && <GastoForm gasto={edit.id ? edit : null} onClose={() => setEdit(null)} />}
    </div>
  );
}
