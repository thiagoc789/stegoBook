import { useMemo, useRef, useState } from 'react';
import { add, remove, update } from '../lib/store';
import { useApp } from '../lib/context';
import { ATAJOS_BASE, CATEGORIAS, infoCategoria, PERSONAS } from '../lib/constants';
import { aprender, clasificar, frecuentes } from '../lib/clasificar';
import { personaDe } from '../lib/finance';
import { today } from '../lib/format';
import { confirmar, Modal, MoneyInput, Segmented } from './ui';

const ayer = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toLocaleDateString('en-CA'); };

export default function QuickAdd({ gasto, onClose, onSaved }) {
  const { data, persona, yo } = useApp();
  const editando = !!gasto?.id;
  const [quien, setQuien] = useState(gasto ? personaDe(gasto) : persona || yo);
  const [monto, setMonto] = useState(gasto?.monto || '');
  const [concepto, setConcepto] = useState(gasto?.concepto || '');
  const [categoria, setCategoria] = useState(gasto?.categoria || '');
  const [tipo, setTipo] = useState(gasto?.tipo || '');
  const [fuente, setFuente] = useState(gasto ? 'manual' : ''); // de dónde salió la categoría
  const [tipoManual, setTipoManual] = useState(!!gasto);
  const [fecha, setFecha] = useState(gasto?.fecha || today());
  const [verTodas, setVerTodas] = useState(false);
  const [saving, setSaving] = useState(false);
  const montoRef = useRef();

  // Aprende de los gastos de esta persona (y de ambos como respaldo)
  const historial = useMemo(() => {
    const propios = data.gastos.filter((g) => personaDe(g) === quien);
    return aprender(propios.length >= 5 ? propios : data.gastos);
  }, [data.gastos, quien]);
  const atajos = useMemo(() => {
    const f = frecuentes(historial, 8);
    const extra = ATAJOS_BASE.filter((a) => !f.some((x) => x.concepto.toLowerCase() === a.concepto.toLowerCase()));
    return [...f, ...extra].slice(0, 8);
  }, [historial]);

  const elegirCategoria = (c, src = 'manual', t) => {
    setCategoria(c);
    setFuente(src);
    if (!tipoManual || src === 'atajo') { setTipo(t || infoCategoria(c).tipo); if (src === 'atajo') setTipoManual(false); }
  };

  const onConcepto = (v) => {
    setConcepto(v);
    if (fuente === 'manual' && categoria) return; // ya la eligieron a mano
    const r = clasificar(v, historial);
    if (r) {
      setCategoria(r.categoria); setFuente(r.fuente);
      if (!tipoManual) setTipo(r.tipo);
    } else if (fuente !== 'manual') { setCategoria(''); setFuente(''); if (!tipoManual) setTipo(''); }
  };

  const usarAtajo = (a) => {
    setConcepto(a.concepto);
    elegirCategoria(a.categoria, 'atajo', a.tipo);
    montoRef.current?.focus();
  };

  const catFinal = categoria || 'Otros';
  const tipoFinal = tipo || infoCategoria(catFinal).tipo;
  const valido = Number(monto) > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!valido || saving) return;
    setSaving(true);
    const payload = {
      persona: quien, monto: Number(monto), concepto: concepto.trim() || catFinal,
      categoria: catFinal, tipo: tipoFinal, fecha,
    };
    try {
      if (editando) await update('gastos', gasto.id, payload);
      else await add('gastos', payload);
      onSaved?.(payload, editando);
      onClose();
    } catch (err) {
      alert(`No se pudo guardar: ${err.message}`);
      setSaving(false);
    }
  };

  const top = ['Mercado', 'Restaurantes', 'Domicilios', 'Transporte', 'Salidas', 'Ropa y compras', 'Salud', 'Hogar'];
  const visibles = verTodas ? CATEGORIAS : CATEGORIAS.filter((c) => top.includes(c.nombre) || c.nombre === categoria);

  return (
    <Modal title={editando ? 'Editar gasto' : 'Gasto rápido'} onClose={onClose}>
      <form onSubmit={submit} className="form quick">
        <Segmented className="small-seg" options={PERSONAS.map((p) => ({ value: p, label: p }))} value={quien} onChange={setQuien} />

        <MoneyInput className="big" value={monto} onChange={setMonto} autoFocus={!editando} ref={montoRef} aria-label="Monto" />

        {!editando && (
          <div className="atajos">
            {atajos.map((a) => (
              <button type="button" key={a.concepto} className={concepto === a.concepto ? 'active' : ''} onClick={() => usarAtajo(a)}>
                {infoCategoria(a.categoria).emoji} {a.concepto}
              </button>
            ))}
          </div>
        )}

        <input
          className="concepto" value={concepto} onChange={(e) => onConcepto(e.target.value)}
          placeholder="¿En qué? Ej: Rappi, D1, Uber, cine…" aria-label="Concepto"
        />

        <div className="clasif">
          <span className="muted small">
            {fuente === 'auto' && '🪄 Clasificado automáticamente'}
            {fuente === 'historial' && '🧠 Como la última vez'}
            {fuente === 'atajo' && '⚡ Atajo'}
            {(fuente === 'manual' || !fuente) && (categoria ? 'Categoría' : 'Elige una categoría (o escribe el concepto)')}
          </span>
          <div className="cat-grid">
            {visibles.map((c) => (
              <button type="button" key={c.nombre} className={categoria === c.nombre ? 'active' : ''} style={{ '--c': c.color }}
                onClick={() => elegirCategoria(c.nombre)}>
                <span>{c.emoji}</span>{c.nombre}
              </button>
            ))}
            <button type="button" className="more" onClick={() => setVerTodas(!verTodas)}>{verTodas ? 'Menos' : 'Más…'}</button>
          </div>
        </div>

        <Segmented
          className="tipo-seg"
          options={[{ value: 'necesidad', label: '✅ Necesidad' }, { value: 'gusto', label: '✨ Gusto' }]}
          value={tipoFinal} onChange={(v) => { setTipo(v); setTipoManual(true); }}
        />

        <div className="fecha-row">
          <Segmented options={[{ value: today(), label: 'Hoy' }, { value: ayer(), label: 'Ayer' }]} value={fecha} onChange={setFecha} />
          <input type="date" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} aria-label="Fecha" />
        </div>

        <button className="btn primary block" disabled={!valido || saving}>
          {saving ? 'Guardando…' : valido ? `Guardar · ${infoCategoria(catFinal).emoji} ${catFinal}` : 'Escribe el monto'}
        </button>
        {editando && (
          <button type="button" className="btn ghost block danger-txt" onClick={async () => { if (confirmar()) { await remove('gastos', gasto.id); onClose(); } }}>
            Eliminar gasto
          </button>
        )}
      </form>
    </Modal>
  );
}
