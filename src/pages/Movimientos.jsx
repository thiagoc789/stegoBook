import { useMemo, useState } from 'react';
import { useApp } from '../lib/context';
import { CATEGORIAS, infoCategoria } from '../lib/constants';
import { fijoAplicaEn, personaDe, tipoDe } from '../lib/finance';
import { dateLabel } from '../lib/format';
import { Card, Empty, PersonaTag, Segmented } from '../components/ui';
import QuickAdd from '../components/QuickAdd';

function Fila({ g, onClick, juntos }) {
  const { fmt } = useApp();
  const c = infoCategoria(g.categoria);
  const gusto = tipoDe(g) === 'gusto';
  return (
    <li className={onClick ? 'clickable' : ''} onClick={onClick}>
      <span className="cat-dot" style={{ '--c': c.color }}>{c.emoji}</span>
      <div className="grow">
        <b>{g.concepto}</b>
        <small>{g.categoria} · {gusto ? '✨ gusto' : '✅ necesidad'}</small>
      </div>
      <div className="right">
        <strong>{fmt(g.monto)}</strong>
        {juntos && <PersonaTag p={personaDe(g)} />}
      </div>
    </li>
  );
}

export default function Movimientos() {
  const { data, mes, fmt, persona } = useApp();
  const [edit, setEdit] = useState(null);
  const [tipo, setTipo] = useState('');
  const [cat, setCat] = useState('');
  const [verFijos, setVerFijos] = useState(false);
  const de = (x) => !persona || personaDe(x) === persona;
  const filtro = (g) => (!tipo || tipoDe(g) === tipo) && (!cat || g.categoria === cat);

  const lista = useMemo(() => data.gastos
    .filter((g) => de(g) && (g.fecha || '').startsWith(mes) && filtro(g))
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.creado || '').localeCompare(a.creado || '')),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [data.gastos, mes, persona, tipo, cat]);
  const fijos = data.gastosFijos.filter((f) => de(f) && fijoAplicaEn(f, mes) && filtro(f));

  const total = lista.reduce((a, g) => a + Number(g.monto || 0), 0);
  const totalFijos = fijos.reduce((a, g) => a + Number(g.monto || 0), 0);
  const porDia = lista.reduce((acc, g) => { (acc[g.fecha] ||= []).push(g); return acc; }, {});

  return (
    <div className="page">
      <Card>
        <Segmented options={[{ value: '', label: 'Todo' }, { value: 'necesidad', label: '✅ Necesidades' }, { value: 'gusto', label: '✨ Gustos' }]} value={tipo} onChange={setTipo} />
        <select className="mt" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => <option key={c.nombre} value={c.nombre}>{c.emoji} {c.nombre}</option>)}
        </select>
        <div className="row-between mt">
          <span className="muted">{lista.length} gastos del día a día</span>
          <strong>{fmt(total)}</strong>
        </div>
      </Card>

      {fijos.length > 0 && (
        <Card title={`📌 Fijos del mes · ${fmt(totalFijos)}`} action={<button className="link" onClick={() => setVerFijos(!verFijos)}>{verFijos ? 'Ocultar' : 'Ver'}</button>}>
          {verFijos && <ul className="list">{fijos.map((f) => <Fila key={f.id} g={f} juntos={!persona} />)}</ul>}
          {verFijos && <p className="muted small">Los fijos se editan en “Mi plata”.</p>}
        </Card>
      )}

      {lista.length === 0 ? (
        <Card><Empty emoji="🧾">No hay gastos {tipo || cat ? 'con este filtro' : 'este mes'}. Toca <b>＋</b> para agregar uno.</Empty></Card>
      ) : Object.entries(porDia).map(([dia, gs]) => (
        <Card key={dia} title={dateLabel(dia)} action={<small className="muted">{fmt(gs.reduce((a, g) => a + Number(g.monto), 0))}</small>}>
          <ul className="list">{gs.map((g) => <Fila key={g.id} g={g} juntos={!persona} onClick={() => setEdit(g)} />)}</ul>
        </Card>
      ))}

      {edit && <QuickAdd gasto={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
