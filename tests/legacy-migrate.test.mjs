import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateLegacyAssetPaths, migrateLegacyFlags, rewriteLegacyAssetPath } from '../ld-legacy-migrate.js';

test('rewriteLegacyAssetPath remaps rnk module portraits and dead svg icons', () => {
  assert.equal(
    rewriteLegacyAssetPath('modules/rnk-crimson-scaler/assets/portraits/highpriest_human_man_02.png'),
    'modules/ld-crimson-scaler/assets/portraits/highpriest_human_man_02.png'
  );
  assert.equal(
    rewriteLegacyAssetPath('icons/svg/damage/psychic.svg'),
    'systems/dnd5e/icons/svg/damage/psychic.svg'
  );
  assert.equal(
    rewriteLegacyAssetPath('icons/svg/damage/necrotic.svg'),
    'systems/dnd5e/icons/svg/damage/necrotic.svg'
  );
  assert.equal(
    rewriteLegacyAssetPath('icons/magic/death/skull-energy-white.webp'),
    'systems/dnd5e/icons/svg/damage/necrotic.svg'
  );
  assert.equal(
    rewriteLegacyAssetPath('modules/ld-crimson-scaler/assets/portraits/outdated_01.png'),
    'modules/ld-crimson-scaler/assets/portraits/outdated_01.png'
  );
  assert.equal(
    rewriteLegacyAssetPath('modules/ld-crimson-scaler/assets/portraits/outdated_102.png'),
    'modules/ld-crimson-scaler/assets/portraits/outdated_08.png'
  );
  assert.equal(
    rewriteLegacyAssetPath('systems/dnd5e/icons/svg/damage/psychic.svg'),
    'systems/dnd5e/icons/svg/damage/psychic.svg'
  );
});

test('migrateLegacyAssetPaths rewrites actor and token image paths', async () => {
  const actorUpdates = [];
  const itemUpdates = [];
  const tokenUpdates = [];
  const actor = {
    name: 'Priest',
    img: 'modules/rnk-crimson-scaler/assets/portraits/highpriest_human_man_02.png',
    prototypeToken: { texture: { src: 'modules/rnk-crimson-scaler/assets/portraits/highpriest_human_man_02.png' } },
    items: [
      { id: 'i1', img: 'icons/svg/damage/psychic.svg' }
    ],
    update: async (data) => { actorUpdates.push(data); },
    updateEmbeddedDocuments: async (type, docs) => { itemUpdates.push({ type, docs }); }
  };
  const scene = {
    tokens: [
      { id: 't1', texture: { src: 'modules/rnk-crimson-scaler/assets/portraits/highpriest_human_man_02.png' } }
    ],
    updateEmbeddedDocuments: async (type, docs) => { tokenUpdates.push({ type, docs }); }
  };
  globalThis.game = {
    user: { isGM: true },
    actors: [actor],
    items: [],
    scenes: [scene]
  };
  try {
    const changed = await migrateLegacyAssetPaths();
    assert.equal(changed, 3);
    assert.equal(
      actorUpdates[0].img,
      'modules/ld-crimson-scaler/assets/portraits/highpriest_human_man_02.png'
    );
    assert.equal(itemUpdates[0].type, 'Item');
    assert.equal(itemUpdates[0].docs[0].img, 'systems/dnd5e/icons/svg/damage/psychic.svg');
    assert.equal(tokenUpdates[0].type, 'Token');
    assert.equal(
      tokenUpdates[0].docs[0]['texture.src'],
      'modules/ld-crimson-scaler/assets/portraits/highpriest_human_man_02.png'
    );
  } finally {
    delete globalThis.game;
  }
});

test('migrateLegacyFlags no-ops without game.actors', async () => {
  const moved = await migrateLegacyFlags('ld-test', 'rnk-test');
  assert.equal(moved, 0);
});

test('migrateLegacyFlags copies empty current flags from legacy', async () => {
  const updates = [];
  const actor = {
    name: 'Test',
    flags: { 'rnk-test': { n: 3 } },
    update: async (data) => { updates.push(data); }
  };
  globalThis.game = { actors: [actor] };
  globalThis.foundry = { utils: { deepClone: (v) => JSON.parse(JSON.stringify(v)) } };
  try {
    const moved = await migrateLegacyFlags('ld-test', 'rnk-test');
    assert.equal(moved, 1);
    assert.deepEqual(updates[0], { 'flags.ld-test': { n: 3 } });
  } finally {
    delete globalThis.game;
    delete globalThis.foundry;
  }
});
