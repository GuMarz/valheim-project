const { 
  Client, 
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const axios = require('axios');
const { BOSSES, SKILLS, FISH, TROPHIES, TRANSLATIONS, FISH_RARITY, FISH_QUALITY, ROLE_IDS } = require('../api/data/constants');
const { TOKEN } = require('../token'); // 🔐 token séparé pour sécurité

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const API = "http://localhost:3000";

// 🔧 helper
function getUserId(message) {
  return message.author.id;
}

function t(name) {
  return TRANSLATIONS[name] || name;
}

const REVERSE_TRANSLATIONS = Object.fromEntries(
  Object.entries(TRANSLATIONS).map(([k, v]) => [v, k])
);

function tReverse(name) {
  return REVERSE_TRANSLATIONS[name] || name;
}

function getFishEmoji(name) {
  const rarity = FISH_RARITY[name] || 1;

  switch (rarity) {
    case 1: return "🐟";
    case 2: return "🐠";
    case 3: return "🐡";
    case 4: return "🐉";
    default: return "🐟";
  }
}

function getStars(quality) {
  const q = Math.max(0, Math.min(5, Math.floor(quality)));

  return "⭐".repeat(q) + "☆".repeat(5 - q);
}

function formatTrophies(allTrophies, playerTrophies) {

  return allTrophies.map(t => {

    const trophy = playerTrophies.find(x => x.nom === t);
    const has = trophy?.obtenu === true;

    const name = TRANSLATIONS[t] || t;

    return `${has ? "🏆" : "❌"} ${name}`;
  }).join("\n");
}

function getTitle(score) {
  if (score >= 2000) return "👑 Légende des mers";
  if (score >= 1500) return "⚔️ Héros des fjords";
  if (score >= 1000) return "🐉 Tueur de monstres";
  if (score >= 750) return "🛡️ Guerrier confirmé";
  if (score >= 500) return "🎣 Chasseur expérimenté";
  if (score >= 250) return "🌿 Aventurier";
  return "🪵 Villageois";
}

function getNameDecoration(score, name) {
  const level = Math.floor(score / 250);

  if (level >= 8) return `👑✨ ${name} ✨👑`;
  if (level >= 6) return `🔥 ${name} 🔥`;
  if (level >= 4) return `⚔️ ${name}`;
  if (level >= 2) return `🪓 ${name}`;
  return name;
}

function getBackgroundColor(score) {
  if (score >= 2000) return 0xFFD700;
  if (score >= 1500) return 0xFF4500;
  if (score >= 1000) return 0x8A2BE2;
  if (score >= 750) return 0x1E90FF;
  if (score >= 500) return 0x32CD32;
  if (score >= 250) return 0x20B2AA;
  return 0xA9A9A9;
}

async function ensurePlayer(message) {
  const id = message.author.id;

  try {
    await axios.get(`${API}/${id}`);
  } catch (err) {
    if (err.response && err.response.status === 404) {
      await axios.post(`${API}/create`, {
        id,
        nom: message.author.username
      });
    }
  }
}

async function updateRole(member, score) {
  const title = getTitle(score);
  const roleId = ROLE_IDS[title];

  if (!roleId) return;

  // 🔒 sécurité : ne pas toucher au propriétaire
  if (member.id === member.guild.ownerId) {
    console.log("❌ Impossible de modifier le propriétaire");
    return;
  }

  // 🔒 sécurité : vérifier si modifiable
  if (!member.manageable) {
    console.log("❌ Membre non modifiable :", member.user.tag);
    return;
  }

  const allRoleIds = Object.values(ROLE_IDS);

  try {
    const currentRoles = member.roles.cache;

    // ✅ récupérer uniquement les rôles à enlever (qu'il possède)
    const rolesToRemove = allRoleIds.filter(id => currentRoles.has(id));

    // ✅ enlever seulement si nécessaire
    if (rolesToRemove.length > 0) {
      await member.roles.remove(rolesToRemove);
    }

    // ✅ ajouter seulement si pas déjà présent
    if (!currentRoles.has(roleId)) {
      await member.roles.add(roleId);
    }

    console.log(`✅ Rôle mis à jour pour ${member.user.tag} → ${title}`);

  } catch (err) {
    console.error("❌ Erreur rôle :", err);
  }
}

async function updateBossMessage(interaction, ownerId) {

  const res = await axios.get(`${API}/${ownerId}`);
  const player = res.data;
  const bosses = player.bosses || [];

  const text = BOSSES.map(b => {
    const found = bosses.find(x => x.nom === b);
    return `🔥 ${t(b)} : ${found ? found.kills : 0}`;
  }).join('\n');

  const buttons = BOSSES.flatMap(b => [
    new ButtonBuilder()
      .setCustomId(`boss_add_${b}_${ownerId}`)
      .setLabel(`+ ${t(b)}`)
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`boss_remove_${b}_${ownerId}`)
      .setLabel(`-`)
      .setStyle(ButtonStyle.Danger)
  ]);

  const rows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
  }

  return interaction.update({
    content:
`🏆 **Boss de ${player.nom} :**

${text}
━━━━━━━━━━━━━━━━━━━━━━
⚔️ Quel boss viens-tu de vaincre ?`,
    components: rows
  });
}

client.on('clientReady', () => {
  console.log(`🤖 Bot connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  try {

    const id = getUserId(message);
    const content = message.content;

    await ensurePlayer(message);

    /* =========================
        🏆 LEADERBOARDS
    ========================= */

  const { EmbedBuilder } = require('discord.js');

  if (content === '!sb') {

    const id = message.author.id;

    const [general, deaths, fishing, warrior, exploration] = await Promise.all([
      axios.get(`${API}/leaderboard/general`),
      axios.get(`${API}/leaderboard/deaths`),
      axios.get(`${API}/leaderboard/fishing`),
      axios.get(`${API}/leaderboard/warrior`),
      axios.get(`${API}/leaderboard/exploration`)
    ]);

    const format = (data, noUnit = false) => {
      return data.data.map((p, i) => {

        const medal =
          i === 0 ? "🥇" :
          i === 1 ? "🥈" :
          i === 2 ? "🥉" :
          `#${i + 1}`;

        const isMe = p.id === id || p.nom === message.author.username;
        const name = isMe ? `**${p.nom}**` : p.nom;

        const score = Number(p.score).toFixed(1);

        const member = message.guild.members.cache.get(message.author.id);
        if (member) {
          await updateRole(member, score);
        }

        return noUnit
          ? `${medal} ${name} — **${score}**`
          : `${medal} ${name} — **${score} pts**`;
      }).join("\n");
    };

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle("🏆 Classements Valheim")
      .setDescription(
  `━━━━━━━━━━━━━━━━━━━━━━

  🏆 **GENERAL**
  ━━━━━━━━━━━━━━━━━━━━━━
  ${format(general)}

  ━━━━━━━━━━━━━━━━━━━━━━

  ☠️ **MORTS**
  ━━━━━━━━━━━━━━━━━━━━━━
  ${format(deaths, true)}

  ━━━━━━━━━━━━━━━━━━━━━━

  🎣 **PECHES**
  ━━━━━━━━━━━━━━━━━━━━━━
  ${format(fishing)}

  ━━━━━━━━━━━━━━━━━━━━━━

  ⚔️ **GUERRIER**
  ━━━━━━━━━━━━━━━━━━━━━━
  ${format(warrior)}

  ━━━━━━━━━━━━━━━━━━━━━━

  🧭 **EXPLORATION**
  ━━━━━━━━━━━━━━━━━━━━━━
  ${format(exploration, true)}

  ━━━━━━━━━━━━━━━━━━━━━━`
      )
      .setFooter({ text: `Demandé par ${message.author.username}` })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
}

    /* =========================
        👤 PROFIL
    ========================= */

if (content === '!pf') {
  const res = await axios.get(`${API}/${id}`);
  const p = res.data;

  const score = p.stats.scoreGlobal;

  const title = getTitle(score);
  const name = getNameDecoration(score, p.nom);
  const color = getBackgroundColor(score);

  const member = message.guild.members.cache.get(message.author.id);
  if (member) {
    await updateRole(member, score);
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${title}`)
    .setDescription(`👤 **${name}**`)
    .addFields(
      { name: "🏆 Général", value: `#${p.rankings.general} — ${Number(p.stats.scoreGlobal).toFixed(2)} pts`, inline: true },
      { name: "⚔️ Guerrier", value: `#${p.rankings.warrior} — ${Number(p.stats.scoreWarrior).toFixed(2)} pts`, inline: true },
      { name: "🎣 Pêche", value: `#${p.rankings.fishing} — ${Number(p.stats.scoreFishing).toFixed(2)} pts`, inline: true },
      { name: "☠️ Morts", value: `#${p.rankings.deaths} — ${Number(p.stats.deaths).toFixed(2)}`, inline: true },
      { name: "🧭 Exploration", value: `#${p.rankings.exploration} — ${Number(p.stats.exploration).toFixed(2)}%`, inline: true },
      { name: "🏆 Trophées", value: `#${p.rankings.trophies} — ${Number(p.stats.trophiesCount).toFixed(2)}%`, inline: true }
    )
    .setFooter({ text: `Score total : ${Number(score).toFixed(2)}` })
    .setTimestamp();

  return message.channel.send({ embeds: [embed] });
}

    /* =========================
        🔥 POST COMMANDS
    ========================= */

    if (content === '!b') {

      const res = await axios.get(`${API}/${id}`);
      const player = res.data;
      const bosses = player.bosses || [];

      // 🧾 texte des boss
      const text = BOSSES.map(b => {
        const found = bosses.find(x => x.nom === b);
        return `🔥 ${t(b)} : ${found ? found.kills : 0}`;
      }).join('\n');

      // 🔘 boutons
      const buttons = BOSSES.flatMap(b => [
        new ButtonBuilder()
          .setCustomId(`boss_add_${b}_${id}`)
          .setLabel(`+ ${t(b)}`)
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`boss_remove_${b}_${id}`)
          .setLabel(`-`)
          .setStyle(ButtonStyle.Danger)
          .setStyle(ButtonStyle.Danger)
      ]);

      const rows = [];

      for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
      }

      return message.channel.send({
        content:
    `🏆 **Boss de ${player.nom} :**

${text}
━━━━━━━━━━━━━━━━━━━━━━
⚔️ Quel boss viens-tu de vaincre ?`,
        components: rows
      });
    }

    if (content === '!p') {

      const res = await axios.get(`${API}/${id}`);
      const player = res.data;

      const fish = player.fish || [];
      const fishLevel = player.fishingLevel || 0;

const fishText = fish.length > 0
  ? fish
      .slice()
      .sort((a, b) => {
        const rarityA = FISH_RARITY[a.nom] || 1;
        const rarityB = FISH_RARITY[b.nom] || 1;

        // 🔥 rareté d'abord (du plus rare au plus commun)
        if (rarityB !== rarityA) return rarityB - rarityA;

        // 🔥 puis qualité (du meilleur au pire)
        return b.qualité - a.qualité;
      })
      .map(f => {
        const emoji = getFishEmoji(f.nom);

        const maxQuality = FISH_QUALITY[f.nom] || 15;
        const qualityRate = Math.floor((f.qualité / maxQuality) * 5);
        const stars = getStars(qualityRate);

        return `${emoji} ${f.nom.padEnd(22)} ${stars}`;
      })
      .join('\n')
  : "Aucun poisson";
      const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`fish_add_${id}`)
          .setLabel("➕ Ajouter poisson")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`fish_edit_${id}`)
          .setLabel("✏️ Modifier poisson")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId(`fish_level_${id}`)
          .setLabel("📊 Niveau pêche")
          .setStyle(ButtonStyle.Secondary)
      );

      const uniqueFish = new Set(fish.map(f => f.nom)).size;
      const totalFish = FISH.length;
      
      return message.channel.send({
        content:
    `🎣 **Pêche de ${player.nom}**
━━━━━━━━━━━━━━━━━━━━━━
📊 Niveau pêche : ${fishLevel}
🐟 Collection : ${uniqueFish} / ${totalFish}

Inventaire :
${fishText}`,
        components: [row]
      });
    }

    if (content === '!t') {

      const res = await axios.get(`${API}/${id}`);
      const player = res.data;

      const playerTrophies = player.trophies || [];

      const text = formatTrophies(TROPHIES, playerTrophies);

      const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`trophy_add_${id}`)
          .setLabel("➕ Ajouter trophée")
          .setStyle(ButtonStyle.Success)
      );

      return message.channel.send({
        content:
    `🏆 **Trophées de ${player.nom}**

${text}`,
        components: [row]
      });
    }

    if (content === '!rules') {

      return message.channel.send(
    `📜 **Règles des Classements & Exploits**
    ━━━━━━━━━━━━━━━━━━━━━━
    ⚔️ **GUERRIER**
    • Boss vaincus
    • Compétences de combat (Swords, Axes, Bows, etc.)
    🏆 Titre : **"L'aplatisseur"**
    ━━━━━━━━━━━━━━━━━━━━━━
    🎣 **PÊCHE**
    • Rareté du poisson
    • Qualité du poisson
    ➡️ Multiplié par le niveau de pêche
    🏆 Titre : **"Plus de poissons que d’amis"**
    ━━━━━━━━━━━━━━━━━━━━━━
    🧭 **EXPLORATION**
    • Pourcentage de carte découvert
    📸 Screenshot obligatoire comme preuve
    🏆 Titre : **"Moi perdu ? Jamais !"**
    ━━━━━━━━━━━━━━━━━━━━━━
    ☠️ **MORTS**
    • Nombre de morts total
    ⚠️ Malus sur le score global

    🏆 Titre selon classement :
    • 🥇 Premier : **"J’ai oublié de mourir"**
    • 💀 Dernier : **"J’ai visité le Valhalla plus que mon inventaire"**
    ━━━━━━━━━━━━━━━━━━━━━━
    🏅 **EXPLOITS**

    • 🏆 Tous les trophées obtenus  
    → **"J’ai tout tué (même les trucs moches)"** +500 pts

    • 🎣 Tous les types de poissons pêchés  
    → **"Attrape-Tout"** +500 pts

    • ⚔️ Boss vaincu sans arme ni armure  
    → **"Le Berserker"** +500 pts

    • 🏠 Plus belle construction (vote communautaire)  
    → **"Maître IKEA"** +500 pts
    ━━━━━━━━━━━━━━━━━━━━━━
    Dédfi hebdomadaire 
    🥇 1er : +300 pts
    🥈 2e : +200 pts
    🥉 3e : +100 pts
    ━━━━━━━━━━━━━━━━━━━━━━
    🏆 **CLASSEMENT GÉNÉRAL**
    • Somme de tous les classements
     + Exploits
     + Défi hebdomadaire

    👑 Titre ultime : **"La Légende"**`
      );
    }


    if (content === '!help') {

      return message.channel.send(
    `📜 **Valheim Bot - Commandes**

    ━━━━━━━━━━━━━━━━━━━━━━
    !sb → Tous les classements
    ━━━━━━━━━━━━━━━━━━━━━━
    !pf → Ton profil joueur
    ━━━━━━━━━━━━━━━━━━━━━━
    !b → Afficher + ajouter des boss
    ━━━━━━━━━━━━━━━━━━━━━━
    !p → Menu pêche + ajouter des poissons
    ━━━━━━━━━━━━━━━━━━━━━━
    !t → Voir tes trophées + ajouter des poissons
    ━━━━━━━━━━━━━━━━━━━━━━
    !rules → Règles de chaque classement, exploit et défis
    ━━━━━━━━━━━━━━━━━━━━━━
    !help → Affiche cette aide
    ━━━━━━━━━━━━━━━━━━━━━━`
      );
    }

  } catch (err) {
    console.error(err);
    message.channel.send("❌ Erreur API ou serveur indisponible.");
  }
});

client.on('interactionCreate', async (interaction) => {

  if (interaction.isModalSubmit()) {

    const customId = interaction.customId;

    if (customId.startsWith('trophy_modal_')) {

      const ownerId = customId.split('_')[2];

      if (interaction.user.id !== ownerId) {
        return interaction.reply({ content: "❌ Pas ton menu", flags: 64 });
      }

      const trophyName = interaction.fields.getTextInputValue('trophy_name');

      try {
        await axios.post(`${API}/${ownerId}/trophies`, {
          nom: tReverse(trophyName),
          obtenu: true
        });

        const res = await axios.get(`${API}/${ownerId}`);
        const player = res.data;

        const playerTrophies = player.trophies || [];

        const text = formatTrophies(TROPHIES, playerTrophies);

        // 🔥 update message original
        await interaction.message.edit({
          content:
  `🏆 **Trophées de ${player.nom}**

  ${text}`,
          components: interaction.message.components
        });

        return interaction.deferUpdate();

      } catch (err) {
        console.error(err);

        return interaction.reply({
          content: "❌ Erreur API",
          flags: 64
        });
      }
    }

  if (customId.startsWith('fish_level_modal_')) {

  const ownerId = customId.split('_')[3];

  if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: "❌ Pas ton menu", flags: 64 });
    }

    const level = parseInt(interaction.fields.getTextInputValue('fish_level'));

    if (isNaN(level)) {
      return interaction.reply({ content: "❌ Niveau invalide", flags: 64 });
    }

    try {
      await axios.post(`${API}/${ownerId}/skills`, {
          "nom": "Fishing",
          "niveau": level
      });

      const res = await axios.get(`${API}/${ownerId}`);
      const player = res.data;

      const fish = player.fish || [];
      const fishLevel = player.fishingLevel || 0;

const fishText = fish.length > 0
  ? fish
      .slice()
      .sort((a, b) => {
        const rarityA = FISH_RARITY[a.nom] || 1;
        const rarityB = FISH_RARITY[b.nom] || 1;

        // 🔥 rareté d'abord (du plus rare au plus commun)
        if (rarityB !== rarityA) return rarityB - rarityA;

        // 🔥 puis qualité (du meilleur au pire)
        return b.qualité - a.qualité;
      })
      .map(f => {
        const emoji = getFishEmoji(f.nom);

        const maxQuality = FISH_QUALITY[f.nom] || 15;
        const qualityRate = Math.floor((f.qualité / maxQuality) * 5);
        const stars = getStars(qualityRate);

        return `${emoji} ${f.nom.padEnd(22)} ${stars}`;
      })
      .join('\n')
  : "Aucun poisson";

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`fish_add_${ownerId}`)
          .setLabel("➕ Ajouter poisson")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`fish_edit_${ownerId}`)
          .setLabel("✏️ Modifier poisson")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId(`fish_level_${ownerId}`)
          .setLabel("📊 Niveau pêche")
          .setStyle(ButtonStyle.Secondary)
      );

      const uniqueFish = new Set(fish.map(f => f.nom)).size;
      const totalFish = FISH.length;

      return interaction.update({
        content:
  `🎣 **Pêche de ${player.nom}**
━━━━━━━━━━━━━━━━━━━━━━
📊 Niveau pêche : ${fishLevel}
🐟 Collection : ${uniqueFish} / ${totalFish}

Inventaire :
${fishText}`,
        components: [row]
      });

    } catch (err) {
      console.error(err);
      return interaction.reply({ content: "❌ Erreur API", flags: 64 });
    }
  }

  }
  
  if (!interaction.isButton()) return;

  const customId = interaction.customId;
  

  if (customId.startsWith('fish_level_')) {

    const ownerId = customId.split('_')[2];

    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: "❌ Pas ton menu", flags: 64 });
    }

    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

    const modal = new ModalBuilder()
      .setCustomId(`fish_level_modal_${ownerId}`)
      .setTitle("📊 Niveau de pêche");

    const input = new TextInputBuilder()
      .setCustomId('fish_level')
      .setLabel("Nouveau niveau de pêche")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input)
    );

    return interaction.showModal(modal);
  }
  /* =========================
        🔥 BOSSES
  ========================= */
    if (customId.startsWith('boss_add_')) {

      const parts = customId.split('_');
      const boss = parts[2];
      const ownerId = parts[3];

      if (interaction.user.id !== ownerId) {
        return interaction.reply({ content: "❌ Pas ton menu", flags: 64 });
      }

      try {
        await axios.post(`${API}/${ownerId}/boss`, { nom: boss });

        return updateBossMessage(interaction, ownerId);

      } catch (err) {
        console.error(err);
        return interaction.reply({ content: "❌ Erreur API", flags: 64 });
      }
    }

    if (customId.startsWith('boss_remove_')) {

      const parts = customId.split('_');
      const boss = parts[2];
      const ownerId = parts[3];

      if (interaction.user.id !== ownerId) {
        return interaction.reply({ content: "❌ Pas ton menu", flags: 64 });
      }

      try {
        await axios.post(`${API}/${ownerId}/boss/remove`, { nom: boss });

        return updateBossMessage(interaction, ownerId);

      } catch (err) {
        console.error(err);
        return interaction.reply({ content: "❌ Erreur API", flags: 64 });
      }
    }

  /* =========================
        🎣 ADD FISH MENU
  ========================= */
  if (customId.startsWith('fish_add_')) {

    const ownerId = customId.split('_')[2];

    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: "❌ Pas ton menu", flags: 64 });
    }

    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const fishList = FISH.slice(0, 25);

    const buttons = fishList.map(f =>
      new ButtonBuilder()
        .setCustomId(`fish_select_${ownerId}_${encodeURIComponent(f)}`)
        .setLabel(f.length > 20 ? f.slice(0, 20) : f)
        .setStyle(ButtonStyle.Primary)
    );

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    return interaction.update({
      content: "🐟 Choisis un poisson :",
      components: rows
    });
  }

  /* =========================
        🎣 SELECT FISH (ADD)
  ========================= */
  if (customId.startsWith('fish_select_')) {

    const parts = customId.split('_');
    const ownerId = parts[2];
    const fishName = decodeURIComponent(parts.slice(3).join('_'));

    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: "❌ Pas ton menu", flags: 64 });
    }

    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const buttons = [];
    const maxQuality = FISH_QUALITY[fishName] || 15;

    for (let i = 1; i <= maxQuality; i++) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`fish_quality_${ownerId}_${encodeURIComponent(fishName)}_${i}`)
          .setLabel(String(i))
          .setStyle(ButtonStyle.Secondary)
      );
    }

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    return interaction.update({
      content: `🔢 Qualité de **${fishName}**
(Correspond à la quantité de poisson crue qu'il donne))`,
      components: rows
    });
  }

  /* =========================
        🎣 ADD QUALITY
  ========================= */
  if (customId.startsWith('fish_quality_')) {

    const parts = customId.split('_');
    const ownerId = parts[2];
    const fishName = decodeURIComponent(parts[3]);
    const quality = parseInt(parts[4]);

    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: "❌ Pas ton menu", flags: 64 });
    }

    try {
      await axios.post(`${API}/${ownerId}/fishing`, {
        nom: fishName,
        qualité: quality
      });

      const res = await axios.get(`${API}/${ownerId}`);
      const player = res.data;

      const fish = player.fish || [];
      const fishLevel = player.fishingLevel || 0;

const fishText = fish.length > 0
  ? fish
      .slice()
      .sort((a, b) => {
        const rarityA = FISH_RARITY[a.nom] || 1;
        const rarityB = FISH_RARITY[b.nom] || 1;

        // 🔥 rareté d'abord (du plus rare au plus commun)
        if (rarityB !== rarityA) return rarityB - rarityA;

        // 🔥 puis qualité (du meilleur au pire)
        return b.qualité - a.qualité;
      })
      .map(f => {
        const emoji = getFishEmoji(f.nom);

        const maxQuality = FISH_QUALITY[f.nom] || 15;
        const qualityRate = Math.floor((f.qualité / maxQuality) * 5);
        const stars = getStars(qualityRate);

        return `${emoji} ${f.nom.padEnd(22)} ${stars}`;
      })
      .join('\n')
  : "Aucun poisson";

      const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`fish_add_${ownerId}`)
          .setLabel("➕ Ajouter poisson")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`fish_edit_${ownerId}`)
          .setLabel("✏️ Modifier poisson")
          .setStyle(ButtonStyle.Primary)
      );

      const uniqueFish = new Set(fish.map(f => f.nom)).size;
      const totalFish = FISH.length;

      return interaction.update({
        content:
`🎣 **Pêche de ${player.nom}**
━━━━━━━━━━━━━━━━━━━━━━
📊 Niveau pêche : ${fishLevel}
🐟 Collection : ${uniqueFish} / ${totalFish}

Inventaire :
${fishText}`,
        components: [row]
      });

    } catch (err) {
      console.error(err);
      return interaction.reply({ content: "❌ Erreur API", flags: 64 });
    }
  }

  /* =========================
        ✏️ EDIT FISH MENU
  ========================= */
  if (customId.startsWith('fish_edit_') && !customId.startsWith('fish_edit_select_') && !customId.startsWith('fish_edit_quality_')) {

    const ownerId = customId.split('_')[2];

    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: "❌ Pas ton menu", flags: 64 });
    }

    const res = await axios.get(`${API}/${ownerId}`);
    const playerFish = res.data.fish || [];

    if (!playerFish.length) {
      return interaction.reply({ content: "❌ Aucun poisson", flags: 64 });
    }

    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const buttons = playerFish.map(f =>
      new ButtonBuilder()
        .setCustomId(`fish_edit_select_${ownerId}_${encodeURIComponent(f.nom)}`)
        .setLabel(`${f.nom} (Q:${f.qualité})`)
        .setStyle(ButtonStyle.Primary)
    );

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    return interaction.update({
      content: "✏️ Choisis un poisson à modifier :",
      components: rows
    });
  }

  /* =========================
        ✏️ SELECT FISH EDIT
  ========================= */
  if (customId.startsWith('fish_edit_select_')) {

    const parts = customId.split('_');
    const ownerId = parts[3];
    const fishName = decodeURIComponent(parts.slice(4).join('_'));

    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: "❌ Pas ton menu", flags: 64 });
    }

    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const buttons = [];

    for (let i = 1; i <= 15; i++) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`fish_edit_quality_${ownerId}_${encodeURIComponent(fishName)}_${i}`)
          .setLabel(String(i))
          .setStyle(ButtonStyle.Secondary)
      );
    }

    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    return interaction.update({
      content: `🔢 Nouvelle qualité pour **${fishName}**`,
      components: rows
    });
  }

  /* =========================
        ✏️ APPLY EDIT FISH
  ========================= */
  if (customId.startsWith('fish_edit_quality_')) {

    const parts = customId.split('_');
    const ownerId = parts[3];
    const fishName = decodeURIComponent(parts[4]);
    const quality = parseInt(parts[5]);

    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: "❌ Pas ton menu", flags: 64 });
    }

    try {
      await axios.post(`${API}/${ownerId}/fishing`, {
        nom: fishName,
        qualité: quality
      });

      const res = await axios.get(`${API}/${ownerId}`);
      const player = res.data;

      const fish = player.fish || [];
      const fishLevel = player.fishingLevel || 0;

const fishText = fish.length > 0
  ? fish
      .slice()
      .sort((a, b) => {
        const rarityA = FISH_RARITY[a.nom] || 1;
        const rarityB = FISH_RARITY[b.nom] || 1;

        // 🔥 rareté d'abord (du plus rare au plus commun)
        if (rarityB !== rarityA) return rarityB - rarityA;

        // 🔥 puis qualité (du meilleur au pire)
        return b.qualité - a.qualité;
      })
      .map(f => {
        const emoji = getFishEmoji(f.nom);

        const maxQuality = FISH_QUALITY[f.nom] || 15;
        const qualityRate = Math.floor((f.qualité / maxQuality) * 5);
        const stars = getStars(qualityRate);

        return `${emoji} ${f.nom.padEnd(22)} ${stars}`;
      })
      .join('\n')
  : "Aucun poisson";

      const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`fish_add_${ownerId}`)
          .setLabel("➕ Ajouter poisson")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`fish_edit_${ownerId}`)
          .setLabel("✏️ Modifier poisson")
          .setStyle(ButtonStyle.Primary)
      );

      const uniqueFish = new Set(fish.map(f => f.nom)).size;
      const totalFish = FISH.length;

      return interaction.update({
        content:
`🎣 **Pêche de ${player.nom}**
━━━━━━━━━━━━━━━━━━━━━━
📊 Niveau pêche : ${fishLevel}
🐟 Collection : ${uniqueFish} / ${totalFish}

Inventaire :
${fishText}`,
        components: [row]
      });

    } catch (err) {
      console.error(err);
      return interaction.reply({ content: "❌ Erreur API", flags: 64 });
    }
  }

  if (customId.startsWith('trophy_add_')) {

    const ownerId = customId.split('_')[2];

    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: "❌ Pas ton menu", flags: 64 });
    }

    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

    const modal = new ModalBuilder()
      .setCustomId(`trophy_modal_${ownerId}`)
      .setTitle("🏆 Ajouter un trophée");

    const input = new TextInputBuilder()
      .setCustomId('trophy_name')
      .setLabel("Nom du trophée")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input)
    );

    return interaction.showModal(modal);
  }


});

client.login(TOKEN);