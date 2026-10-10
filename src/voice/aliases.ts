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
  // Off-type evolution moves (existing lines)
  rock_hurl: ['rock hurl', 'rock', 'hurl', 'rocks', 'rock her', 'rock hurt', 'rock whirl',
    'lancio di roccia', 'lancio', 'roccia', 'lancio roccia', 'lancio di rocce'],
  frost_fin: ['frost fin', 'frost', 'fin', 'frosting', 'frost fan', 'frost thin', 'ice fin',
    'pinna gelida', 'pinna', 'gelida', 'pinna gelata', 'gelo'],
  toxic_thorns: ['toxic thorns', 'toxic', 'toxic thorn', 'tonic thorns', 'toxic horns', 'poison thorns',
    'spine tossiche', 'tossiche', 'spine tossica', 'tossico'],
  gale_slash: ['gale slash', 'gale', 'slash', 'gail slash', 'kale slash', 'gale slush',
    'fendente di vento', 'fendente', 'vento', 'fendente vento'],
  // Stage 3
  volcanic_ruin: ['volcanic ruin', 'volcanic', 'ruin', 'volcano', 'volcanic rain', 'volcanic ruins',
    'rovina vulcanica', 'vulcanica', 'rovina', 'vulcano', 'rovina vulcano'],
  maelstrom: ['maelstrom', 'mail storm', 'male storm', 'whirlpool', 'mael strom', 'mel strom',
    'gorgo abissale', 'gorgo', 'abissale', 'vortice', 'gorgo abbissale'],
  ancient_bloom: ['ancient bloom', 'bloom', 'ancient', 'ancient blue', 'ancient broom',
    'fioritura antica', 'fioritura', 'antica', 'fiori', 'fioritura antiga'],
  tremor_crush: ['tremor crush', 'tremor', 'crush', 'tremor crash', 'treemor crush', 'tremors crush',
    'frantuma terra', 'frantuma', 'terra', 'frantuma la terra', 'frantumaterra'],
  void_bite: ['void bite', 'void', 'bite', 'boyd bite', 'void byte', 'avoid bite',
    'morso del vuoto', 'morso', 'vuoto', 'morso vuoto', 'morso di vuoto'],
  mind_bloom: ['mind bloom', 'mind', 'mine bloom', 'mind blue', 'mind broom',
    'fiore mentale', 'mentale', 'mente', 'fiore mente'],
  razor_pinion: ['razor pinion', 'razor', 'pinion', 'razor opinion', 'razor minion', 'razor pinon',
    'penna tagliente', 'penna', 'tagliente', 'penna taglienti'],
  // Gravelo / Pipwing / Wispurr lines
  pebble_bump: ['pebble bump', 'pebble', 'bump', 'pebble bomb', 'people bump', 'botta di sasso', 'botta', 'sasso', 'sassolino'],
  gravel_shot: ['gravel shot', 'gravel', 'shot', 'gravel shout', 'grovel shot', 'colpo di ghiaia', 'ghiaia', 'colpo ghiaia'],
  stone_skin: ['stone skin', 'stone', 'skin', 'stone scan', 'stoned skin', 'pelle di pietra', 'pelle', 'pietra'],
  fault_quake: ['fault quake', 'fault', 'quake', 'fall quake', 'fought quake', 'faglia sismica', 'faglia', 'sismica'],
  magma_chunk: ['magma chunk', 'magma', 'chunk', 'magma junk', 'magma chuck', 'blocco di magma', 'blocco', 'magma blocco'],
  glacier_drop: ['glacier drop', 'glacier', 'drop', 'glacial drop', 'glacier job', 'caduta glaciale', 'caduta', 'glaciale'],
  beak_peck: ['beak peck', 'beak', 'peck', 'beak pack', 'bee peck', 'beccata', 'becco', 'colpo di becco'],
  feather_dart: ['feather dart', 'feather', 'dart', 'father dart', 'feather art', 'dardo di piuma', 'piuma', 'dardo piuma'],
  dizzy_gale: ['dizzy gale', 'dizzy', 'gale', 'busy gale', 'dizzy gail', 'vento stordente', 'stordente', 'vertigine'],
  hurricane: ['hurricane', 'hurricanes', 'harry cane', 'her cane', 'uragano', 'ciclone', 'uragani'],
  shadow_talon: ['shadow talon', 'shadow', 'talon', 'shadow talent', 'shadow tell on', 'artiglio ombra', 'artiglio', 'ombra', 'artiglio di ombra'],
  draco_zephyr: ['draco zephyr', 'draco', 'zephyr', 'drako zephyr', 'dracula zephyr', 'soffio draconico', 'draconico', 'soffio'],
  paw_tap: ['paw tap', 'paw', 'tap', 'pow tap', 'paw tab', 'zampata', 'zampetta', 'colpetto'],
  psy_orb: ['psy orb', 'orb', 'psy', 'sigh orb', 'psychic orb', 'sfera psichica', 'sfera', 'psichica'],
  calm_mind: ['calm mind', 'calm', 'calm mine', 'come mind', 'mente calma', 'calma', 'calma la mente'],
  mind_crush: ['mind crush', 'crush', 'mind crash', 'mine crush', 'schianto mentale', 'schianto', 'mentale'],
  spirit_hex: ['spirit hex', 'spirit', 'hex', 'spirit hacks', 'spirit x', 'maleficio spettrale', 'maleficio', 'spettrale'],
  astral_blade: ['astral blade', 'astral', 'blade', 'astro blade', 'astral played', 'lama astrale', 'lama', 'astrale'],
  // Dusklet / Scalet / Gloopit lines
  shade_nip: ['shade nip', 'shade', 'nip', 'shade nap', 'shape nip', 'pizzico ombra', 'pizzico', 'ombra', 'pizzico di ombra'],
  spook_bolt: ['spook bolt', 'spook', 'bolt', 'spoke bolt', 'spooky bolt', 'dardo spettrale', 'dardo', 'spettrale'],
  dread_stare: ['dread stare', 'dread', 'stare', 'dead stare', 'bread stare', 'sguardo gelido', 'sguardo', 'gelido'],
  nightmare_wave: ['nightmare wave', 'nightmare', 'wave', 'night mare wave', 'nightmares', 'onda incubo', 'onda', 'incubo'],
  wisp_flame: ['wisp flame', 'wisp', 'flame', 'whisp flame', 'wish flame', 'fuoco fatuo', 'fuoco', 'fatuo'],
  grave_miasma: ['grave miasma', 'grave', 'miasma', 'grave asthma', 'brave miasma', 'miasma tombale', 'tombale', 'miasmi'],
  claw_swipe: ['claw swipe', 'claw', 'swipe', 'clause swipe', 'claw sweep', 'graffio', 'graffi', 'graffio rapido'],
  wyrm_spit: ['wyrm spit', 'wyrm', 'worm spit', 'worm', 'firm spit', 'sputo di drago', 'sputo', 'drago'],
  scale_guard: ['scale guard', 'scale', 'guard', 'scale god', 'scales guard', 'guardia di scaglie', 'guardia', 'scaglie'],
  meteor_fall: ['meteor fall', 'meteor', 'fall', 'meteor fell', 'meteors fall', 'meteora draconica', 'meteora', 'draconica'],
  storm_fang: ['storm fang', 'fang', 'storm', 'storm fan', 'storm bang', 'zanna di tempesta', 'zanna', 'tempesta'],
  inferno_roar: ['inferno roar', 'inferno', 'roar', 'inferno rod', 'in furno roar', 'ruggito infernale', 'ruggito', 'infernale'],
  goo_slap: ['goo slap', 'slap', 'goo slab', 'gu slap', 'schiaffo viscido', 'schiaffo', 'viscido'],
  acid_spit: ['acid spit', 'acid', 'spit', 'acid split', 'acid spot', 'sputo acido', 'acido'],
  sticky_goo: ['sticky goo', 'sticky', 'sticky guru', 'sticky go', 'melma appiccicosa', 'melma', 'appiccicosa'],
  sludge_wave: ['sludge wave', 'sludge', 'slug wave', 'sludge way', 'onda fangosa', 'fangosa', 'fango'],
  swamp_jet: ['swamp jet', 'swamp', 'jet', 'swamp get', 'swap jet', 'getto di palude', 'palude', 'getto palude'],
  mire_slam: ['mire slam', 'mire', 'slam', 'mayor slam', 'mire slim', 'schianto di palude', 'schianto', 'schianto palude'],
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
  gravelo: ['gravelo', 'gravel o', 'gravello', 'gravelow', 'gravel low'],
  boulderax: ['boulderax', 'boulder ax', 'boulder axe', 'boulder ox', 'boulderacks'],
  tectonyx: ['tectonyx', 'tectonics', 'tectonic', 'tecto nix', 'tectonix', 'tectonyks'],
  pipwing: ['pipwing', 'pip wing', 'pipwin', 'pip wink', 'pipping'],
  galehawk: ['galehawk', 'gale hawk', 'gail hawk', 'gale hock', 'kale hawk'],
  zephyrion: ['zephyrion', 'zephyr ion', 'zephyrian', 'zefirion', 'zeffirion'],
  wispurr: ['wispurr', 'wis purr', 'whisper', 'wisper', 'wispur', 'wis per'],
  mystiline: ['mystiline', 'mystic line', 'mistyline', 'mystic lane', 'mistiline'],
  dusklet: ['dusklet', 'dusk let', 'duskit', 'dusk lit', 'dusklit'],
  gloamwraith: ['gloamwraith', 'gloam wraith', 'gloom wraith', 'gloamraith', 'gloam rath'],
  nightpall: ['nightpall', 'night pall', 'night paul', 'nightpaul', 'night pole'],
  scalet: ['scalet', 'scale it', 'scalit', 'scaly it', 'scalett'],
  drakonet: ['drakonet', 'drako net', 'dracon net', 'drakonette', 'draconet'],
  wyverno: ['wyverno', 'wyvern o', 'viverno', 'wiverno', 'wyvern oh'],
  gloopit: ['gloopit', 'gloop it', 'glupit', 'gloop eat', 'gloopet'],
  toxifrog: ['toxifrog', 'toxi frog', 'toxic frog', 'tocsi frog', 'toxy frog'],
  plaguelord: ['plaguelord', 'plague lord', 'plaguelard', 'plague lard', 'plague lorde'],
  astralynx: ['astralynx', 'astral lynx', 'astral links', 'astro lynx', 'astralinks'],
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
