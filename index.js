const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req,res) => res.send('GHOSTMC BOT IS ONLINE'));
app.get('/ping', (req,res) => res.send('PING OK'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Web server ready on ${PORT}`);
});
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites
  ]
});

const invitesCache = new Map();
const userInvitesData = new Map(); // userId -> { joins, fake, rejoin, left, invitedBy }

client.on('clientReady', async () => {
  console.log(`GHOSTMC OFFICIAL BOT Online! ${client.user.tag}`);
  client.user.setActivity('GHOSTMC |.status', { type: 3 });

  // Cache all invites on start
  for (const guild of client.guilds.cache.values()) {
    try {
      const invites = await guild.invites.fetch();
      invitesCache.set(guild.id, new Map(invites.map(i => [i.code, i.uses])));
    } catch {}
  }
});

// WELCOME STYLISH
client.on('guildMemberAdd', async (member) => {
  const channel = member.guild.systemChannel || member.guild.channels.cache.find(c => c.name.includes('welcome') || c.name === 'general');

  // --- INVITE TRACKER LOGIC ---
  let inviter = null;
  try {
    const newInvites = await member.guild.invites.fetch();
    const oldInvites = invitesCache.get(member.guild.id) || new Map();

    const usedInvite = newInvites.find(i => (oldInvites.get(i.code) || 0) < i.uses);
    if (usedInvite) inviter = usedInvite.inviter;

    invitesCache.set(member.guild.id, new Map(newInvites.map(i => [i.code, i.uses])));
  } catch {}

  if (inviter &&!inviter.bot) {
    if (!userInvitesData.has(inviter.id)) userInvitesData.set(inviter.id, { total: 0, fake: 0, rejoin: 0, left: 0 });
    const data = userInvitesData.get(inviter.id);

    const isFake = (Date.now() - member.user.createdTimestamp) < 7 * 24 * 60 * 60 * 1000;
    const isRejoin = userInvitesData.has(`joined_${member.id}`);

    if (isFake) data.fake++;
    else if (isRejoin) data.rejoin++;
    else data.total++;

    userInvitesData.set(`invitedBy_${member.id}`, inviter.id);
    userInvitesData.set(`joined_${member.id}`, true);
  }

  if (!channel) return;
  const welcomeMsg = `
╔════════════════════╗
   👻 WELCOME TO GHOSTMC 👻
╚════════════════════╝

Hey ${member}! Welcome to the most haunted & powerful SMP! ⛏️

> 🌍 **IP:** \`upcomming\`
> 📌 **Version:** 1.20+ | Java + Bedrock
> 🔗 **Store:** #buy-here
> 🎫 **Support:** #support-tickets

━━━━━━━━━━━━━━━━━━━━━━━━
**🔥 SHURU KAISE KARE?**

📜 #rules padh lo
🎨 #self-roles se apna role lo
⛏️ #minecraft-ip se IP leke join karo

Invited by: ${inviter? `${inviter}` : 'Unknown'}
`;
  channel.send(welcomeMsg);
});

client.on('guildMemberRemove', async (member) => {
  const inviterId = userInvitesData.get(`invitedBy_${member.id}`);
  if (inviterId) {
    if (!userInvitesData.has(inviterId)) userInvitesData.set(inviterId, { total: 0, fake: 0, rejoin: 0, left: 0 });
    const data = userInvitesData.get(inviterId);
    data.left++;
    if (data.total > 0) data.total--;
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  //.status
  if (message.content === '.status') {
    const embed = new EmbedBuilder()
     .setColor('#00ff00')
     .setTitle('👻 GHOSTMC BOT STATUS')
     .setThumbnail(client.user.displayAvatarURL())
     .addFields(
        { name: '🟢 Status', value: 'Online', inline: true },
        { name: '📶 Ping', value: `${client.ws.ping}ms`, inline: true },
        { name: '⏱️ Uptime', value: `<t:${Math.floor(Date.now()/1000 - client.uptime/1000)}:R>`, inline: true },
        { name: '🌐 Servers', value: `${client.guilds.cache.size}`, inline: true },
        { name: '👥 Users', value: `${client.users.cache.size}`, inline: true }
      )
     .setFooter({ text: 'GHOSTMC OFFICIAL' })
     .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  // -i INVITE SYSTEM
  if (message.content.startsWith('-i')) {
    const target = message.mentions.users.first() || message.author;
    const data = userInvitesData.get(target.id) || { total: 0, fake: 0, rejoin: 0, left: 0 };

    try {
      const invites = await message.guild.invites.fetch();
      let realCount = 0;
      invites.filter(inv => inv.inviter && inv.inviter.id === target.id).forEach(inv => realCount += inv.uses);
      // Use real count if our cache is 0
      if (data.total === 0 && realCount > 0) data.total = realCount;
    } catch {}

    const embed = new EmbedBuilder()
     .setColor('#0099ff')
     .setTitle('📨 INVITE STATS - GHOSTMC')
     .setThumbnail(target.displayAvatarURL({ dynamic: true }))
     .addFields(
        { name: '👤 User', value: `${target}`, inline: false },
        { name: '✅ Invites', value: `**${data.total}**`, inline: true },
        { name: '❌ Fake', value: `**${data.fake}**`, inline: true },
        { name: '🔄 Rejoin', value: `**${data.rejoin}**`, inline: true },
        { name: '👋 Left', value: `**${data.left}**`, inline: true }
      )
     .setFooter({ text: `Requested by ${message.author.tag}` })
     .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  // AUTO RESPONDER
  const content = message.content.toLowerCase();
  if (content === 'hello' || content === 'hi ghost') message.reply('Hello! Welcome to GHOSTMC 👻');
  if (content.includes('ip kya hai') || content === 'ip') message.reply('🌍 **GHOSTMC IP:** `upcomming` | Version 1.20+');
});
// ---------- GIVEAWAY SYSTEM ----------
function parseTime(s) {
  let num = parseInt(s.slice(0, -1));
  let unit = s.slice(-1);
  if (unit == 's') return num * 1000;
  if (unit == 'm') return num * 60000;
  if (unit == 'h') return num * 3600000;
  if (unit == 'd') return num * 86400000;
  return null;
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.content.startsWith('/gstart') == false) return;

  let args = message.content.split(' ');
  if (args.length < 4) return message.reply('Use: /gstart 10m 1 Nitro');

  let durationStr = args[1];
  let winnersCount = parseInt(args[2]);
  let prize = args.slice(3).join(' ');
  let ms = parseTime(durationStr);
  if (!ms) return message.reply('Duration galat! 10m, 1h, 1d me likho');

  let embed = new EmbedBuilder()
.setTitle('GIVEAWAY')
.setDescription('Prize: ' + prize + '\nWinners: ' + winnersCount + '\nDuration: ' + durationStr + '\n\nReact karo!')
.setColor(0xFF00FF)
.setFooter({ text: 'Hosted by ' + message.author.tag });

  let msg = await message.channel.send({ embeds: [embed] });
  await msg.react('🎉');

  setTimeout(async () => {
    let newMsg = await message.channel.messages.fetch(msg.id);
    let reaction = newMsg.reactions.cache.get('🎉');
    if (!reaction) return;
    let users = await reaction.users.fetch();
    let realUsers = users.filter(u =>!u.bot);
    if (realUsers.size == 0) return message.channel.send('Giveaway ' + prize + ' me koi join nahi hua.');
    let winners = realUsers.random(Math.min(winnersCount, realUsers.size));
    let mentions = winners.map(w => '<@' + w.id + '>').join(', ');
    message.channel.send('GIVEAWAY KHATAM\nPrize: ' + prize + '\nWinner: ' + mentions);
  }, ms);
});

client.login(process.env.TOKEN);
