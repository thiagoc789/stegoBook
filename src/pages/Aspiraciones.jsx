import { useMemo, useState } from 'react';
import { useApp } from '../lib/context';
import { add, remove, update } from '../lib/store';
import { prevision } from '../lib/finance';
import { addMonths, currentMonth, monthLabel, today } from '../lib/format';
import { Card, confirmar, Empty, Field, Modal, Segmented, Stat } from '../components/ui';

const TIPOS = {
  sueno: { label: '🌈 Sueño grande', desc: 'Casa, carro, viaje, boda, estudios…' },
  compra: { label: '🛍️ Compra deseada', desc: 'Cosas que quieren comprar. Esperen 30 días antes de decidir.' },
  experiencia: { label: '🎟️ Experiencia', desc: 'Conciertos, cenas especiales, planes juntos.' },
};
const PRIORIDAD = { 1: '🔥 Alta', 2: '⭐ Media', 3: '💤 Baja' };
const ESTADOS = { soñando: '💭 Soñando', ahorrando: '🐷 Ahorrando', logrado: '✅ Logrado', descartado: '🚫 Descartado' };
const DIAS_ENFRIAMIENTO = 30;

function AspForm({ asp, onClose }) {
  const { yo } = useApp();
  const [f, setF] = useState(asp || { nombre: '', tipo: 'sueno', costo: '', prioridad: 2, estado: 'soñando', quien: yo, nota: '', link: '', fecha: today() });
  const s = (k) => (v) => setF((o) => ({ ...o, [k]: v?.target ? v.target.value : v }));
  const submit = async (e) => {
    e.preventDefault();
    const { id, ...rest } = f;
    const payload = { ...rest, costo: Number(f.costo), prioridad: Number(f.prioridad) };
    if (asp?.id) await update('aspiraciones', asp.id, payload); else await add('aspiraciones', payload);
    onClose();
  };
  return (
    <Modal title={asp ? 'Editar' : 'Nueva aspiración'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Tipo" hint={TIPOS[f.tipo].desc}>
          <Segmented options={Object.entries(TIPOS).map(([value, t]) => ({ value, label: t.label }))} value={f.tipo} onChange={s('tipo')} />
        </Field>
        <Field label="¿Qué es?"><input value={f.nombre} onChange={s('nombre')} required autoFocus placeholder="Viaje a Japón, sofá nuevo, iPhone…" /></Field>
        <div className="grid-2">
          <Field label="Costo aproximado"><input type="number" min="0" inputMode="decimal" value={f.costo} onChange={s('costo')} required /></Field>
          <Field label="Prioridad">
            <select value={f.prioridad} onChange={s('prioridad')}>{Object.entries(PRIORIDAD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </Field>
        </div>
        <div className="grid-2">
          <Field label="¿De quién es el deseo?"><Segmented options={['Stephania', 'Santiago', 'Ambos']} value={f.quien} onChange={s('quien')} /></Field>
          <Field label="Estado">
            <select value={f.estado} onChange={s('estado')}>{Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </Field>
        </div>
        <Field label="Link (opcional)"><input type="url" value={f.link} onChange={s('link')} placeholder="https://" /></Field>
        <Field label="Notas"><textarea rows={2} value={f.nota} onChange={s('nota')} /></Field>
        <button className="btn primary block">Guardar</button>
      </form>
    </Modal>
  );
}

export default function Aspiraciones() {
  const { data, fmt } = useApp();
  const [edit, setEdit] = useState(null);
  const [filtro, setFiltro] = useState('activas');

  const excedente = useMemo(() => {
    const p = prevision(data, 6);
    return p.length ? p.reduce((a, x) => a + x.balance, 0) / p.length : 0;
  }, [data]);

  const lista = data.aspiraciones
    .filter((a) => (filtro === 'activas' ? !['logrado', 'descartado'].includes(a.estado) : ['logrado', 'descartado'].includes(a.estado)))
    .sort((a, b) => a.prioridad - b.prioridad || a.costo - b.costo);

  const totalSuenos = data.aspiraciones.filter((a) => !['logrado', 'descartado'].includes(a.estado)).reduce((s, a) => s + Number(a.costo), 0);
  const ahorradoDescartes = data.aspiraciones.filter((a) => a.estado === 'descartado' && a.tipo === 'compra').reduce((s, a) => s + Number(a.costo), 0);

  const convertirEnMeta = async (a) => {
    await add('metas', { nombre: a.nombre, emoji: a.tipo === 'compra' ? '🛍️' : '🌈', objetivo: Number(a.costo), fechaLimite: '', tipo: 'meta', aportes: [] });
    await update('aspiraciones', a.id, { estado: 'ahorrando' });
    alert('¡Listo! Se creó una meta de ahorro. Búsquenla en "Metas".');
  };

  return (
    <div className="page">
      <div className="page-head">
        <h2>Sueños y aspiraciones</h2>
        <button className="btn primary" onClick={() => setEdit({})}>+ Agregar</button>
      </div>

      <div className="stats">
        <Stat label="Lo que sueñan" value={fmt(totalSuenos)} sub="costo total de la lista" />
        <Stat label="Excedente mensual previsto" value={fmt(excedente)} tone={excedente > 0 ? 'ok' : 'danger'} sub="promedio próximos 6 meses" />
        <Stat label="Ahorrado por no comprar" value={fmt(ahorradoDescartes)} tone="ok" sub="compras descartadas 💪" />
      </div>

      <Segmented options={[{ value: 'activas', label: 'En la lista' }, { value: 'cerradas', label: 'Logradas / descartadas' }]} value={filtro} onChange={setFiltro} />

      {lista.length === 0 ? <Card><Empty emoji="🌈">Escriban juntos lo que quieren lograr. Ver el sueño ayuda a no gastar en lo que no importa.</Empty></Card> : (
        <div className="goals">
          {lista.map((a) => {
            const meses = excedente > 0 ? Math.ceil(Number(a.costo) / excedente) : null;
            const dias = Math.floor((Date.now() - new Date(a.fecha || a.creado || Date.now()).getTime()) / 86400000);
            const enfriando = a.tipo === 'compra' && dias < DIAS_ENFRIAMIENTO && a.estado === 'soñando';
            return (
              <Card key={a.id} className="asp">
                <div className="goal-head">
                  <span className="goal-emoji">{TIPOS[a.tipo]?.label.split(' ')[0]}</span>
                  <div className="grow">
                    <h3>{a.nombre}</h3>
                    <small className="muted">{PRIORIDAD[a.prioridad]} · {ESTADOS[a.estado]} · {a.quien}</small>
                  </div>
                  <button className="icon-btn" onClick={() => setEdit(a)} aria-label="Editar">✏️</button>
                  <button className="icon-btn danger" onClick={() => confirmar() && remove('aspiraciones', a.id)} aria-label="Eliminar">🗑</button>
                </div>
                <div className="goal-amount"><strong>{fmt(a.costo)}</strong></div>
                {a.estado !== 'logrado' && a.estado !== 'descartado' && (
                  <p className="small">
                    {meses
                      ? <>Con su excedente actual lo podrían tener en <b>{meses} {meses === 1 ? 'mes' : 'meses'}</b> ({monthLabel(addMonths(currentMonth(), meses))}).</>
                      : <span className="txt-warn">Hoy no les sobra plata al mes: primero hay que recortar gastos (ver Previsiones).</span>}
                  </p>
                )}
                {enfriando && (
                  <p className="small cooling">🧊 Periodo de enfriamiento: lleva {dias} días en la lista. Esperen {DIAS_ENFRIAMIENTO - dias} días más y, si todavía lo quieren, adelante.</p>
                )}
                {a.tipo === 'compra' && !enfriando && a.estado === 'soñando' && <p className="small txt-ok">✅ Ya pasó el periodo de enfriamiento. ¿Todavía lo quieren?</p>}
                {a.nota && <p className="small muted">{a.nota}</p>}
                {a.link && <a className="small" href={a.link} target="_blank" rel="noreferrer">Ver enlace ↗</a>}
                <div className="row gap wrap">
                  {a.estado === 'soñando' && <button className="btn primary sm" onClick={() => convertirEnMeta(a)}>🐷 Convertir en meta</button>}
                  {a.estado !== 'logrado' && <button className="btn ghost sm" onClick={() => update('aspiraciones', a.id, { estado: 'logrado' })}>✅ Logrado</button>}
                  {a.estado !== 'descartado' && a.estado !== 'logrado' && <button className="btn ghost sm" onClick={() => update('aspiraciones', a.id, { estado: 'descartado' })}>🚫 Ya no lo quiero</button>}
                  {['logrado', 'descartado'].includes(a.estado) && <button className="btn ghost sm" onClick={() => update('aspiraciones', a.id, { estado: 'soñando' })}>↩ Reactivar</button>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {edit && <AspForm asp={edit.id ? edit : null} onClose={() => setEdit(null)} />}
    </div>
  );
}
