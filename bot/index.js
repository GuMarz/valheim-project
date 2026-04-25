const { 
  Client, 
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const axios = require('axios');
const { BOSSES, SKILLS, FISH, TROPHIES } = require('../api/data/constants');
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

function formatTrophies(allTrophies, playerTrophies) {

  return allTrophies.map(t => {

    const trophy = playerTrophies.find(x => x.nom === t);
    const has = trophy?.obtenu === true;

    return `${has ? "🏆" : "❌"} ${t}`;
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
  if (score >= 2000) return 0xFFD700; // or
  if (score >= 1500) return 0xFF4500; // rouge légendaire
  if (score >= 1000) return 0x8A2BE2; // violet
  if (score >= 500) return 0x1E90FF;  // bleu
  return 0x228B22; // vert débutant
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

  if (content === '!score') {

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

  ☠️ **DEATHS**
  ━━━━━━━━━━━━━━━━━━━━━━
  ${format(deaths, true)}

  ━━━━━━━━━━━━━━━━━━━━━━

  🎣 **FISHING**
  ━━━━━━━━━━━━━━━━━━━━━━
  ${format(fishing)}

  ━━━━━━━━━━━━━━━━━━━━━━

  ⚔️ **WARRIOR**
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

    if (content === '!profil') {
      const res = await axios.get(`${API}/${id}`);
      const p = res.data;

      const score = p.stats.scoreGlobal;

      const title = getTitle(score);
      const name = getNameDecoration(score, p.nom);
      const color = getBackgroundColor(score);

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${title}`)
        .setDescription(`👤 **${name}**`)
        .addFields(
          { name: "🏆 Général", value: `#${p.rankings.general} — ${p.stats.scoreGlobal}pts`, inline: true },
          { name: "⚔️ Warrior", value: `#${p.rankings.warrior} — ${p.stats.scoreWarrior}pts`, inline: true },
          { name: "🎣 Fishing", value: `#${p.rankings.fishing} — ${p.stats.scoreFishing}pts`, inline: true },
          { name: "☠️ Deaths", value: `#${p.rankings.deaths} — ${p.stats.deaths}`, inline: true },
          { name: "🧭 Exploration", value: `#${p.rankings.exploration} — ${p.stats.exploration}%`, inline: true },
          { name: "🏆 Trophies", value: `#${p.rankings.trophies} — ${p.stats.trophiesCount}%`, inline: true }
        )
        .setFooter({ text: `Score total : ${score}` })
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    }

    /* =========================
        🎣 FISH / SKILLS / TROPHIES
    ========================= */

    if (content === '!trophies') {
      const res = await axios.get(`${API}/${id}/trophies`);

      const text = res.data.trophies
        .map(t => `🏆 ${t.nom}`)
        .join("\n");

      return message.channel.send(`🏆 Trophées (${res.data.count})\n` + text);
    }

    /* =========================
        🔥 POST COMMANDS
    ========================= */

    if (content === '!boss') {

      const res = await axios.get(`${API}/${id}`);
      const bosses = res.data.bosses || [];

      // 🧾 texte des boss
      const text = BOSSES.map(b => {
        const found = bosses.find(x => x.nom === b);
        return `🔥 ${b} : ${found ? found.kills : 0}`;
      }).join('\n');

      // 🔘 boutons
      const buttons = BOSSES.map(b =>
        new ButtonBuilder()
          .setCustomId(`boss_${b}_${id}`) // 🔥 on ajoute l'id joueur
          .setLabel(b)
          .setStyle(ButtonStyle.Primary)
      );

      // Discord limite = 5 boutons par ligne
      const rows = [];
      for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
      }

      return message.channel.send({
        content: `🏆 **Tes boss :**\n\n${text}`,
        components: rows
      });
    }

    if (content === '!fish') {

      const res = await axios.get(`${API}/${id}`);
      const player = res.data;

      const fish = player.fish || [];
      const fishLevel = player.skills?.find(s => s.nom === "Fishing")?.niveau || 0;

      const fishText = fish.length > 0
        ? fish.map(f => `🐟 ${f.nom} | Q:${f.qualité}`).join('\n')
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
      );

      return message.channel.send({
        content:
    `🎣 **Fishing**
    ${player.nom}

    📊 Niveau pêche : ${fishLevel}

    🐟 Poissons :
    ${fishText}`,
        components: [row]
      });
    }

    if (content === '!trophy') {

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


    if (content === '!help') {

      return message.channel.send(
    `📜 **Valheim Bot - Commandes**

    ━━━━━━━━━━━━━━━━━━━━━━
    !score → Tous les classements
    ━━━━━━━━━━━━━━━━━━━━━━
    !profil → Ton profil joueur
    ━━━━━━━━━━━━━━━━━━━━━━
    !boss → Afficher + ajouter des boss
    ━━━━━━━━━━━━━━━━━━━━━━
    !fish → Menu pêche
    ━━━━━━━━━━━━━━━━━━━━━━
    !trophies → Voir tes trophées
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
          nom: trophyName,
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
  }
  
  if (!interaction.isButton()) return;

  const customId = interaction.customId;
  
  /* =========================
        🔥 BOSSES
  ========================= */
  if (customId.startsWith('boss_') && !customId.startsWith('boss_page_')) {

    const parts = customId.split('_');
    const boss = parts[1];
    const ownerId = parts[2];

    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: "❌ Ce bouton n'est pas pour toi !", flags: 64 });
    }

    try {
      await axios.post(`${API}/${ownerId}/boss`, { nom: boss });

      const res = await axios.get(`${API}/${ownerId}`);
      const bosses = res.data.bosses || [];

      const text = BOSSES.map(b => {
        const found = bosses.find(x => x.nom === b);
        return `🔥 ${b} : ${found ? found.kills : 0}`;
      }).join('\n');

      return interaction.update({
        content: `🏆 **Tes boss :**\n\n${text}`,
        components: interaction.message.components
      });

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

    for (let i = 1; i <= 15; i++) {
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
      content: `🔢 Qualité de **${fishName}**`,
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
      const fishLevel = player.skills?.find(s => s.nom === "Fishing")?.niveau || 0;

      const fishText = fish.length
        ? fish.map(f => `🐟 ${f.nom} | Q:${f.qualité}`).join('\n')
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

      return interaction.update({
        content:
`🎣 **Fishing**

📊 Niveau pêche : ${fishLevel}

🐟 Poissons :
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
      const fishLevel = player.skills?.find(s => s.nom === "Fishing")?.niveau || 0;

      const fishText = fish.length
        ? fish.map(f => `🐟 ${f.nom} | Q:${f.qualité}`).join('\n')
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

      return interaction.update({
        content:
`🎣 **Fishing mis à jour**

📊 Niveau pêche : ${fishLevel}

🐟 Poissons :
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