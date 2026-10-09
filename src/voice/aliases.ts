// Phrase lists the parser matches against. Official EN/IT names come from sim data;
// these add short forms, distinctive keywords and likely speech-recognizer mishearings.
// Both languages are always accepted, whatever recognition language is selected.

import type { CheerId, MoveId, SpeciesId } from '../sim/types';

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
  // Stage 2
  molten_leap: ['molten leap', 'molten', 'leap', 'molten lip', 'motel leap', 'malt and leap', 'jump',
    'balzo fuso', 'balzo', 'fuso', 'balzo fusso', 'salto fuso', 'salto'],
  tide_mirror: ['tide mirror', 'mirror', 'tide', 'tied mirror', 'tight mirror', 'reflect',
    'specchio di marea', 'specchio', 'specchio marea', 'riflesso'],
  bramble_stampede: ['bramble stampede', 'bramble', 'stampede', 'rumble stampede', 'brambles',
    'carica di rovi', 'rovi', 'carica rovi', 'carica di rove', 'rovo'],
  chain_storm: ['chain storm', 'chain', 'chainstorm', 'change storm', 'jane storm',
    'tempesta a catena', 'catena', 'tempesta catena', 'tempesta'],
  // Stage 3
  volcanic_ruin: ['volcanic ruin', 'volcanic', 'ruin', 'volcano', 'volcanic rain', 'volcanic ruins',
    'rovina vulcanica', 'vulcanica', 'rovina', 'vulcano', 'rovina vulcano'],
  maelstrom: ['maelstrom', 'mail storm', 'male storm', 'whirlpool', 'mael strom', 'mel strom',
    'gorgo abissale', 'gorgo', 'abissale', 'vortice', 'gorgo abbissale'],
  ancient_bloom: ['ancient bloom', 'bloom', 'ancient', 'ancient blue', 'ancient broom',
    'fioritura antica', 'fioritura', 'antica', 'fiori', 'fioritura antiga'],
  sky_judgement: ['sky judgement', 'sky judgment', 'judgement', 'judgment', 'sky', 'skye judgement',
    'giudizio celeste', 'giudizio', 'celeste', 'giudizio celestre'],
};

export const SPECIES_ALIASES: Record<SpeciesId, string[]> = {
  cindrix: ['cindrix', 'cinder x', 'cinder ex', 'cindrics', 'sindrix', 'cinder ricks', 'cindy rex', 'cindrex', 'cinderix', 'sindrics', 'cyndrix'],
  brinkle: ['brinkle', 'brinkel', 'brinkley', 'brinkly', 'wrinkle', 'twinkle', 'brincle', 'princle', 'brinkol', 'brinchel'],
  vinram: ['vinram', 'vin ram', 'vine ram', 'venram', 'vinrum', 'ben ram', 'finram', 'vinran', 'vin rum', 'win ram'],
  joltmoth: ['joltmoth', 'jolt moth', 'jolt mot', 'joel moth', 'gold moth', 'holt moth', 'jolt mouth', 'yolt moth', 'jolt mod', 'jolt math'],
  pyroxen: ['pyroxen', 'pyroxene', 'pyro zen', 'pirossene', 'pyrox', 'pairoxen'],
  tsunafin: ['tsunafin', 'tsuna fin', 'tuna fin', 'tsunami fin', 'sunafin', 'zunafin'],
  thornhorn: ['thornhorn', 'thorn horn', 'torn horn', 'tornhorn', 'thorne horn', 'horn horn'],
  stormoth: ['stormoth', 'storm moth', 'stormouth', 'storm mot', 'stor moth'],
  calderox: ['calderox', 'calder ox', 'caldera ox', 'calderocks', 'caldarox', 'calderoks'],
  abyssmaw: ['abyssmaw', 'abyss maw', 'abyss more', 'abiss mo', 'abyss ma', 'abissmo'],
  elderoot: ['elderoot', 'elder root', 'elder route', 'elderot', 'elder rut'],
  tempestra: ['tempestra', 'tempest ra', 'tempest', 'tempesta ra', 'tempestre'],
};

/** Encouragements (official EN/IT names come from sim data). "hold on" stays a stop word. */
export const CHEER_ALIASES: Record<CheerId, string[]> = {
  come_on: ['come on', 'cmon', 'c mon', 'come one', 'come own', 'forza', 'forsa', 'forze'],
  stay_strong: ['stay strong', 'stay strung', 'stays strong', 'stay string', 'stay stronger', 'resisti', 'resiste', 'resistere', 'resisto'],
  courage: ['courage', 'curage', 'courageous', 'coraggio', 'corraggio', 'coraggioso', 'coragio'],
  perfect: ['perfect', 'perfectly', 'perfekt', 'perfetto', 'perfetta', 'perfecto', 'perfeto'],
  dont_give_up: ["don't give up", 'dont give up', 'do not give up', 'never give up', 'don t give up',
    'non arrenderti', 'non ti arrendere', 'non arrendersi', 'non arrenderti mai', 'arrenderti'],
};

export const DODGE_ALIASES = ['dodge', 'dodge it', 'doge', 'dodger', 'dodges', 'dog', 'evade', 'sidestep', 'side step', 'move aside', 'duck',
  'schiva', 'schivo', 'skiva', 'schiba', 'schivare', 'schivalo', 'scansati', 'evita'];
/** Side words for "dodge left/right" (same segment as the dodge). Left = −1, right = +1. */
export const DODGE_DIR_WORDS: Record<string, 1 | -1> = { left: -1, sinistra: -1, sx: -1, right: 1, destra: 1, dx: 1 };
export const ALERT_ALIASES = ['alert', 'on guard', 'guard', 'careful', 'watch out', 'be careful',
  'attento', 'attenta', 'guardia', 'in guardia', 'stai attento', 'occhio'];
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
  'try', 'again', 'quick', 'quickly', 'move', 'go', 'i', 'choose', 'you', 'your', 'hey', 'yo', 'come', 'on', 'to', 'verso',
  'fai', 'per', 'favore', 'adesso', 'ora', 'il', 'lo', 'la', 'le', 'gli', 'un', 'una', 'attacca', 'con', 'dai',
  'vai', 'scelgo', 'tocca', 'a', 'te', 'tu', 'subito', 'mossa', 'ancora',
  // common exclamations that sit one edit away from keywords ("mamma" ~ "magma")
  'mamma', 'mia', 'mamma mia', 'yes', 'no', 'si', 'wow', 'nice', 'cool', 'good', 'bene', 'bravo', 'brava', 'dio', 'god',
]);

/** Tokens marking an explicit "send out this creature". */
export const GO_WORDS = new Set(['go', 'vai', 'choose', 'scelgo', 'tocca', 'send', 'manda']);
