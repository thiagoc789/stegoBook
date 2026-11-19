import { useRef, useState } from 'react';
import { useApp } from '../lib/context';
import { add, COLECCIONES, importAll, set } from '../lib/store';
import { firebaseConfigured } from '../lib/firebase';
import { CATEGORIAS_BASE, MONEDAS, PERSONAS } from '../lib/constants';
import { datosDemo } from '../lib/demo';
import { today } from '../lib/format';
import { Card, Field, Segmented } from '../components/ui';

export default function Ajustes() {
  const { data, config, yo, setYo } = useApp();
  const [nuevaCat, setNuevaCat] = useState({ nombre: '', emoji: '🏷️' });
  const fileRef = useRef();
  const guardar = (patch) => set('config', 'general', patch);
  const vacio = Object.values(data).every((arr) => arr.length === 0);

  const exportar = () => {
    const backup = { ...data, config: [{ id: 'general', ...config }], exportado: new Date().toISOString() };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    a.download = `stegobook-respaldo-${today()}.json`;
    a.click();
  };

  const importar = async (file) => {
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      if (!COLECCIONES.some((c) => Array.isArray(backup[c]))) throw new Error('El archivo no parece un respaldo de StegoBook');
      if (!window.confirm('Se agregarán/reemplazarán los registros del respaldo. ¿Continuar?')) return;
      await importAll(backup);
      alert('Respaldo importado ✅');
    } catch (e) {
      alert(`No se pudo importar: ${e.message}`);
    }
  };

  const cargarDemo = async () => {
    if (!window.confirm('Se cargarán datos de ejemplo (6 meses). Úsalo solo para probar. ¿Continuar?')) return;
    const demo = datosDemo();
    for (const [col, items] of Object.entries(demo)) {
      for (const it of items) await add(col, it); // eslint-disable-line no-await-in-loop
    }
  };

  const agregarCat = () => {
    const nombre = nuevaCat.nombre.trim();
    if (!nombre || [...CATEGORIAS_BASE, ...config.categoriasPersonalizadas].some((c) => c.nombre.toLowerCase() === nombre.toLowerCase())) return;
    guardar({ categoriasPersonalizadas: [...config.categoriasPersonalizadas, { nombre, emoji: nuevaCat.emoji || '🏷️' }] });
    setNuevaCat({ nombre: '', emoji: '🏷️' });
  };

  return (
    <div className="page">
      <div className="page-head"><h2>Ajustes</h2></div>

      <Card title="👤 ¿Quién usa este dispositivo?">
        <p className="muted small">Se usa para rellenar automáticamente “¿quién pagó?”. Se guarda solo en este celular/computador.</p>
        <Segmented options={PERSONAS} value={yo} onChange={setYo} />
      </Card>

      <Card title="⚙️ Preferencias del hogar">
        <div className="grid-2">
          <Field label="Moneda">
            <select value={config.moneda} onChange={(e) => guardar({ moneda: e.target.value })}>
              {MONEDAS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Meta de ahorro (% del ingreso)">
            <input type="number" min="0" max="90" value={config.metaAhorroPct} onChange={(e) => guardar({ metaAhorroPct: Number(e.target.value) })} />
          </Field>
        </div>
        <Field label="¿Cómo reparten los gastos?" hint="Proporcional: cada uno aporta según lo que gana. 50/50: mitad y mitad.">
          <Segmented options={[{ value: 'proporcional', label: 'Proporcional al ingreso' }, { value: 'mitad', label: '50 / 50' }]}
            value={config.reparto} onChange={(v) => guardar({ reparto: v })} />
        </Field>
      </Card>

      <Card title="🏷️ Categorías personalizadas">
        <div className="chips">
          {config.categoriasPersonalizadas.map((c) => (
            <span key={c.nombre} className="chip">
              {c.emoji} {c.nombre}
              <button onClick={() => guardar({ categoriasPersonalizadas: config.categoriasPersonalizadas.filter((x) => x.nombre !== c.nombre) })} aria-label="Quitar">✕</button>
            </span>
          ))}
          {!config.categoriasPersonalizadas.length && <span className="muted small">Aún no hay categorías propias.</span>}
        </div>
        <div className="row gap">
          <input style={{ width: 60 }} value={nuevaCat.emoji} onChange={(e) => setNuevaCat({ ...nuevaCat, emoji: e.target.value })} aria-label="Emoji" />
          <input className="grow" placeholder="Nombre (ej: Bebé, Moto…)" value={nuevaCat.nombre} onChange={(e) => setNuevaCat({ ...nuevaCat, nombre: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && agregarCat()} />
          <button className="btn primary" onClick={agregarCat}>Agregar</button>
        </div>
      </Card>

      <Card title="💾 Datos">
        <p className="small">
          Base de datos: {firebaseConfigured
            ? <b className="txt-ok">Firestore conectado ✅ (los cambios se sincronizan entre los dos en tiempo real)</b>
            : <b className="txt-warn">Modo local ⚠️ — los datos solo viven en este navegador. Configura Firebase (ver README).</b>}
        </p>
        <div className="row gap wrap">
          <button className="btn ghost" onClick={exportar}>⬇ Descargar respaldo (JSON)</button>
          <button className="btn ghost" onClick={() => fileRef.current.click()}>⬆ Importar respaldo</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => importar(e.target.files[0])} />
          {vacio && <button className="btn ghost" onClick={cargarDemo}>🧪 Cargar datos de ejemplo</button>}
        </div>
      </Card>
    </div>
  );
}
