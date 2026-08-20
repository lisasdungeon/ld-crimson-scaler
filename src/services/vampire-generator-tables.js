/** Vampire generator lookup tables and helpers */

// ── LOOKUP TABLES ──────────────────────────────────────────────────────

export const FIRST_NAMES = [
  "Vespera", "Lyssa", "Daria", "Yelena", "Sofiya", "Mirael", "Nyx", "Shade",
  "Riven", "Thorne", "Elara", "Korr", "Lira", "Daxen", "Sylva", "Niamh",
  "Grim", "Torin", "Elowen", "Grimalkin", "Viktor", "Ragna", "Borak", "Kira",
  "Sigrid", "Mira", "Gavrin", "Nyssa", "Vesper", "Joren", "Brak", "Kara",
  "Ryk", "Tessa", "Lirien", "Jem", "Sira", "Hagen", "Ilsa", "Gunnar",
  "Pim", "Yna", "Rolf", "Freya", "Alaric", "Sorin", "Nadira", "Cassius",
  "Seraphina", "Mordecai", "Isolde", "Draven", "Carmilla", "Lazarus",
  "Selene", "Vladislav", "Morana", "Strahd", "Ludmilla", "Anastrasya",
  "Volenta", "Escher", "Rahadin", "Patrina", "Kasimir", "Ismark",
  "Soraya", "Razvan", "Katarina", "Nikolai", "Ireena", "Tatyana"
];

export const LAST_NAMES = [
  "Pyne", "Markova", "Volkov", "Vetrova", "Voidwhisper", "Klythe",
  "Dreamthief", "Necrocall", "Voidstep", "Shadebind", "Nightveil",
  "Soulreap", "Phantasm", "Umbra", "Revenant", "Forlorn", "Voss",
  "Quill", "Bloodweaver", "Hexbinder", "Forgeheart", "Scrollkeeper",
  "Bonecarver", "Alkahest", "Ironclad", "Firebrand", "Oathbinder",
  "Stormshield", "Hammerfall", "Skullsplitter", "Steelvein", "Wallender",
  "Blackaxe", "Drillmaster", "Wardbreaker", "Ironfist", "Bloodhowl",
  "Darkhollow", "Gravemist", "Nightblood", "Thornveil", "Ashborne",
  "Crimsonfang", "Duskwalker", "Gloomheart", "Hollowbone", "Iceblood",
  "Moonbane", "Plagueborn", "Ravenscar", "Shadowmere", "Voidborn",
  "Wrathmore", "Bleakheart", "Deathwhisper", "Grimsong", "Pale",
  "Rotting", "Silentgrave", "Tombstone", "Von Zarovich", "Von Holtz",
  "Kreskov", "Wachter", "Vallaki", "Kolyana", "Dilisnya", "Petrovna"
];

export const TITLES = [
  "the Bloody", "the Pale", "of the Crimson Eye", "the Undying",
  "Deathlord", "the Thirsty", "of the Veil", "Bonelord",
  "the Flayed", "Nightcaller", "the Hollow", "Gravebinder",
  "Plaguebringer", "the Silent", "of the Shadow Court",
  "the Reborn", "the Forsaken", "the Accursed", "Soulstealer",
  "the Ancient", "the Young", "the Spawn", "Blood Herald",
  "Moonchild", "the Ravenous", "Heart-Eater", "the Entombed"
];

export const ROLES = {
  Matriarch: ["Supreme commander", "Coven sovereign", "Blood matriarch", "Shadow empress", "Archlich overlord"],
  Captain: ["Enforcer-captain", "War-chaplain", "Battle-seer", "Siege commander", "Blood knight-captain"],
  Sergeant: ["Patrol leader", "Kill-team handler", "Ambush coordinator", "Tithe collector", "Zone enforcer"],
  Corporal: ["Veteran skirmisher", "Frontline anchor", "Shock trooper", "Assault specialist", "Raid leader"],
  Private: ["Line soldier", "Assault operative", "Night hunter", "Flank striker", "Breach runner"],
  Recruit: ["Fledgling spawn", "Blood initiate", "Thrall aspirant", "Outer court neophyte", "Fresh-turned whelp"],
  "Generic Fighter": ["Expendable soldier", "Swarm combatant", "Fodder warrior", "Disposable grunt", "Mass-assault drone"]
};

export const CLASSES = {
  martial: [
    { primaryClass: "Fighter", subclass: "Battle Master", secondaryClass: "None", casterType: "martial" },
    { primaryClass: "Fighter", subclass: "Champion", secondaryClass: "None", casterType: "martial" },
    { primaryClass: "Barbarian", subclass: "Berserker", secondaryClass: "Fighter", casterType: "martial" },
    { primaryClass: "Rogue", subclass: "Assassin", secondaryClass: "Fighter", casterType: "martial" },
    { primaryClass: "Rogue", subclass: "Thief", secondaryClass: "None", casterType: "martial" },
    { primaryClass: "Fighter", subclass: "Eldritch Knight", secondaryClass: "None", casterType: "third-caster" },
    { primaryClass: "Ranger", subclass: "Gloom Stalker", secondaryClass: "Rogue", casterType: "half-caster" }
  ],
  caster: [
    { primaryClass: "Wizard", subclass: "Necromancy", secondaryClass: "Warlock", casterType: "full-caster" },
    { primaryClass: "Warlock", subclass: "Undead", secondaryClass: "None", casterType: "pact-caster" },
    { primaryClass: "Cleric", subclass: "Grave", secondaryClass: "None", casterType: "full-caster" },
    { primaryClass: "Sorcerer", subclass: "Shadow Magic", secondaryClass: "None", casterType: "full-caster" },
    { primaryClass: "Wizard", subclass: "Enchantment", secondaryClass: "Cleric", casterType: "full-caster" },
    { primaryClass: "Bard", subclass: "Spirits", secondaryClass: "Warlock", casterType: "full-caster" },
    { primaryClass: "Cleric", subclass: "Death", secondaryClass: "Wizard", casterType: "full-caster" }
  ],
  hybrid: [
    { primaryClass: "Paladin", subclass: "Oathbreaker", secondaryClass: "Warlock", casterType: "half-caster" },
    { primaryClass: "Ranger", subclass: "Gloom Stalker", secondaryClass: "Rogue", casterType: "half-caster" },
    { primaryClass: "Fighter", subclass: "Eldritch Knight", secondaryClass: "Wizard", casterType: "third-caster" },
    { primaryClass: "Rogue", subclass: "Arcane Trickster", secondaryClass: "None", casterType: "third-caster" },
    { primaryClass: "Monk", subclass: "Shadow", secondaryClass: "Rogue", casterType: "martial" }
  ]
};

export const SKILLS_BY_CLASS = {
  Fighter: ["athletics", "intimidation", "perception", "survival"],
  Barbarian: ["athletics", "intimidation", "survival", "perception"],
  Rogue: ["stealth", "deception", "sleight-of-hand", "perception", "acrobatics"],
  Ranger: ["stealth", "survival", "perception", "nature", "athletics"],
  Wizard: ["arcana", "investigation", "history", "insight"],
  Warlock: ["arcana", "deception", "intimidation", "investigation"],
  Cleric: ["religion", "medicine", "insight", "persuasion"],
  Sorcerer: ["arcana", "deception", "persuasion", "intimidation"],
  Bard: ["performance", "persuasion", "deception", "insight"],
  Paladin: ["athletics", "intimidation", "religion", "persuasion"],
  Monk: ["acrobatics", "stealth", "insight", "athletics"],
};

export const SPELLS_BY_LEVEL = {
  cantrips: ["chill touch", "toll the dead", "mage hand", "minor illusion", "thaumaturgy", "message", "prestidigitation", "eldritch blast", "spare the dying", "produce flame"],
  level1: ["shield", "hex", "inflict wounds", "false life", "detect magic", "bane", "ray of sickness", "disguise self", "charm person", "command", "healing word", "armor of agathys"],
  level2: ["darkness", "mirror image", "misty step", "hold person", "invisibility", "blindness/deafness", "gentle repose", "detect thoughts", "suggestion", "shatter"],
  level3: ["counterspell", "animate dead", "fear", "vampiric touch", "bestow curse", "dispel magic", "hypnotic pattern", "summon shadowspawn", "spirit guardians"],
  level4: ["blight", "greater invisibility", "dimension door", "banishment", "shadow of moil", "death ward", "phantasmal killer"],
  level5: ["cloudkill", "dominate person", "modify memory", "contagion", "danse macabre", "mislead", "wall of force", "raise dead"],
  level6: ["circle of death", "true seeing", "mass suggestion", "create undead", "eyebite", "soul cage"],
  level7: ["finger of death", "plane shift", "forcecage", "power word pain"],
  level8: ["power word stun", "dominate monster", "maze", "demiplane"],
  level9: ["power word kill", "wish", "time stop", "true polymorph"]
};

export const WEAPON_TEMPLATES = {
  dagger:     { name: "Dagger", img: "icons/weapons/daggers/dagger-serrated.webp" },
  shortsword: { name: "Shortsword", img: "icons/weapons/swords/shortsword-guard-engraved-gem-red.webp" },
  longsword:  { name: "Longsword", img: "icons/weapons/swords/sword-guard-steel-green.webp" },
  greatsword: { name: "Greatsword", img: "icons/weapons/swords/greatsword-crossguard-steel.webp" },
  mace:       { name: "Mace", img: "icons/weapons/maces/mace-round-spiked-grey.webp" },
  flail:      { name: "Flail", img: "icons/weapons/maces/flail-ball-grey.webp" },
  spear:      { name: "Spear", img: "icons/weapons/polearms/spear-hooked.webp" },
  halberd:    { name: "Halberd", img: "icons/weapons/polearms/halberd-crescent-steel.webp" },
  crossbow:   { name: "Hand Crossbow", img: "icons/weapons/crossbows/crossbow-simple-brown.webp" },
  staff:      { name: "Staff", img: "icons/weapons/staves/staff-ornate-red.webp" },
  wand:       { name: "Wand", img: "icons/weapons/wands/wand-gem-red.webp" },
  claws:      { name: "Vampire Claws", img: "icons/weapons/fist/claw-gauntlet-grey.webp" },
  bite:       { name: "Vampire Bite", img: "icons/creatures/abilities/mouth-teeth-drool-red.webp" },
  garrote:    { name: "Garrote Wire", img: "icons/weapons/sickles/hook-steel-grey.webp" },
  axe:        { name: "Battleaxe", img: "icons/weapons/axes/axe-broad-grey.webp" },
  hammer:     { name: "Warhammer", img: "icons/weapons/hammers/hammer-war-rounding.webp" },
  whip:       { name: "Whip", img: "icons/weapons/sickles/sickle-curved-grey.webp" },
  shield:     { name: "Shield", img: "icons/equipment/shield/heater-steel-grey.webp" },
};

export const ARMOR_TEMPLATES = {
  robes:      { name: "Dark Robes", img: "icons/equipment/chest/robe-blue-gold.webp" },
  leather:    { name: "Nightstalker Leather", img: "icons/equipment/chest/leather-chest-dark.webp" },
  chain:      { name: "Bloodforged Chainmail", img: "icons/equipment/chest/chain-mail-steel-grey.webp" },
  half_plate: { name: "Crimson Half-Plate", img: "icons/equipment/chest/breastplate-riveted-grey.webp" },
  plate:      { name: "Dreadplate", img: "icons/equipment/chest/breastplate-steel-grey.webp" },
  cloak:      { name: "Shadow Cloak", img: "icons/equipment/back/cloak-collared-grey.webp" },
};

export const FOCUS_TEMPLATES = {
  mark:    { name: "Sanguine Heart Mark", img: "icons/magic/symbols/rune-sigil-red-orange.webp" },
  sigil:   { name: "Blood Sigil Stone", img: "icons/magic/death/skull-energy-white.webp" },
  amulet:  { name: "Crimson Amulet", img: "icons/equipment/neck/amulet-round-engraved-gold.webp" },
  orb:     { name: "Shadow Orb", img: "icons/magic/light/orb-shadow-blue.webp" },
  tome:    { name: "Forbidden Codex", img: "icons/sundries/books/book-embossed-gold-red.webp" },
  censer:  { name: "Wraith Censer", img: "icons/sundries/lights/lantern-iron-rusty.webp" },
};

export const FEATURES_BY_TIER = {
  recruit: [
    "Darkvision 60 ft.",
    "Vampiric Resistance (necrotic)",
    "Spider Climb",
    "Fledgling Regeneration (regain 5 hp start of turn if above 0)",
  ],
  fighter: [
    "Darkvision 120 ft.",
    "Vampiric Resistance (necrotic)",
    "Spider Climb",
    "Regeneration (regain 10 hp start of turn unless radiant/holy water)",
    "Vampire Bite (bonus action, regain hp equal to necrotic damage)",
    "Sunlight Hypersensitivity (disadvantage in sunlight)",
  ],
  sergeant: [
    "Darkvision 120 ft.",
    "Vampiric Resistance (necrotic, bludgeoning/piercing/slashing from nonmagical)",
    "Spider Climb",
    "Regeneration (regain 15 hp/turn unless radiant/holy water)",
    "Vampire Bite (melee, 1d6+STR piercing + 3d6 necrotic, regain hp = necrotic)",
    "Charm (DC 14, one humanoid, 24 hours)",
    "Children of the Night (summon 2d4 wolves or swarm of bats)",
    "Sunlight Hypersensitivity",
  ],
  captain: [
    "Darkvision 120 ft.",
    "Vampiric Resistance (necrotic, bludgeoning/piercing/slashing from nonmagical)",
    "Legendary Resistance (2/day)",
    "Spider Climb",
    "Regeneration (regain 20 hp/turn unless radiant/holy water)",
    "Vampire Bite (melee, 1d6+STR piercing + 4d6 necrotic, reduce max hp, regain hp)",
    "Charm (DC 16, one humanoid, 24 hours)",
    "Children of the Night (summon 2d4 wolves or swarm of bats)",
    "Shapechanger (bat, mist, wolf)",
    "Misty Escape (drop to 0 hp → mist form)",
    "Sunlight Hypersensitivity",
  ],
  matriarch: [
    "Darkvision 120 ft.",
    "Vampiric Resistance (necrotic, bludgeoning/piercing/slashing from nonmagical)",
    "Legendary Resistance (3/day)",
    "Legendary Actions (3/turn)",
    "Spider Climb",
    "Regeneration (regain 25 hp/turn unless radiant/holy water)",
    "Vampire Bite (melee, 1d6+STR piercing + 5d6 necrotic, reduce max hp, regain hp)",
    "Charm (DC 18, one humanoid, 24 hours)",
    "Children of the Night (summon 3d6 wolves, 2d4 dire wolves, or swarm of bats)",
    "Shapechanger (bat, mist, wolf, swarm of bats)",
    "Misty Escape (drop to 0 hp → mist form)",
    "Lair Actions",
    "Sunlight Hypersensitivity",
  ],
};

export const AI_STYLES = [
  "ambush-predator", "frontline-tank", "backline-caster", "skirmisher-flanker",
  "support-healer", "debuff-controller", "assassin-striker", "siege-breaker",
  "swarm-commander", "duelist", "artillery-caster", "infiltrator",
  "berserker-charger", "necromancer-summoner", "blood-ritualist",
  "predatory-controller", "defensive-anchor", "hit-and-run"
];

// ── AVAILABLE PORTRAITS (unused outdated images for generated vampires) ──
export const GENERATED_PORTRAITS = [];
for (let i = 26; i <= 104; i++) {
  // Skip gaps in the outdated numbering
  if (i === 35 || i === 2) continue;
  GENERATED_PORTRAITS.push(`modules/ld-crimson-scaler/assets/portraits/outdated_${String(i).padStart(2, "0")}.png`);
}

// ── UTILITY ────────────────────────────────────────────────────────────

export function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
export function rndInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
export function mod(score) { return Math.floor((score - 10) / 2); }

export function toKebab(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
