import { useEffect, useState } from 'react';
import { useApp } from './lib/context';
import { firebaseConfigured } from './lib/firebase';
import { PERSONAS, EMOJI_PERSONA } from './lib/constants';
import GastoForm from './components/GastoForm';
import Resumen from './pages/Resumen';
import Gastos from './pages/Gastos';
import Fijos from './pages/Fijos';
import Ingresos from './pages/Ingresos';
import Presupuestos from './pages/Presupuestos';
import Metas from './pages/Metas';
import Aspiraciones from './pages/Aspiraciones';
import Previsiones from './pages/Previsiones';
import Ajustes from './pages/Ajustes';

const PAGES = [
  { id: 'resumen', label: 'Resumen', icon: '🏠', C: Resumen },
  { id: 'gastos', label: 'Gastos', icon: '🧾', C: Gastos },
  { id: 'fijos', label: 'Fijos', icon: '📅', C: Fijos },
  { id: 'ingresos', label: 'Ingresos', icon: '💼', C: Ingresos },
  { id: 'presupuestos', label: 'Presupuestos', icon: '📊', C: Presupuestos },
  { id: 'metas', label: 'Metas', icon: '🎯', C: Metas },
  { id: 'suenos', label: 'Sueños', icon: '🌈', C: Aspiraciones },
  { id: 'previsiones', label: 'Previsiones', icon: '🔮', C: Previsiones },
  { id: 'ajustes', label: 'Ajustes', icon: '⚙️', C: Ajustes },
];

const MOBILE_MAIN = ['resumen', 'gastos', 'metas', 'previsiones'];

const pageFromHash = () => PAGES.find((p) => `#${p.id}` === window.location.hash)?.id || 'resumen';

export default function App() {
  const { loading, error, yo, setYo } = useApp();
  const [page, setPage] = useState(pageFromHash);
  const [quick, setQuick] = useState(false);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (id) => { window.location.hash = id; setPage(id); window.scrollTo(0, 0); };
  const Current = PAGES.find((p) => p.id === page).C;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo">💰</span>
          <div><b>StegoBook</b><small>Stephania & Santiago</small></div>
        </div>
        <nav>
          {PAGES.map((p) => (
            <button key={p.id} className={page === p.id ? 'active' : ''} onClick={() => go(p.id)}>
              <span>{p.icon}</span> {p.label}
            </button>
          ))}
        </nav>
        <div className="whoami">
          <small>Soy</small>
          <div className="who-btns">
            {PERSONAS.map((p) => (
              <button key={p} className={yo === p ? 'active' : ''} onClick={() => setYo(p)}>{EMOJI_PERSONA[p]} {p}</button>
            ))}
          </div>
        </div>
      </aside>

      <main>
        {!firebaseConfigured && (
          <div className="banner">⚠️ Modo local: los datos se guardan solo en este navegador. Configura Firebase para compartirlos entre los dos (ver README).</div>
        )}
        {error && <div className="banner danger">No se pudo conectar con Firestore: {error.message}. Revisen las reglas de seguridad.</div>}
        {loading ? <div className="loading">Cargando…</div> : <Current go={go} />}
      </main>

      <nav className="bottom-nav">
        {PAGES.filter((p) => MOBILE_MAIN.includes(p.id)).map((p) => (
          <button key={p.id} className={page === p.id ? 'active' : ''} onClick={() => { setMore(false); go(p.id); }}>
            <span>{p.icon}</span><small>{p.label}</small>
          </button>
        ))}
        <button className={more || !MOBILE_MAIN.includes(page) ? 'active' : ''} onClick={() => setMore(!more)}>
          <span>☰</span><small>Más</small>
        </button>
      </nav>
      {more && (
        <div className="more-sheet" onClick={() => setMore(false)}>
          <div className="more-grid" onClick={(e) => e.stopPropagation()}>
            {PAGES.filter((p) => !MOBILE_MAIN.includes(p.id)).map((p) => (
              <button key={p.id} className={page === p.id ? 'active' : ''} onClick={() => { setMore(false); go(p.id); }}>
                <span>{p.icon}</span>{p.label}
              </button>
            ))}
            <div className="more-who">
              {PERSONAS.map((p) => (
                <button key={p} className={yo === p ? 'active' : ''} onClick={() => setYo(p)}>Soy {EMOJI_PERSONA[p]} {p}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <button className="fab" onClick={() => setQuick(true)} aria-label="Agregar gasto">＋</button>
      {quick && <GastoForm onClose={() => setQuick(false)} />}
    </div>
  );
}
