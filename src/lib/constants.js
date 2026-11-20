export const PERSONAS = ['Stephania', 'Santiago'];
export const JUNTOS = 'Juntos';
export const INICIO_APP = '2026-12'; // empiezan en diciembre; antes es modo prueba

export const COLOR_PERSONA = { Stephania: '#ec4899', Santiago: '#3b82f6', Ambos: '#8b5cf6', Juntos: '#8b5cf6', Compartido: '#8b5cf6' };
export const EMOJI_PERSONA = { Stephania: '👩🏻', Santiago: '👨🏻', Ambos: '💑', Juntos: '💑', Compartido: '💑' };

/**
 * tipo: clasificación por defecto (necesidad | gusto).
 * claves: palabras que, si aparecen en el concepto, asignan esta categoría.
 */
export const CATEGORIAS = [
  { nombre: 'Mercado', emoji: '🛒', color: '#10b981', tipo: 'necesidad',
    claves: ['mercado', 'd1', 'ara', 'exito', 'carulla', 'jumbo', 'olimpica', 'makro', 'pricesmart', 'supermercado', 'tienda', 'fruver', 'verduras', 'carne', 'huevos', 'pan', 'panaderia', 'leche', 'isimo', 'justo y bueno', 'metro', 'colsubsidio', 'surtimax', 'dollarcity'] },
  { nombre: 'Vivienda', emoji: '🏠', color: '#6366f1', tipo: 'necesidad',
    claves: ['arriendo', 'renta', 'administracion', 'hipoteca', 'predial'] },
  { nombre: 'Servicios', emoji: '💡', color: '#f59e0b', tipo: 'necesidad',
    claves: ['luz', 'agua', 'gas', 'energia', 'internet', 'claro', 'movistar', 'tigo', 'wom', 'etb', 'celular', 'plan', 'epm', 'enel', 'vanti', 'acueducto', 'recarga'] },
  { nombre: 'Transporte', emoji: '🚗', color: '#0ea5e9', tipo: 'necesidad',
    claves: ['uber', 'didi', 'taxi', 'cabify', 'indriver', 'picap', 'gasolina', 'tanqueo', 'peaje', 'parqueadero', 'transmilenio', 'sitp', 'bus', 'mio', 'metro de', 'soat', 'tecnomecanica', 'lavado carro', 'taller', 'moto'] },
  { nombre: 'Salud', emoji: '💊', color: '#14b8a6', tipo: 'necesidad',
    claves: ['farmacia', 'drogueria', 'medic', 'eps', 'cita', 'odont', 'examen', 'laboratorio', 'cruz verde', 'pastillas', 'vitamina', 'optica', 'psicolog', 'prepagada'] },
  { nombre: 'Deudas', emoji: '💳', color: '#dc2626', tipo: 'necesidad',
    claves: ['tarjeta', 'credito', 'cuota', 'prestamo', 'deuda', 'icetex', 'banco'] },
  { nombre: 'Educación', emoji: '📚', color: '#3b82f6', tipo: 'necesidad',
    claves: ['curso', 'universidad', 'matricula', 'colegio', 'libro', 'platzi', 'udemy', 'clase', 'ingles', 'semestre'] },
  { nombre: 'Mascotas', emoji: '🐾', color: '#84cc16', tipo: 'necesidad',
    claves: ['veterinari', 'concentrado', 'mascota', 'perro', 'gato', 'arena gato', 'purina', 'chunky'] },
  { nombre: 'Hogar', emoji: '🧽', color: '#a16207', tipo: 'necesidad',
    claves: ['aseo', 'detergente', 'limpieza', 'homecenter', 'ferreteria', 'easy', 'empleada', 'lavanderia'] },
  { nombre: 'Restaurantes', emoji: '🍔', color: '#ef4444', tipo: 'gusto',
    claves: ['restaurante', 'almuerzo', 'cena', 'desayuno', 'hamburguesa', 'pizza', 'sushi', 'cafe', 'starbucks', 'juan valdez', 'tostao', 'oma', 'crepes', 'frisby', 'kfc', 'mcdonald', 'el corral', 'helado', 'postre', 'comida', 'brunch', 'empanada', 'perro caliente', 'mecato', 'snack', 'onces'] },
  { nombre: 'Domicilios', emoji: '🛵', color: '#f97316', tipo: 'gusto',
    claves: ['rappi', 'ifood', 'domicilio', 'didi food', 'pedido'] },
  { nombre: 'Salidas', emoji: '🎉', color: '#a855f7', tipo: 'gusto',
    claves: ['cine', 'concierto', 'boleta', 'bar', 'cerveza', 'trago', 'rumba', 'discoteca', 'fiesta', 'teatro', 'parque', 'bolos', 'tejo', 'karaoke', 'juego', 'steam', 'playstation', 'xbox', 'nintendo'] },
  { nombre: 'Ropa y compras', emoji: '🛍️', color: '#ec4899', tipo: 'gusto',
    claves: ['ropa', 'zara', 'h&m', 'zapatos', 'tenis', 'falabella', 'amazon', 'mercadolibre', 'mercado libre', 'temu', 'shein', 'aliexpress', 'camisa', 'pantalon', 'vestido', 'bolso', 'accesorio', 'decoracion', 'ktronix', 'alkosto', 'celular nuevo', 'audifonos'] },
  { nombre: 'Suscripciones', emoji: '📺', color: '#8b5cf6', tipo: 'gusto',
    claves: ['netflix', 'spotify', 'disney', 'hbo', 'max', 'prime', 'youtube', 'icloud', 'google one', 'chatgpt', 'apple', 'paramount', 'crunchyroll', 'suscripcion', 'gimnasio', 'smartfit', 'bodytech', 'gym'] },
  { nombre: 'Cuidado personal', emoji: '💅', color: '#f472b6', tipo: 'gusto',
    claves: ['peluqueria', 'barberia', 'corte', 'unas', 'manicure', 'spa', 'maquillaje', 'perfume', 'crema', 'skincare', 'masaje'] },
  { nombre: 'Regalos', emoji: '🎁', color: '#d946ef', tipo: 'gusto',
    claves: ['regalo', 'cumpleanos', 'detalle', 'flores', 'navidad', 'aguinaldo'] },
  { nombre: 'Viajes', emoji: '✈️', color: '#06b6d4', tipo: 'gusto',
    claves: ['viaje', 'vuelo', 'tiquete', 'hotel', 'airbnb', 'avianca', 'latam', 'wingo', 'paseo', 'vacaciones'] },
  { nombre: 'Otros', emoji: '📦', color: '#64748b', tipo: 'necesidad', claves: [] },
];

export function infoCategoria(nombre) {
  return CATEGORIAS.find((c) => c.nombre === nombre) || { nombre: nombre || 'Otros', emoji: '🏷️', color: '#64748b', tipo: 'necesidad' };
}

/** Atajos iniciales del gasto rápido (antes de que haya historial). */
export const ATAJOS_BASE = [
  { concepto: 'Mercado', categoria: 'Mercado', tipo: 'necesidad' },
  { concepto: 'Almuerzo', categoria: 'Restaurantes', tipo: 'necesidad' },
  { concepto: 'Domicilio', categoria: 'Domicilios', tipo: 'gusto' },
  { concepto: 'Uber / taxi', categoria: 'Transporte', tipo: 'necesidad' },
  { concepto: 'Café', categoria: 'Restaurantes', tipo: 'gusto' },
  { concepto: 'Farmacia', categoria: 'Salud', tipo: 'necesidad' },
];

export const CONFIG_DEFAULT = { moneda: 'COP' };
