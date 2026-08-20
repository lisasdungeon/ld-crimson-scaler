# SOFIYA COVEN BUILD NOTES

## Coven
- **Name**: Sofiya's Dawn Chorus
- **Coven ID**: `sofiya-dawn-chorus-coven`
- **Theme**: Zealot healing front, martyr transfer mechanics, morale-denial chants

## Wave Included
This phase builds the exact **5 Fighters + 5 Recruits** roster requested:
- Fighters (levels 10 -> 6):
  - Brother Elias "Stigmata" Thorne (Corporal, Painbearer)
  - Sister Mira "Veil of Tears" Lorn (Private, Lamenter)
  - Deacon Rolf "Thorncrown" Kael (Corporal, Purifier)
  - Acolyte Ysme "Blood Chalice" Vey (Private, Sacrificer)
  - Cantor Gavrin "Echo Psalm" Senn (Corporal, Chanter)
- Recruits (levels 5 -> 1):
  - Novice Lira "Kneeler" Dax
  - Initiate Torin "Ash" Merr
  - Postulant Sira "Censer" Vale
  - Aspirant Jem "Relic" Korr
  - Neophyte Nyssa "Vow" Ryn

## Final Generic Fighter Pack (Closeout)
Added the final 5 reusable Sofiya generic fighter variants in `generic/`:
- Lament Chanter
- Stigmata Bearer
- Censer Swinger
- Relic Bearer
- Oath Enforcer

These variants use the Dawn Chorus base soldier template and are tuned for support-frontline swarm encounters.

## Data Conventions
- File schema matches prior covens (`id`, `name`, `rank`, `level`, `role`, `build`, `abilities`, `combat`, `skills`, `equipment`, `features`, `spells`, `integration`).
- Integration fields are standardized for hostile AI encounter generation.
- Naming convention follows rank-prefixed slug filenames.

## Status
- Sofiya is closed out for this phase: named fighters, named recruits, and final generic fighter variants are complete and validated.
