import { createContext, useContext, useMemo, useState } from 'react';
import { useCollection } from './store';
import { CONFIG_DEFAULT, JUNTOS, PERSONAS } from './constants';
import { currentMonth, money } from './format';

const Ctx = createContext(null);
const ls = {
  get: (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
};
const params = new URLSearchParams(window.location.search);
const quienURL = PERSONAS.includes(params.get('quien')) ? params.get('quien') : null;

export function DataProvider({ children }) {
  const salarios = useCollection('salarios');
  const ingresos = useCollection('ingresos');
  const gastos = useCollection('gastos');
  const gastosFijos = useCollection('gastosFijos');
  const metas = useCollection('metas');
  const deudas = useCollection('deudas');
  const casaItems = useCollection('casaItems');
  const configCol = useCollection('config');

  const [mes, setMes] = useState(currentMonth());
  const [yo, setYoState] = useState(() => {
    if (quienURL) { ls.set('stegobook:yo', quienURL); return quienURL; }
    const v = ls.get('stegobook:yo', PERSONAS[0]);
    return PERSONAS.includes(v) ? v : PERSONAS[0];
  });
  // vista: 'Stephania' | 'Santiago' | 'Juntos'. Arranca siempre en la persona del dispositivo.
  const [vista, setVista] = useState(yo);
  const setYo = (p) => { setYoState(p); ls.set('stegobook:yo', p); setVista(p); };

  const all = [salarios, ingresos, gastos, gastosFijos, metas, deudas, casaItems, configCol];
  const loading = all.some((c) => c.loading);
  const error = all.find((c) => c.error)?.error || null;

  const value = useMemo(() => {
    const config = { ...CONFIG_DEFAULT, ...(configCol.items.find((c) => c.id === 'general') || {}) };
    return {
      data: {
        salarios: salarios.items, ingresos: ingresos.items, gastos: gastos.items,
        gastosFijos: gastosFijos.items, metas: metas.items, deudas: deudas.items, casaItems: casaItems.items,
      },
      config,
      casa: configCol.items.find((c) => c.id === 'casa') || null,
      fmt: (n, compact) => money(n, config.moneda, compact),
      mes, setMes, yo, setYo, vista, setVista,
      persona: vista === JUNTOS ? null : vista, // null = los dos
      loading, error,
    };
  }, [salarios.items, ingresos.items, gastos.items, gastosFijos.items, metas.items, deudas.items, casaItems.items, configCol.items, mes, yo, vista, loading, error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);
