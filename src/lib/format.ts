// Formateo de números y textos para mostrar en pantalla.

const berriesFmt = new Intl.NumberFormat('es-PE');

/** 1250000000 -> "1.250.000.000 ฿" (berries) */
export const berries = (n: number) => `${berriesFmt.format(n)} ฿`;

export const number = (n: number) => berriesFmt.format(n);

export const date = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

// Etiquetas en español para los enums del contrato
export const LABELS: Record<string, string> = {
  AT_LARGE: 'Prófugo', CAPTURED: 'Capturado', MISSING: 'Desaparecido',
  PARAMECIA: 'Paramecia', ZOAN: 'Zoan', LOGIA: 'Logia', NONE: 'Sin fruta',
  'bounty,desc': 'Mayor recompensa', 'name,asc': 'Nombre (A-Z)', 'updatedAt,desc': 'Actualizados recientemente',
  BOUNTY_UPDATE: 'Recompensa', BATTLE: 'Batalla', MARINE_OPERATION: 'Operación de la Marina',
  WORLD_GOVERNMENT: 'Gobierno Mundial', DISCOVERY: 'Descubrimiento',
  LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', CRITICAL: 'Crítica',
  RUMOR: 'Rumor', CONFIRMED: 'Confirmada', DEBUNKED: 'Desmentida',
  CAPTAIN: 'Capitán', FIRST_MATE: 'Segundo al mando', NAVIGATOR: 'Navegante', SNIPER: 'Francotirador',
  COOK: 'Cocinero', DOCTOR: 'Médico', SHIPWRIGHT: 'Carpintero', MUSICIAN: 'Músico',
  ARCHAEOLOGIST: 'Arqueólogo', HELMSMAN: 'Timonel', FIGHTER: 'Combatiente',
};

export const label = (value: string) => LABELS[value] ?? value;
