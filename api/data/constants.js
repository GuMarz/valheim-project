const BOSS_POINTS = {
  "Eikthyr": 10,
  "The Elder": 20,
  "Bonemass": 35,
  "Moder": 70,
  "Yagluth": 120,
  "The Queen": 250,
  "Fader": 400
};

const FISH_RARITY = {
  "Perche": 1,
  "Brochet": 1,
  "Thon": 1,
  "Morue corallienne": 1,
  "Hareng géant": 2,
  "Grouper": 2,
  "Poisson-globe": 2,
  "Tetra": 3,
  "Poisson-troll": 3,
  "Saumon du Nord": 3,
  "Poisson-lanterne": 4,
  "Magmafish": 4
};

const FISH_QUALITY = {

  // 🟢 Type 1 (max 13)
  "Perche": 13,
  "Brochet": 13,
  "Tetra": 13,
  "Poisson-troll": 13,

  // 🔵 Type 2 (max 14)
  "Thon": 14,
  "Morue corallienne": 14,
  "Hareng géant": 14,
  "Grouper": 14,

  // 🟣 Type 3 (max 15)
  "Poisson-globe": 15,
  "Poisson-lanterne": 15,
  "Magmafish": 15,
  "Saumon du Nord": 15
};

const WARRIOR_SKILLS = [
  "Swords",
  "Knives",
  "Axes",
  "Maces",
  "Polearms",
  "Blocking",
  "Bows",
  "Unarmed"
];

const BOSSES = [
  "Eikthyr",
  "The Elder",
  "Bonemass",
  "Moder",
  "Yagluth",
  "The Queen",
  "Fader"
];

const SKILLS = [
  "Swords",
  "Knives",
  "Axes",
  "Maces",
  "Polearms",
  "Blocking",
  "Bows",
  "Unarmed",
  "Fishing"
];

const FISH = [
  "Perche",
  "Brochet",
  "Thon",
  "Morue corallienne",
  "Hareng géant",
  "Grouper",
  "Poisson-globe",
  "Tetra",
  "Poisson-troll",
  "Saumon du Nord",
  "Poisson-lanterne",
  "Magmafish"
];

const TROPHIES = [
  // Boss
  "Eikthyr", "The Elder", "Bonemass", "Moder", "Yagluth", "The Queen", "Fader",

  // Meadows / Forest
  "Greydwarf", "Greydwarf Brute", "Greydwarf Shaman",
  "Boar", "Deer", "Neck", "Troll",

  // Swamp
  "Draugr", "Draugr Elite", "Skeleton", "Blob", "Ooze", "Wraith", "Leech", "Abomination",

  // Mountains
  "Wolf", "Fenring", "Ulv", "Stone Golem", "Drake",

  // Plains
  "Fuling", "Fuling Berserker", "Fuling Shaman", "Deathsquito", "Lox", "Growth",

  // Mistlands
  "Seeker", "Seeker Soldier", "Seeker Brood", "Gjall", "Tick",
  "Dvergr Rogue", "Dvergr Mage", "Dvergr Guard",

  // Ocean
  "Serpent", "Leviathan"
];

const TROPHY_POINTS = {
  // Boss
  "Eikthyr": 50,
  "The Elder": 100,
  "Bonemass": 150,
  "Moder": 200,
  "Yagluth": 300,
  "The Queen": 500,
  "Fader": 700,

  // Early mobs
  "Boar": 5,
  "Deer": 5,
  "Neck": 5,
  "Greydwarf": 10,
  "Greydwarf Brute": 15,
  "Greydwarf Shaman": 20,
  "Troll": 50,

  // Swamp
  "Skeleton": 10,
  "Draugr": 20,
  "Draugr Elite": 40,
  "Blob": 15,
  "Ooze": 20,
  "Leech": 10,
  "Wraith": 40,
  "Abomination": 100,

  // Mountains
  "Wolf": 20,
  "Drake": 25,
  "Stone Golem": 100,
  "Fenring": 50,

  // Plains
  "Fuling": 20,
  "Fuling Berserker": 80,
  "Fuling Shaman": 60,
  "Deathsquito": 40,
  "Lox": 80,
  "Growth": 60,

  // Mistlands
  "Seeker": 40,
  "Seeker Soldier": 100,
  "Seeker Brood": 20,
  "Gjall": 150,
  "Tick": 10,
  "Dvergr Rogue": 40,
  "Dvergr Mage": 80,

  // Ocean
  "Serpent": 120
};

const TRANSLATIONS = {

  // Boss
  "Eikthyr": "Eikthyr",
  "The Elder": "L'Ancien",
  "Bonemass": "Masse d'Os",
  "Moder": "Moder",
  "Yagluth": "Yagluth",
  "The Queen": "La Reine",
  "Fader": "Fader",

  // Forêt / début
  "Greydwarf": "Nain gris",
  "Greydwarf Brute": "Brute naine grise",
  "Greydwarf Shaman": "Chaman nain gris",
  "Boar": "Sanglier",
  "Deer": "Cerf",
  "Neck": "Neck",
  "Troll": "Troll",

  // Marais
  "Draugr": "Draugr",
  "Draugr Elite": "Élite Draugr",
  "Skeleton": "Squelette",
  "Blob": "Gluant",
  "Ooze": "Limon",
  "Wraith": "Spectre",
  "Leech": "Sangsue",
  "Abomination": "Abomination",

  // Montagnes
  "Wolf": "Loup",
  "Fenring": "Fenring",
  "Ulv": "Ulv",
  "Stone Golem": "Golem de pierre",
  "Drake": "Drake",

  // Plaines
  "Fuling": "Fuling",
  "Fuling Berserker": "Berserker Fuling",
  "Fuling Shaman": "Chaman Fuling",
  "Deathsquito": "Moustique mortel",
  "Lox": "Lox",
  "Growth": "Croissance",

  // Mistlands
  "Seeker": "Chercheur",
  "Seeker Soldier": "Soldat Chercheur",
  "Seeker Brood": "Larve Chercheuse",
  "Gjall": "Gjall",
  "Tick": "Tique",
  "Dvergr Rogue": "Dvergr voleur",
  "Dvergr Mage": "Dvergr mage",
  "Dvergr Guard": "Dvergr garde",

  // Océan
  "Serpent": "Serpent",
  "Leviathan": "Léviathan"
};

module.exports = { BOSS_POINTS, FISH_RARITY, WARRIOR_SKILLS, BOSSES, SKILLS, FISH, TROPHIES, TROPHY_POINTS, TRANSLATIONS, FISH_QUALITY };