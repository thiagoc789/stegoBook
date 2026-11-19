import { useState } from 'react';
import { add, update } from '../lib/store';
import { useApp } from '../lib/context';
import { PAGADORES } from '../lib/constants';
import { today } from '../lib/format';
import { CategoriaSelect, Field, Modal, Segmented } from './ui';

export default function GastoForm({ gasto, onClose }) {
  const { yo } = useApp();
  const [f, setF] = useState(() => gasto || {
    concepto: '', monto: '', categoria: 'Mercado', pagadoPor: yo, fecha: today(), tipo: 'necesidad', nota: '',
  });
  const [saving, setSaving] = useState(false);
  const s = (k) => (v) => setF((o) => ({ ...o, [k]: v?.target ? v.target.value : v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.monto || Number(f.monto) <= 0) return;
    setSaving(true);
    const { id, ...rest } = f;
    const payload = { ...rest, monto: Number(f.monto), concepto: f.concepto.trim() || f.categoria };
    try {
      if (gasto?.id) await update('gastos', gasto.id, payload);
      else await add('gastos', payload);
      onClose();
    } catch (err) {
      alert(`No se pudo guardar: ${err.message}`);
      setSaving(false);
    }
  };

  return (
    <Modal title={gasto ? 'Editar gasto' : 'Nuevo gasto'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <Field label="Monto">
          <input className="big-input" type="number" inputMode="decimal" min="0" step="any" autoFocus
            value={f.monto} onChange={s('monto')} placeholder="0" required />
        </Field>
        <Field label="Concepto">
          <input value={f.concepto} onChange={s('concepto')} placeholder="Ej: Mercado D1, Uber, cine…" />
        </Field>
        <div className="grid-2">
          <Field label="Categoría"><CategoriaSelect value={f.categoria} onChange={s('categoria')} /></Field>
          <Field label="Fecha"><input type="date" value={f.fecha} onChange={s('fecha')} required /></Field>
        </div>
        <Field label="¿Quién pagó?">
          <Segmented options={PAGADORES} value={f.pagadoPor} onChange={s('pagadoPor')} />
        </Field>
        <Field label="¿Era necesario?" hint="Les ayuda a ver cuánto se va en gustos vs. necesidades (regla 50/30/20).">
          <Segmented
            options={[{ value: 'necesidad', label: '✅ Necesidad' }, { value: 'deseo', label: '✨ Gusto' }]}
            value={f.tipo} onChange={s('tipo')}
          />
        </Field>
        <Field label="Nota (opcional)"><input value={f.nota} onChange={s('nota')} /></Field>
        <button className="btn primary block" disabled={saving}>{saving ? 'Guardando…' : 'Guardar gasto'}</button>
      </form>
    </Modal>
  );
}
