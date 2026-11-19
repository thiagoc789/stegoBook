# 💰 StegoBook — Finanzas de Stephania y Santiago

App web para llevar juntos la contabilidad del hogar: salarios, gastos fijos y variables,
presupuestos, metas de ahorro, sueños y previsiones. Los datos viven en **Firestore**
(sin login) y se sincronizan en tiempo real entre los dos celulares.

## Funcionalidades

| Sección | Qué hace |
|---|---|
| 🏠 **Resumen** | Ingresos, gastos, balance y tasa de ahorro del mes · proyección de cómo cierra el mes y cuánto pueden gastar por día · alertas y consejos automáticos · gastos por categoría · tendencia de 6 meses · regla 50/30/20 · **reparto justo** (quién le debe a quién, proporcional al ingreso o 50/50) |
| 🧾 **Gastos** | Gastos variables del mes con buscador y filtros (categoría, quién pagó, necesidad/gusto), agrupados por día, exportar a CSV. Botón **＋** flotante para registrar un gasto desde cualquier pantalla |
| 📅 **Fijos** | Arriendo, servicios, suscripciones, cuotas… con frecuencia mensual, bimestral, trimestral, semestral o anual · checklist de “pagado” por mes · provisión mensual de pagos anuales |
| 💼 **Ingresos** | Salarios de cada uno con historial (si suben el sueldo, los meses pasados no cambian) e ingresos extra (primas, bonos, freelance) |
| 📊 **Presupuestos** | Tope mensual por categoría, alertas al pasarse o ir más rápido que el mes, sugerencia automática (−10 % del promedio) |
| 🎯 **Metas** | Metas de ahorro con aportes de cada uno, cuota mensual necesaria, fecha estimada al ritmo actual y fondo de emergencia sugerido |
| 🌈 **Sueños** | Aspiraciones (sueños grandes, compras deseadas, experiencias): cuántos meses tardarían en lograrlo, **periodo de enfriamiento de 30 días** para compras impulsivas, convertir en meta, contador de “ahorrado por no comprar” |
| 🔮 **Previsiones** | Proyección a 6–36 meses, simulador “¿y si…?” (recortar gastos, por categoría, aumento de salario, ingreso extra), “¿cuándo llegamos a X?”, pagos grandes que vienen |
| ⚙️ **Ajustes** | Quién usa el dispositivo, moneda, meta de ahorro %, modo de reparto, categorías propias, respaldo/importación JSON, datos de ejemplo |

## Configurar Firebase (una sola vez)

1. Entra a <https://console.firebase.google.com> y crea un proyecto.
2. **Build → Firestore Database → Crear base de datos** (modo producción, región cercana, p. ej. `southamerica-east1`).
3. **Configuración del proyecto → Tus apps → Web (`</>`)** y registra la app. Copia los valores de `firebaseConfig`.
4. En esta carpeta:
   ```bash
   cp .env.example .env
   ```
   y pega los valores en `.env`.
5. Publica las reglas de seguridad (están en `firestore.rules`): pégalas en **Firestore → Reglas**, o con la CLI:
   ```bash
   npx firebase-tools deploy --only firestore:rules
   ```

> ⚠️ Como no hay autenticación, cualquiera que tenga la URL de la app y la configuración podría leer o escribir los datos.
> Las reglas limitan el acceso a `hogares/stephania-santiago/**`. No compartan el link públicamente.

Sin `.env` la app funciona en **modo local** (localStorage) para probarla.

## Ejecutar

```bash
npm install
```

```bash
npm run dev
```

## Publicar (Firebase Hosting)

```bash
npm run build
```

```bash
npx firebase-tools deploy --only hosting --project TU_ID_DE_PROYECTO
```

Después, en el celular abran la URL y usen “Agregar a pantalla de inicio” para tenerla como app.

## Estructura de datos

```
hogares/stephania-santiago/
  salarios/      { persona, concepto, monto, desde, hasta }
  ingresos/      { persona, concepto, monto, fecha }
  gastos/        { concepto, monto, categoria, pagadoPor, fecha, tipo: necesidad|deseo, nota }
  gastosFijos/   { concepto, monto, categoria, pagadoPor, dia, frecuencia, desde, hasta, pagados: { 'YYYY-MM': true } }
  presupuestos/  { categoria, limite }
  metas/         { nombre, emoji, objetivo, fechaLimite, tipo, aportes: [{ monto, persona, fecha }] }
  aspiraciones/  { nombre, tipo, costo, prioridad, estado, quien, nota, link, fecha }
  config/general { moneda, metaAhorroPct, reparto, categoriasPersonalizadas }
```

## Despliegue automático (CI/CD)

Cada push a `main` ejecuta `.github/workflows/deploy.yml`: compila la app y la despliega en el
sitio de Hosting **`stegobook`** (https://stegobook.web.app) del proyecto `stego-cd22b`, sin tocar
el sitio principal de la otra app. Los pull requests solo compilan.

Las reglas de Firestore **no** se despliegan automáticamente: pega `firestore.rules` en
Firebase → Firestore → Reglas cuando cambien.

Requisito (una vez): en GitHub → *Settings → Secrets and variables → Actions* crear el secreto
`FIREBASE_SERVICE_ACCOUNT` con el JSON de la cuenta de servicio
(Firebase → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada).

> `firestore.rules` contiene también las reglas de la otra app del proyecto (`users`, `couples`…).
> Mantengan este archivo igual a lo publicado en la consola.
