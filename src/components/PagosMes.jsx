import { useState } from 'react';
import { useApp } from '../lib/context';
import { update } from '../lib/store';
import { infoCategoria } from '../lib/constants';
import { personaDe, resumen } from '../lib/finance';
import { currentMonth, monthLabel } from '../lib/format';
import { Card, PersonaTag, Progress } from './ui';

/** Marca un pago fijo o una cuota de deuda como pagada en el mes. */
export function togglePago(item, mes) {
  const pagados = { ...(item.pagados || {}), [mes]: !item.pagados?.[mes] };
  if (item.deudaId) return update('deudas', item.deudaId, { pagados });
  return update('gastosFijos', item.id, { pagados });
}

export default function PagosMes({ go }) {
  const { data, mes, persona, fmt } = useApp();
  const [verTodo, setVerTodo] = useState(false);
  const items = resumen(data, mes, persona).fijos
    .filter((f) => !f.esAbono)
    .sort((a, b) => (!!a.pagados?.[mes]) - (!!b.pagados?.[mes]) || (Number(a.dia) || 99) - (Number(b.dia) || 99));
  if (!items.length) return null;

  const total = items.reduce((a, f) => a + Number(f.monto), 0);
  const pagado = items.filter((f) => f.pagados?.[mes]).reduce((a, f) => a + Number(f.monto), 0);
  const esActual = mes === currentMonth();
  const hoy = new Date().getDate();
  const pendientes = items.filter((f) => !f.pagados?.[mes]);
  const visibles = verTodo ? items : pendientes;

  return (
    <Card title={`✅ Pagos de ${monthLabel(mes).split(' ')[0]}`} action={<span className="small muted">{items.length - pendientes.length}/{items.length} pagados</span>}>
      <Progress value={total ? pagado / total : 0} color="var(--ok)" />
      {pendientes.length === 0 && <p className="small txt-ok">🎉 ¡Todo pagado este mes!</p>}
      <ul className="list compact pagos">
        {visibles.map((f) => {
          const ok = !!f.pagados?.[mes];
          const vencido = esActual && !ok && f.dia && Number(f.dia) < hoy;
          const c = infoCategoria(f.categoria);
          return (
            <li key={f.id} className={ok ? 'done' : ''} onClick={() => togglePago(f, mes)}>
              <span className={`check-pago ${ok ? 'on' : ''}`} role="checkbox" aria-checked={ok}>{ok ? '✓' : ''}</span>
              <div className="grow">
                <b>{c.emoji} {f.concepto}{f.prueba && ' 🧪'}</b>
                <small className={vencido ? 'txt-danger' : ''}>
                  {f.dia ? (vencido ? `⚠️ vencía el día ${f.dia}` : `día ${f.dia}`) : f.categoria}
                  {!persona && <> · <PersonaTag p={personaDe(f)} /></>}
                </small>
              </div>
              <strong>{fmt(f.monto)}</strong>
            </li>
          );
        })}
      </ul>
      <div className="row-between">
        {items.length > pendientes.length
          ? <button className="link" onClick={() => setVerTodo(!verTodo)}>{verTodo ? 'Ocultar pagados' : `Ver pagados (${items.length - pendientes.length})`}</button>
          : <span />}
        <span className="small">Pagado <b>{fmt(pagado)}</b> · falta <b>{fmt(total - pagado)}</b></span>
      </div>
      {go && <p className="small muted">Los fijos se agregan en Mi plata y las cuotas en Deudas.</p>}
    </Card>
  );
}
