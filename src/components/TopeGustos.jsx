import { useState } from 'react';
import { useApp } from '../lib/context';
import { set } from '../lib/store';
import { topeGustos } from '../lib/topes';
import { dateLabel } from '../lib/format';
import { COLOR_PERSONA } from '../lib/constants';
import { Card, Modal, PersonaTag, Progress } from './ui';

function Detalle({ t, onClose }) {
  const { fmt, config } = useApp();
  const [recorte, setRecorte] = useState(t.recorte);
  const guardar = (v) => {
    setRecorte(v);
    set('config', 'general', { topes: { ...(config.topes || {}), [t.persona]: { recorte: v } } });
  };
  return (
    <Modal title={`¿Cómo se calcula el tope de ${t.persona}?`} onClose={onClose}>
      <div className="form">
        <ol className="calc">
          {t.base != null
            ? <li>Según {t.fuente}, gastas <b>{fmt(t.base)}</b> al mes en gustos.</li>
            : <li>Aún no hay historial: se arranca con el 15% del ingreso (<b>{fmt(t.ingresos * 0.15)}</b>). Se ajusta solo cuando haya datos.</li>}
          {t.base != null && <li>Recortándolo un <b>{t.recorte}%</b> → <b>{fmt(t.base * (1 - t.recorte / 100))}</b> al mes.</li>}
          <li>
            Lo que te alcanza: ingreso {fmt(t.ingresos)} − fijos y deudas {fmt(t.fijos)} − necesidades {fmt(t.necesidades)} − metas {fmt(t.metas)} = <b className={t.capacidad < 0 ? 'txt-danger' : ''}>{fmt(t.capacidad)}</b>.
            {t.limitadoPorCapacidad && <> Como es menos, el tope queda en eso.</>}
          </li>
          <li>Tope del mes <b>{fmt(t.mensual)}</b> → por semana <b>{fmt(t.semanal)}</b>.</li>
        </ol>
        {t.base != null && (
          <label className="slider">
            <span className="row-between"><span>¿Cuánto quieres recortar de tus gustos?</span><b>{recorte}%</b></span>
            <input type="range" min="0" max="80" step="5" value={recorte} onChange={(e) => guardar(Number(e.target.value))} />
          </label>
        )}
        <p className="small muted">Solo cuentan los gastos del día a día marcados como ✨ gusto. Los fijos (como Netflix) ya están descontados arriba. La semana va de lunes a domingo.</p>
        <button className="btn primary block" onClick={onClose}>Listo</button>
      </div>
    </Modal>
  );
}

function Barra({ t, compacta }) {
  const { fmt } = useApp();
  const [ver, setVer] = useState(false);
  const pasado = t.quedaSemana < 0;
  return (
    <div className="tope">
      <div className="row-between">
        {compacta ? <PersonaTag p={t.persona} /> : <span className="muted small">Gustos esta semana · {dateLabel(t.semana.inicio)} – {dateLabel(t.semana.fin)}</span>}
        <button className="link" onClick={() => setVer(true)}>¿Cómo?</button>
      </div>
      <strong className={`tope-num ${pasado ? 'txt-danger' : t.ratio >= 0.8 ? 'txt-warn' : ''}`}>
        {pasado ? `Te pasaste ${fmt(-t.quedaSemana)}` : `Te quedan ${fmt(t.quedaSemana)}`}
      </strong>
      <Progress value={t.ratio} color={t.ratio >= 1 ? 'var(--danger)' : t.ratio >= 0.8 ? 'var(--warn)' : COLOR_PERSONA[t.persona]} />
      <small className="muted">{fmt(t.gastadoSemana)} de {fmt(t.semanal)} · tope del mes {fmt(t.mensual)}</small>
      {ver && <Detalle t={t} onClose={() => setVer(false)} />}
    </div>
  );
}

export default function TopeGustos() {
  const { data, persona, config } = useApp();
  const personas = persona ? [persona] : ['Stephania', 'Santiago'];
  const topes = personas.map((p) => topeGustos(data, p, config));
  if (topes.every((t) => t.ingresos === 0)) return null;
  return (
    <Card className="tope-card" title={persona ? null : '✨ Topes de gustos esta semana'}>
      {topes.map((t) => <Barra key={t.persona} t={t} compacta={!persona} />)}
    </Card>
  );
}
