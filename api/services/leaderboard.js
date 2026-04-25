const {WARRIOR_SKILLS, FISH_RARITY, BOSS_POINTS, TROPHY_POINTS, TROPHIES } = require('../data/constants');

function getWarriorScore(player) {
  let bossScore = 0;

  for (const b of player.bosses || []) {
    const value = BOSS_POINTS[b.nom] || 0;
    bossScore += (b.kills || 0) * value;
  }

  let skillScore = 0;

  for (const s of player.skills || []) {
    if (WARRIOR_SKILLS.includes(s.nom)) {
      skillScore += s.niveau || 0;
    }
  }

  return (bossScore + skillScore)/2000 * 1000;
}

function getFishingScore(player) {
  const fishLevel = player.skills?.find(s => s.nom === "Fishing")?.niveau || 0;

  let sumFish = 0;

  for (const f of player.fish || []) {
    const rarity = FISH_RARITY[f.nom] || 0;
    sumFish += (rarity + (f.qualité || 0));
  }

  return (fishLevel * sumFish)/2000 * 1000;
}

function getTrophyScore(player) {
  let score = 0;

  for (const t of player.trophies || []) {
    if (t.obtenu) {
      score += TROPHY_POINTS[t.nom] || 0;
    }
  }

  return score;
}

function getTrophyCompletion(player) {

  const owned = new Set(
    (player.trophies || [])
      .filter(t => t.obtenu) // ✅ seulement obtenus
      .map(t => t.nom)
  );

  return Math.round((owned.size / TROPHIES.length) * 100);
}

function getGeneralScore(player) {
  const warrior = getWarriorScore(player);
  const fishing = getFishingScore(player);
  const deaths = getDeaths(player);
  const exploration = getExploration(player);
  const trophies = getTrophyScore(player);

  return (warrior + fishing - deaths / 60 * 500 + exploration / 100 * 800 + trophies / 2500 * 800);
}

function getDeaths(player) {
  return player.deaths || 0;
}

function getExploration(player) {
  return player.exploration || 0;
}

module.exports = {
  getWarriorScore,
  getFishingScore,
  getDeaths,
  getExploration,
  getGeneralScore,
  getTrophyScore,
  getTrophyCompletion
};