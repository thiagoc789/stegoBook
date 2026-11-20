import { useEffect, useState } from 'react';
import { useApp } from './lib/context';
import { firebaseConfigured } from './lib/firebase';
import { EMOJI_PERSONA, infoCategoria, INICIO_APP, JUNTOS, PERSONAS } from './lib/constants';
import { currentMonth } from './lib/format';
import { MonthPicker } from './components/ui';
import QuickAdd from './components/QuickAdd';
import Inicio from './pages/Inicio';
import Movimientos from './pages/Movimientos';
import Metas from './pages/Metas';
import MiPlata from './pages/MiPlata';
import Deudas from './pages/Deudas';
import { topeGustos } from './lib/topes';

const PAGES = [
  { id: 'inicio', label: 'Inicio', icon: '🏠', C: Inicio },
  { id: 'movimientos', label: 'Gastos', icon: '🧾', C: Movimientos },
  { id: 'metas', label: 'Metas', icon: '🎯', C: Metas },
  { id: 'deudas', label: 'Deudas', icon: '💳', C: Deudas },
  { id: 'miplata', label: 'Mi plata', icon: '💼', C: MiPlata },
];
const pageFromHash = () => PAGES.find((p) => `#${p.id}` === window.location.hash)?.id || 'inicio';
const abrirRapido = new URLSearchParams(window.location.search).has('rapido');

export default function App() {
  const { loading, error, vista, setVista, fmt, data, config } = useApp();
  const [page, setPage] = useState(pageFromHash);
  const [quick, setQuick] = useState(abrirRapido);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    if (abrirRapido) window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const go = (id) => { window.location.hash = id; setPage(id); window.scrollTo(0, 0); };
  const Current = PAGES.find((p) => p.id === page).C;
  const enPrueba = currentMonth() < INICIO_APP;

  return (
    <div className="app">
      <header className="top">
        <div className="top-row">
          <div className="brand"><span className="logo">💰</span><b>StegoBook</b></div>
          <MonthPicker />
        </div>
        <div className="vista">
          {[...PERSONAS, JUNTOS].map((p) => (
            <button key={p} className={vista === p ? `active v-${p}` : ''} onClick={() => setVista(p)}>{EMOJI_PERSONA[p]} {p}</button>
          ))}
        </div>
      </header>

      <main>
        {enPrueba && <div className="banner">🚧 En construcción: empiezan el <b>1 de diciembre</b>. Lo que registren antes es de prueba.</div>}
        {!firebaseConfigured && <div className="banner">⚠️ Modo local: los datos solo quedan en este navegador.</div>}
        {error && <div className="banner danger">No se pudo conectar con la base de datos: {error.message}</div>}
        {loading ? <div className="loading">Cargando…</div> : <Current go={go} />}
      </main>

      <nav className="bottom-nav">
        {PAGES.map((p) => (
          <button key={p.id} className={page === p.id ? 'active' : ''} onClick={() => go(p.id)}><span>{p.icon}</span><small>{p.label}</small></button>
        ))}
      </nav>
      <button className="fab" onClick={() => setQuick(true)} aria-label="Agregar gasto">＋</button>

      {quick && !loading && (
        <QuickAdd
          onClose={() => setQuick(false)}
          onSaved={(g, editando) => {
            let msg = `✓ ${fmt(g.monto)} · ${infoCategoria(g.categoria).emoji} ${g.categoria} (${g.tipo})`;
            const t = topeGustos(data, g.persona, config);
            if (g.tipo === 'gusto' && !editando && g.fecha >= t.semana.inicio && g.fecha <= t.semana.fin && t.semanal > 0) {
              const queda = t.quedaSemana - g.monto;
              msg += queda >= 0 ? ` · te quedan ${fmt(queda)} de gustos esta semana` : ` · ⚠️ te pasaste ${fmt(-queda)} del tope semanal`;
            }
            setToast(msg);
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
