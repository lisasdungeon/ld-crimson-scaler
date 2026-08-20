# Lyssa Coven Build Notes (Phase 1)

## Scope completed
- Created full Lyssa coven hierarchy source set.
- Total named members: 25.
- Added generic reusable pool: 10 (5 fighters + 5 recruits), all marked for Lyssa.
- Cascade policy applied: Lyssa level 26, then descending by rank tiers.

## Level cascade
- Lyssa Markova (Matriarch): 26
- Captain Elara Voss: 24
- Captain Thorne Kael: 23
- Sgt. Riven Shade: 22
- Sgt. Mira Locke: 21
- Sgt. Joren Whisper: 20
- Sgt. Vespera Nyx: 19
- Sgt. Korr Blackfeather: 18
- Sgt. Lirael Voss: 17
- Sgt. Daxen Quill: 16
- Sgt. Sylva Wren: 15
- Sgt. Grimalkin: 14
- Sgt. Niamh Shade: 13
- Sgt. Torin Drift: 12
- Sgt. Elowen Mist: 11

### Fighter tier
- Kara "Ghost" Veldt (Corporal): 10
- Ryk "Fang" Soler (Private): 9
- Tessa "Echo" Lorne (Corporal): 8
- Viktor "Shade" Draven (Private): 7
- Lirien "Wisp" Faye (Corporal): 6

### Recruit tier
- Jem "Rat" Korrin (Recruit): 5
- Sira "Crow" Thorne (Recruit): 4
- Dax "Weasel" Merrick (Recruit): 3
- Nyssa "Shadelet" Vale (Recruit): 2
- Kael "Ghostling" Ryn (Recruit): 1

## Files created
- `data/covens/lyssa/index.json`
- `data/covens/lyssa/characters/*.json` (25 files)
- `data/covens/lyssa/generic/index.json`
- `data/covens/lyssa/generic/*.json` (10 files)

## Content completeness in each member file
- Role and rank identity
- Class/subclass build profile
- Core abilities and combat profile
- Skills
- Armor/weapons/focus loadout
- Signature features
- Spell package (for caster/hybrid members)
- Integration metadata for faction/AI behavior

## Validation
- JSON parse validation completed across all 16 Lyssa coven JSON files.
- Result: 0 invalid files.
