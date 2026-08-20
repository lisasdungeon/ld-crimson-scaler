import { MODULE_ID } from "../utils/constants.js";

const COVEN_IDS = ["daria", "lyssa", "sofiya", "vespera", "yelena"];
const COVEN_BASE = `modules/${MODULE_ID}/data/covens`;

export class CovenDataService {
  constructor() {
    this._covens = null;
    this._allMembers = null;
  }

  async load() {
    if (this._covens) return;

    this._covens = [];
    this._allMembers = [];

    for (const covenDir of COVEN_IDS) {
      try {
        const indexResp = await fetch(`${COVEN_BASE}/${covenDir}/index.json`);
        if (!indexResp.ok) continue;
        const index = await indexResp.json();

        const members = [];
        for (const member of (index.members || [])) {
          try {
            const charResp = await fetch(`${COVEN_BASE}/${covenDir}/${member.file}`);
            if (!charResp.ok) continue;
            const charData = await charResp.json();
            charData._covenId = index.covenId;
            charData._covenName = index.covenName;
            members.push(charData);
          } catch (e) {
            console.warn(`${MODULE_ID} | Failed to load coven member: ${member.file}`, e);
          }
        }

        const generics = [];
        const genericIndexFile = index.genericPool?.file || index.genericIndex;
        if (genericIndexFile) {
          try {
            const genericIndexResp = await fetch(`${COVEN_BASE}/${covenDir}/${genericIndexFile}`);
            if (genericIndexResp.ok) {
              const genericIndex = await genericIndexResp.json();
              const listed = genericIndex.templates || genericIndex.variants || [];
              const genericDir = genericIndexFile.includes("/")
                ? genericIndexFile.slice(0, genericIndexFile.lastIndexOf("/") + 1)
                : "generic/";
              for (const variant of listed) {
                if (!variant?.file) continue;
                try {
                  const gResp = await fetch(`${COVEN_BASE}/${covenDir}/${genericDir}${variant.file}`);
                  if (!gResp.ok) continue;
                  const gData = await gResp.json();
                  gData._covenId = index.covenId;
                  gData._covenName = index.covenName;
                  gData._isGeneric = true;
                  generics.push(gData);
                } catch (_err) { /* skip missing listed file */ }
              }
            }
          } catch (_err) { /* listed generic pool failed to load */ }
        }

        this._covens.push({
          ...index,
          _dir: covenDir,
          _members: members,
          _generics: generics
        });

        this._allMembers.push(...members, ...generics);
      } catch (e) {
        console.warn(`${MODULE_ID} | Failed to load coven: ${covenDir}`, e);
      }
    }

    console.log(`${MODULE_ID} | Loaded ${this._covens.length} covens, ${this._allMembers.length} total members`);
  }

  get covens() { return this._covens || []; }
  get allMembers() { return this._allMembers || []; }

  getCoven(covenId) {
    return this._covens?.find(c => c.covenId === covenId) || null;
  }

  getMembersByRank(covenId, rank) {
    const coven = this.getCoven(covenId);
    if (!coven) return [];
    return [...coven._members, ...coven._generics].filter(m => m.rank === rank);
  }

  getMember(memberId) {
    return this._allMembers?.find(m => m.id === memberId) || null;
  }

  getFilteredMembers(filters = {}) {
    let results = [...(this._allMembers || [])];
    if (filters.covenId) results = results.filter(m => m._covenId === filters.covenId);
    if (filters.rank) results = results.filter(m => m.rank === filters.rank);
    if (filters.search) {
      const needle = filters.search.toLowerCase();
      results = results.filter(m =>
        (m.name || "").toLowerCase().includes(needle) ||
        (m.role || "").toLowerCase().includes(needle) ||
        (m.build?.primaryClass || "").toLowerCase().includes(needle)
      );
    }
    if (filters.sort === "level-desc") results.sort((a, b) => b.level - a.level);
    else if (filters.sort === "level-asc") results.sort((a, b) => a.level - b.level);
    else if (filters.sort === "name") results.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return results;
  }
}

export const covenDataService = new CovenDataService();
