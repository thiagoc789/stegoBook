# 💰 StegoBook — Finanzas de Stephania y Santiago

App web para llevar juntos la contabilidad del hogar: salarios, gastos fijos y variables,
presupuestos, metas de ahorro, sueños y previsiones. Los datos viven en **Firestore**
(sin login) y se sincronizan en tiempo real entre los dos celulares.

## Cómo funciona

Arriba eligen **Stephania**, **Santiago** o **Juntos**. Cada uno lleva sus propios ingresos, gastos y metas;
“Juntos” suma los dos y los compara lado a lado.

| Pestaña | Qué hace |
|---|---|
| 🏠 **Inicio** | **Tope semanal de gustos** de cada uno (promedio de gustos − % de recorte, limitado a lo que alcanza tras fijos, deudas, necesidades y metas) · cuánto queda del mes y cuánto se puede gastar por día · **qué recortar** para cumplir las metas · necesidades vs. gustos · en qué se va la plata |
| 🧾 **Gastos** | Los gastos del mes, filtrables por necesidad/gusto y categoría. Toca uno para editarlo |
| ＋ | **Gasto rápido**: monto → concepto (o un atajo) → guardar. La categoría y si es necesidad o gusto se ponen solos (palabras clave como “Rappi”, “D1”, “Uber” y lo que hayan registrado antes) |
| 🎯 **Metas** | Metas de cada uno o de los dos, cuánto apartar al mes y si les alcanza. Pueden repetirse cada semestre o año (ej. 🎓 Universidad) |
| 🏠 **Vivir juntos** (desde Metas) | Lista de lo indispensable para la casa con precios editables (falta / comprado / ya lo tenemos), arriendo adelantado, colchón de un mes, costo mensual juntos vs. hoy, aporte de cada uno y fecha estimada (también sumando lo que liberan las deudas). Sincroniza la meta “Irnos a vivir juntos” |
| 💳 **Deudas** | Tarjetas, créditos y préstamos: saldo estimado mes a mes, fecha en que terminan, intereses, plan avalancha + bola de nieve con simulador de abonos extra. Las cuotas se suman solas a los gastos fijos |
| 💼 **Mi plata** | Salario, ingresos extra, gastos fijos, acceso rápido y ajustes |

### Acceso rápido (tipo widget)
- **Android**: Chrome → ⋮ → *Instalar app*. Mantener presionado el ícono → *Gasto rápido* → arrastrar a la pantalla.
- **iPhone**: app *Atajos* → nuevo atajo → *Abrir URL* `https://stegobook.web.app/?rapido=1&quien=Stephania` (o `Santiago`) → *Agregar a pantalla de inicio* o al widget de Atajos.

### Arranque
Hasta el 1 de diciembre de 2026 es modo prueba. Ese día: *Mi plata → Borrar datos de prueba*
(borra gastos, ingresos extra y aportes; conserva salarios, fijos y metas).

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

## Pruebas locales sin tocar los datos reales

```bash
VITE_LOCAL=1 npm run dev
```

## Estructura de datos

```
hogares/stephania-santiago/
  salarios/      { persona, concepto, monto, desde, hasta }
  ingresos/      { persona, concepto, monto, fecha }
  gastos/        { persona, concepto, monto, categoria, tipo: necesidad|gusto, fecha }
  gastosFijos/   { persona, concepto, monto, categoria, tipo, desde, hasta }
  metas/         { nombre, emoji, objetivo, fechaLimite, dueno: Stephania|Santiago|Ambos, repetir: ''|semestral|anual, aportes: [...], ciclos: [...] }
  deudas/        { persona, tipo, nombre, saldo, saldoOriginal, cuota, tasaEA, desde, fechaSaldo, saldoActualizado, abonos: [{ monto, fecha, creado }] }
  casaItems/     { nombre, categoria, costo, prioridad: indispensable|despues, estado: pendiente|comprado|tengo }
  config/casa    { arriendo, administracion, servicios, internet, mercado, mesesAdelanto, colchon, ahorroMensual, reparto, metaId }
  config/general { moneda, topes: { Stephania: { recorte }, Santiago: { recorte } } }
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
