const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

client.on('ready', () => {
  console.log(`GHOSTMC OFFICIAL BOT Online! ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  if (message.content === '!ping') {
    message.reply('Pong! GHOSTMC BOT is Online ✅');
  }
  if (message.content === '!ghost') {
    message.reply('GHOSTMC OFFICIAL BOT is here! 🔥');
  }
});

client.login(process.env.TOKEN);
