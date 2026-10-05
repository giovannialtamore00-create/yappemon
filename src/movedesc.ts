// Short effect descriptions for the move bar. `{d}` is replaced by the damage at the creature's
// current evolution stage (base power × stage multiplier, before type effectiveness).

import type { Lang, MoveId } from './sim/types';

export const MOVE_DESC: Record<MoveId, Record<Lang, string>> = {
  shell_ram: { en: 'Instant roll, always hits · {d} dmg', it: 'Rotolata istantanea, va sempre a segno · {d} danni' },
  cinder_spit: { en: 'Fireball projectile · {d} dmg', it: 'Palla di fuoco · {d} danni' },
  heat_shell: { en: 'Takes half damage for 4 s', it: 'Dimezza i danni subiti per 4 s' },
  magma_burst: { en: 'Eruption under the foe · {d} dmg · long charge', it: 'Eruzione sotto il nemico · {d} danni · carica lunga' },
  bubble_bump: { en: 'Instant bounce, always hits · {d} dmg', it: 'Rimbalzo istantaneo, va sempre a segno · {d} danni' },
  water_jet: { en: 'Fast water beam · {d} dmg', it: "Raggio d'acqua veloce · {d} danni" },
  healing_rain: { en: 'Heals 18 HP over 3 s', it: 'Cura 18 PS in 3 s' },
  tidal_crash: { en: 'Huge wave · {d} dmg · long charge', it: 'Onda enorme · {d} danni · carica lunga' },
  horn_charge: { en: 'Instant headbutt, always hits · {d} dmg', it: 'Cornata istantanea, va sempre a segno · {d} danni' },
  leaf_volley: { en: 'Spread of razor leaves · {d} dmg', it: 'Raffica di foglie taglienti · {d} danni' },
  vine_snare: { en: "Roots the foe 2 s: can't dodge", it: 'Blocca il nemico 2 s: non può schivare' },
  thorn_quake: { en: 'Spikes burst from the ground · {d} dmg · long charge', it: 'Spine dal terreno · {d} danni · carica lunga' },
  wing_flick: { en: 'Instant wing strike, always hits · {d} dmg', it: "Colpo d'ala istantaneo, va sempre a segno · {d} danni" },
  spark_dart: { en: 'Very fast spark · {d} dmg', it: 'Scintilla velocissima · {d} danni' },
  static_field: { en: "Halves the foe's stamina regen 5 s", it: "Dimezza la ricarica d'energia nemica per 5 s" },
  thunder_lance: { en: 'Lightning bolt, near instant · {d} dmg · long charge', it: 'Fulmine quasi istantaneo · {d} danni · carica lunga' },
  molten_leap: { en: 'Leaps and slams down · {d} dmg', it: 'Balza e schiaccia il nemico · {d} danni' },
  tide_mirror: { en: 'Reflects the next hit back (1.5 s)', it: 'Riflette il prossimo colpo (1,5 s)' },
  bramble_stampede: { en: "Charge that can't be interrupted · {d} dmg", it: 'Carica inarrestabile · {d} danni' },
  chain_storm: { en: '3 bolts of {d} dmg, each dodgeable', it: '3 fulmini da {d} danni, schivabili' },
  volcanic_ruin: { en: 'Triple eruption · {d} dmg · very long charge', it: 'Tripla eruzione · {d} danni · carica lunghissima' },
  maelstrom: { en: 'Whirlpool · {d} dmg + roots 1.5 s', it: 'Vortice · {d} danni + blocca 1,5 s' },
  ancient_bloom: { en: 'Heals 35 HP over 3 s', it: 'Cura 35 PS in 3 s' },
  sky_judgement: { en: 'Lightning from the sky · {d} dmg · very long charge', it: 'Fulmine dal cielo · {d} danni · carica lunghissima' },
};
