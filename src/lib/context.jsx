import { createContext, useContext, useMemo, useState } from 'react';
import { useCollection } from './store';
import { CONFIG_DEFAULT, PERSONAS } from './constants';
import { currentMonth, money } from './format';

const Ctx = createContext(null);

export function DataProvider({ children }) {
  const salarios = useCollection('salarios');
  const ingresos = useCollection('ingresos');
  const gastos = useCollection('gastos');
  const gastosFijos = useCollection('gastosFijos');
  const presupuestos = useCollection('presupuestos');
  const metas = useCollection('metas');
  const aspiraciones = useCollection('aspiraciones');
  const configCol = useCollection('config');

  const [mes, setMes] = useState(currentMonth());
  const [yo, setYoState] = useState(() => {
    try { return localStorage.getItem('stegobook:yo') || PERSONAS[0]; } catch { return PERSONAS[0]; }
  });
  const setYo = (p) => { setYoState(p); try { localStorage.setItem('stegobook:yo', p); } catch { /* */ } };

  const all = [salarios, ingresos, gastos, gastosFijos, presupuestos, metas, aspiraciones, configCol];
  const loading = all.some((c) => c.loading);
  const error = all.find((c) => c.error)?.error || null;

  const value = useMemo(() => {
    const config = { ...CONFIG_DEFAULT, ...(configCol.items.find((c) => c.id === 'general') || {}) };
    return {
      data: {
        salarios: salarios.items,
        ingresos: ingresos.items,
        gastos: gastos.items,
        gastosFijos: gastosFijos.items,
        presupuestos: presupuestos.items,
        metas: metas.items,
        aspiraciones: aspiraciones.items,
      },
      config,
      fmt: (n, compact) => money(n, config.moneda, compact),
      mes, setMes, yo, setYo, loading, error,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salarios.items, ingresos.items, gastos.items, gastosFijos.items, presupuestos.items,
    metas.items, aspiraciones.items, configCol.items, mes, yo, loading, error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);
