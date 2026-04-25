const express = require('express');
const fs = require('fs');
const cors = require('cors');
const { BOSSES, SKILLS, FISH, TROPHIES } = require('./data/constants');

const {
  getWarriorScore,
  getFishingScore,
  getDeaths,
  getExploration,
  getGeneralScore,
  getTrophyScore,
  getTrophyCompletion
} = require('./services/leaderboard');
const { get } = require('http');

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = './db.json';

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function getPlayers() {
  return readDB().players;
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function rank(players, scoreFn) {
  return [...players]
    .map(p => ({ ...p, score: scoreFn(p) }))
    .sort((a, b) => b.score - a.score);
}

/* =========================
   🏆 LEADERBOARDS
========================= */

app.get('/leaderboard/general', (req, res) => {
  const players = getPlayers();

  const ranked = players
    .map(p => ({
      nom: p.nom,
      score: getGeneralScore(p)
    }))
    .sort((a, b) => b.score - a.score);

  res.json(ranked);
});

app.get('/leaderboard/warrior', (req, res) => {
  const players = getPlayers();

  const ranked = players
    .map(p => ({
      nom: p.nom,
      score: getWarriorScore(p)
    }))
    .sort((a, b) => b.score - a.score);

  res.json(ranked);
});

app.get('/leaderboard/fishing', (req, res) => {
  const players = getPlayers();

  const ranked = players
    .map(p => ({
      nom: p.nom,
      score: getFishingScore(p)
    }))
    .sort((a, b) => b.score - a.score);

  res.json(ranked);
});

app.get('/leaderboard/deaths', (req, res) => {
  const players = getPlayers();

  const ranked = players
    .map(p => ({
      id: p.id,
      nom: p.nom,
      score: getDeaths(p)
    }))
    .sort((a, b) => a.score - b.score); // 👈 déjà OK si "plus de morts = meilleur"

  res.json(ranked);
});

app.get('/leaderboard/exploration', (req, res) => {
  const players = getPlayers();

  const ranked = players
    .map(p => ({
      nom: p.nom,
      score: getExploration(p)
    }))
    .sort((a, b) => b.score - a.score);

  res.json(ranked);
});

/* =========================
   👤 PLAYER STATS
========================= */

app.get('/:id', (req, res) => {
  const players = getPlayers();

  const player = players.find(p => p.id === req.params.id);
  if (!player) return res.status(404).json({ error: "Not found" });

  // 🧠 classements
  const rankedGeneral = [...players].sort((a, b) => (getGeneralScore(b) || 0) - (getGeneralScore(a) || 0));
  const rankedWarrior = [...players].map(p => ({ id: p.id, score: getWarriorScore(p) }))
    .sort((a, b) => b.score - a.score);

  const rankedFishing = [...players].map(p => ({ id: p.id, score: getFishingScore(p) }))
    .sort((a, b) => b.score - a.score);

  const rankedDeaths = [...players].map(p => ({ id: p.id, score: p.deaths || 0 }))
    .sort((a, b) => a.score - b.score);

  const rankedExploration = [...players].map(p => ({ id: p.id, score: p.exploration || 0 }))
    .sort((a, b) => b.score - a.score);

  const rankedTrophies = [...players].map(p => ({ id: p.id, score: getTrophyScore(p) }))
    .sort((a, b) => b.score - a.score);

  // 📊 positions
  const rankings = {
    general: rankedGeneral.findIndex(p => p.id === player.id) + 1,
    warrior: rankedWarrior.findIndex(p => p.id === player.id) + 1,
    fishing: rankedFishing.findIndex(p => p.id === player.id) + 1,
    deaths: rankedDeaths.findIndex(p => p.id === player.id) + 1,
    exploration: rankedExploration.findIndex(p => p.id === player.id) + 1,
    trophies: rankedTrophies.findIndex(p => p.id === player.id) + 1
  };

  // 🧾 réponse propre
  res.json({
    nom: player.nom,
    bosses: player.bosses,
    fish: player.fish,
    trophies: player.trophies,
    fishingLevel: player.skills?.find(s => s.nom === "Fishing")?.niveau || 0,

    rankings,

    stats: {
      scoreGlobal: getGeneralScore(player) || 0,
      scoreWarrior: getWarriorScore(player) || 0,
      scoreFishing: getFishingScore(player) || 0,
      scoreTrophies: getTrophyScore(player) || 0,
      deaths: player.deaths || 0,
      exploration: player.exploration || 0,
      trophiesCount: getTrophyCompletion(player) || 0
    }
  });
});

/* =========================
   🎣 FISHING
========================= */

app.get('/:id/fish', (req, res) => {
  const player = getPlayers().find(p => p.id === req.params.id);
  if (!player) return res.status(404).json({ error: "Not found" });

  const fishingLevel =
    player.skills?.find(s => s.nom === "Fishing")?.niveau || 0;

  const fish = (player.fish || []).map(f => ({
    nom: f.nom,
    rareté: f.rareté,
    qualité: f.qualité,
  }));

  const fishingScore = getFishingScore(player);

  res.json({
    fishingScore,
    fishingLevel,
    fish
  });
});

/* =========================
   🧠 SKILLS
========================= */

app.get('/:id/skills', (req, res) => {
  const player = getPlayers().find(p => p.id === req.params.id);
  if (!player) return res.status(404).json({ error: "Not found" });

  const skills = (player.skills || []).map(s => ({
    nom: s.nom,
    niveau: s.niveau
  }));

  const warriorSkills = skills.filter(s =>
    ["Swords", "Knives", "Axes", "Maces", "Polearms", "Blocking", "Bows", "Unarmed"].includes(s.nom)
  );

  res.json({
    allSkills: skills,
    warriorSkills
  });
});

/* =========================
   🏆 TROPHIES
========================= */

app.get('/:id/trophies', (req, res) => {
  const player = getPlayers().find(p => p.id === req.params.id);
  if (!player) return res.status(404).json({ error: "Not found" });

  const trophies = (player.trophies || [])
    .filter(t => t.obtenu === true)
    .map(t => ({
      nom: t.nom
    }));

  res.json({
    count: trophies.length,
    trophies
  });
});

/* =========================
   🔥 POST ROUTES
========================= */

app.post('/:id/boss', (req, res) => {
  const { nom } = req.body;

  if (!BOSSES.includes(nom)) {
    return res.status(400).json({
      error: "Boss invalide"
    });
  }

  const db = readDB();
  const player = db.players.find(p => p.id === req.params.id);
  if (!player) return res.status(404).json({ error: "Not found" });

  player.bosses = player.bosses || [];

  let boss = player.bosses.find(b => b.nom === nom);

  if (!boss) {
    boss = { nom, kills: 0 };
    player.bosses.push(boss);
  }

  boss.kills += 1;

  saveDB(db);
  res.json({ success: true });
});

app.post('/:id/boss/remove', (req, res) => {
  const { nom } = req.body;

  if (!BOSSES.includes(nom)) {
    return res.status(400).json({
      error: "Boss invalide"
    });
  }

  const db = readDB();
  const player = db.players.find(p => p.id === req.params.id);
  if (!player) return res.status(404).json({ error: "Not found" });

  player.bosses = player.bosses || [];

  let boss = player.bosses.find(b => b.nom === nom);

  if (!boss) {
    boss = { nom, kills: 0 };
    player.bosses.push(boss);
  }

  boss.kills -= 1;

  saveDB(db);
  res.json({ success: true });
});

app.post('/:id/skills', (req, res) => {
  const { nom, niveau } = req.body;

  if (!SKILLS.includes(nom)) {
    return res.status(400).json({
      error: "Skill invalide"
    });
  }

  const db = readDB();
  const player = db.players.find(p => p.id === req.params.id);
  if (!player) return res.status(404).json({ error: "Not found" });

  player.skills = player.skills || [];

  let skill = player.skills.find(s => s.nom === nom);

  if (!skill) {
    skill = { nom, niveau: 0 };
    player.skills.push(skill);
  }

  skill.niveau = niveau;

  saveDB(db);
  res.json({ success: true });
});

app.post('/:id/fishing', (req, res) => {
  const { nom, qualité } = req.body;

  if (!FISH.includes(nom)) {
    return res.status(400).json({
      error: "Poisson invalide"
    });
  }

  const db = readDB();
  const player = db.players.find(p => p.id === req.params.id);
  if (!player) return res.status(404).json({ error: "Not found" });

  player.fish = player.fish || [];

  let fish = player.fish.find(f => f.nom === nom);

  if (!fish) {
    fish = { nom, qualité: 0 };
    player.fish.push(fish);
  }

  fish.qualité = Math.max(fish.qualité || 0, qualité);

  saveDB(db);
  res.json({ success: true });
});

app.post('/:id/trophies', (req, res) => {

  const { nom } = req.body;
  const db = readDB();

  // 🔒 validation
  if (!TROPHIES.includes(nom)) {
    return res.status(400).json({
      error: "Trophée invalide"
    });
  }

  const player = db.players.find(p => p.id === req.params.id);
  if (!player) {
    return res.status(404).json({ error: "Not found" });
  }

  player.trophies = player.trophies || [];

  // 🔥 chercher trophée existant
  const trophy = player.trophies.find(t => t.nom === nom);

  if (trophy) {
    // ✅ update
    trophy.obtenu = true;
  } else {
    // ✅ fallback (sécurité)
    player.trophies.push({ nom, obtenu: true });
  }

  saveDB(db);

  res.json({ success: true });
});

app.post('/create', (req, res) => {
  const db = readDB();

  const { id, nom } = req.body;

  const exists = db.players.find(p => p.id === id);
  if (exists) return res.json({ ok: true });

  // 🟢 init skills
  const skills = SKILLS.map(s => ({
    nom: s,
    niveau: 1
  }));

  // 🟢 init trophées
  const trophies = TROPHIES.map(t => ({
    nom: t,
    obtenu: false
  }));

  const newPlayer = {
    id,
    nom,
    kills: 0,
    deaths: 0,
    scoreGlobal: 0,
    exploration: 0,
    bosses: [],
    skills: skills,
    fish: [],
    trophies: trophies,
    maison: []
  };

  db.players.push(newPlayer);
  saveDB(db);

  res.json({ created: true });
});

/* ========================= */

app.listen(3000, () => {
  console.log("API running on port 3000");
});