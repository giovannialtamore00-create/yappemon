// Phrase lists the parser matches against. Official EN/IT names come from sim data;
// these add short forms, distinctive keywords and likely speech-recognizer mishearings.
// Both languages are always accepted, whatever recognition language is selected.

import type { MoveId, SpeciesId } from '../sim/types';

export const MOVE_ALIASES: Record<MoveId, string[]> = {
  // Cindrix
  shell_ram: ['shell ram', 'shellram', 'shell rum', 'shell run', 'shell lamb', 'shell rap', 'cell ram', 'shel ram', 'ram',
    'corazzata', 'carica corazzata', 'carica corazza', 'corazza'],
  cinder_spit: ['cinder spit', 'cinder', 'spit', 'cinders spit', 'cinder split', 'sinner spit', 'cinder speed', 'center spit', 'cinder bit',
    'sputo di brace', 'sputo', 'brace', 'sputo brace', 'sputa brace', 'sputo di brache', 'sputo di bracie'],
  heat_shell: ['heat shell', 'heat', 'heatshell', 'heats hell', 'hit shell', 'hot shell', 'heat sell', 'he shell', 'shield',
    'guscio rovente', 'guscio', 'rovente', 'guscio ruvente', 'gruscio rovente'],
  magma_burst: ['magma burst', 'magma', 'magma bust', 'magna burst', 'magma first', 'magma burns', 'burst', 'eruption',
    'esplosione di magma', 'esplosione', 'esplosione magma', 'magma esplosione'],
  // Brinkle
  bubble_bump: ['bubble bump', 'bubble', 'bubble pump', 'double bump', 'bubble bomb', 'bump',
    'spinta di bolla', 'spinta', 'bolla', 'spinta bolla', 'spinta di bola'],
  water_jet: ['water jet', 'jet', 'water get', 'water jets', 'water chat', 'water jab', 'water',
    "getto d'acqua", 'getto', 'getto acqua', 'gettodacqua', 'getto di acqua', 'getta acqua', 'acqua'],
  healing_rain: ['healing rain', 'healing', 'heal', 'rain', 'healing train', 'feeling rain', 'healing reign', 'heal rain',
    'pioggia curativa', 'pioggia', 'curativa', 'cura', 'pioggia cura'],
  tidal_crash: ['tidal crash', 'tidal', 'tidal wave', 'title crash', 'tidal cash', 'tidal clash', 'crash', 'wave',
    'schianto di marea', 'schianto', 'marea', 'schianto marea', 'onda'],
  // Vinram
  horn_charge: ['horn charge', 'horn', 'horns', 'born charge', 'corn charge', 'horn charged', 'charge',
    'carica di corna', 'corna', 'carica corna', 'corne', 'carica'],
  leaf_volley: ['leaf volley', 'leaf', 'leaves', 'leaf valley', 'leaf body', 'lee volley', 'leaf volleyball', 'volley',
    'raffica di foglie', 'raffica', 'foglie', 'raffica foglie', 'foglia'],
  vine_snare: ['vine snare', 'snare', 'vine', 'vine snail', 'vine share', 'vines', 'vine scare', 'find snare', 'root',
    'laccio di liane', 'laccio', 'liane', 'lacci', 'laccio liane', 'liana'],
  thorn_quake: ['thorn quake', 'thorn', 'quake', 'thorn cake', 'born quake', 'torn quake', 'thorns', 'earthquake',
    'terremoto di spine', 'terremoto', 'spine', 'terremoto spine', 'spina'],
  // Joltmoth
  wing_flick: ['wing flick', 'wing', 'flick', 'wing click', 'ring flick', 'wing fleck', 'wingflick', 'wing kick',
    "colpo d'ala", 'colpo', 'ala', 'colpo ala', 'colpo di ala', 'colpa dala'],
  spark_dart: ['spark dart', 'spark', 'dart', 'spark art', 'spark heart', 'spark dark', 'sparked art', 'spark dot',
    'dardo scintilla', 'dardo', 'scintilla', 'dardo di scintilla'],
  static_field: ['static field', 'static', 'field', 'static feel', 'statics field', 'static filled',
    'campo statico', 'campo', 'statico', 'campo statica'],
  thunder_lance: ['thunder lance', 'thunder', 'lance', 'thunder lands', 'thunder dance', 'thunder lens', 'thunder launch', 'lightning',
    'lancia di tuono', 'lancia', 'tuono', 'lancia tuono', 'lancia del tuono', 'fulmine'],
};

export const SPECIES_ALIASES: Record<SpeciesId, string[]> = {
  cindrix: ['cindrix', 'cinder x', 'cinder ex', 'cindrics', 'sindrix', 'cinder ricks', 'cindy rex', 'cindrex', 'cinderix', 'sindrics', 'cyndrix'],
  brinkle: ['brinkle', 'brinkel', 'brinkley', 'brinkly', 'wrinkle', 'twinkle', 'brincle', 'princle', 'brinkol', 'brinchel'],
  vinram: ['vinram', 'vin ram', 'vine ram', 'venram', 'vinrum', 'ben ram', 'finram', 'vinran', 'vin rum', 'win ram'],
  joltmoth: ['joltmoth', 'jolt moth', 'jolt mot', 'joel moth', 'gold moth', 'holt moth', 'jolt mouth', 'yolt moth', 'jolt mod', 'jolt math'],
};

export const DODGE_ALIASES = ['dodge', 'dodge it', 'doge', 'dodger', 'dodges', 'dog', 'evade', 'sidestep', 'side step', 'move aside', 'duck',
  'schiva', 'schivo', 'skiva', 'schiba', 'schivare', 'schivalo', 'scansati', 'evita'];
export const RECALL_ALIASES = ['come back', 'comeback', 'come back here', 'return', 'retreat', 'calm back', 'come bak', 'get back',
  'rientra', 'rientro', 'rientri', 'torna', 'torna indietro', 'ritorna', 'ritirati', 'rientra nella sfera'];
export const STOP_ALIASES = ['stop', 'stopp', 'halt', 'cancel', 'wait', 'hold', 'hold on',
  'fermati', 'fermo', 'ferma', 'fermate', 'basta', 'annulla', 'alt', 'aspetta'];

export const PICK_ALIASES: Record<0 | 1, string[]> = {
  0: ['first', 'first one', 'one', 'number one', 'primo', 'prima', 'il primo', 'uno', 'numero uno'],
  1: ['second', 'second one', 'two', 'number two', 'secondo', 'seconda', 'il secondo', 'due', 'numero due'],
};

/** Words that split an utterance into separate commands. Longest first. */
export const CONNECTORS = ['and then', 'after that', 'and after', 'followed by', 'then', 'next', 'and', 'than',
  'e poi', 'e dopo', 'e quindi', 'poi', 'dopo', 'quindi', 'usa', 'e', 'ed'];

/** Words ignored before matching. */
export const FILLERS = new Set([
  'use', 'used', 'using', 'do', 'please', 'now', 'the', 'a', 'an', 'attack', 'with', 'it', 'ok', 'okay', 'lets', 'let', 's',
  'try', 'again', 'quick', 'quickly', 'move', 'go', 'i', 'choose', 'you', 'your', 'hey', 'yo', 'come', 'on',
  'fai', 'per', 'favore', 'adesso', 'ora', 'il', 'lo', 'la', 'le', 'gli', 'un', 'una', 'attacca', 'con', 'dai', 'forza',
  'vai', 'scelgo', 'tocca', 'a', 'te', 'tu', 'subito', 'mossa', 'ancora',
  // common exclamations that sit one edit away from keywords ("mamma" ~ "magma")
  'mamma', 'mia', 'mamma mia', 'yes', 'no', 'si', 'wow', 'nice', 'cool', 'good', 'bene', 'bravo', 'brava', 'dio', 'god',
]);

/** Tokens marking an explicit "send out this creature". */
export const GO_WORDS = new Set(['go', 'vai', 'choose', 'scelgo', 'tocca', 'send', 'manda']);
