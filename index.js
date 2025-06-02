const { Telegraf } = require('telegraf');
const bot = new Telegraf('8168359606:AAHu8EsJ-QL1aAVoO-oZOzNGal2lzjOhArU'); // Ganti dengan token asli kamu

const registeredGroups = new Set();
const DEVELOPER_ID = 7535364533; // Ganti dengan ID Telegram developer kamu

// Logging untuk debugging
bot.use((ctx, next) => {
  const username = ctx.from?.username || ctx.from?.first_name || ctx.from?.id;
  console.log(`[${new Date().toISOString()}] ${ctx.updateType} from ${username}`);
  return next();
});

// REPOST otomatis jika developer kirim pesan pribadi ke bot
bot.on('message', async (ctx, next) => {
  if (ctx.chat.type === 'private' && ctx.from.id === DEVELOPER_ID) {
    for (const groupId of registeredGroups) {
      try {
        if (ctx.message.text) {
          await ctx.telegram.sendMessage(groupId, ctx.message.text);
        } else if (ctx.message.photo) {
          await ctx.telegram.sendPhoto(groupId, ctx.message.photo.at(-1).file_id, {
            caption: ctx.message.caption || '',
          });
        } else if (ctx.message.document) {
          await ctx.telegram.sendDocument(groupId, ctx.message.document.file_id, {
            caption: ctx.message.caption || '',
          });
        } else if (ctx.message.video) {
          await ctx.telegram.sendVideo(groupId, ctx.message.video.file_id, {
            caption: ctx.message.caption || '',
          });
        }
      } catch (err) {
        console.error(`Gagal kirim ke grup ${groupId}:`, err.message);
      }
    }
  }
  return next();
});

// /start (di grup untuk daftar grup, dan PM untuk info)
bot.start(async (ctx) => {
  if (ctx.chat.type === 'private') {
    return ctx.reply('Selamat datang di bot!\n\nGunakan /rules untuk melihat peraturan.');
  }

  const isAdmin = async (userId) => {
    try {
      const member = await ctx.telegram.getChatMember(ctx.chat.id, userId);
      return ['creator', 'administrator'].includes(member.status);
    } catch {
      return false;
    }
  };

  const isDevAdmin = await isAdmin(DEVELOPER_ID);
  let developerInfo = "@reyzzdb";
  try {
    const dev = await ctx.telegram.getChatMember(ctx.chat.id, DEVELOPER_ID);
    developerInfo = dev.user.username ? `@${dev.user.username}` : dev.user.first_name;
  } catch {}

  if (!isDevAdmin) {
    return ctx.replyWithMarkdown(`DEVELOPER BELUM ADMIN DI GRUP INI.\nAdmin-kan developer terlebih dahulu:\n\n📌 ${developerInfo}`);
  }

  registeredGroups.add(ctx.chat.id);
  ctx.reply('Bot aktif dan siap digunakan di grup ini! 💪');
});

// /rules
bot.command('rules', (ctx) => {
  ctx.reply(`📝 RULES:
1. Tidak spam
2. Sopan terhadap semua anggota
3. Tidak mengirim link tanpa izin
4. Gunakan format yang benar
5. Dilarang menggunakan bot untuk hal negatif
6. Jika ada yang kurang mengerti tanya kan kepada developer`);
});

// /antilink
bot.command('antilink', (ctx) => {
  if (ctx.chat.type === 'private') return ctx.reply('Perintah ini hanya bisa digunakan di grup.');
  ctx.reply('🔗 Antilink aktif! Link yang dikirim akan dihapus otomatis.');
});

// hapus otomatis jika mengandung link
bot.on('message', (ctx, next) => {
  const msg = ctx.message?.text || '';
  const isLink = /https?:\/\/\S+|www\.\S+/gi.test(msg);
  if (isLink && ctx.chat.type !== 'private') {
    ctx.deleteMessage().catch(() => {});
    ctx.reply('⚠️ Link tidak diperbolehkan!').catch(() => {});
  } else {
    next();
  }
});

// /tag admin
bot.command('tag', async (ctx) => {
  if (ctx.chat.type === 'private') return ctx.reply('Perintah ini hanya untuk grup.');
  try {
    const admins = await ctx.getChatAdministrators();
    const tags = admins
      .filter(a => !a.user.is_bot)
      .map(a => a.user.username ? `@${a.user.username}` : `[${a.user.first_name}](tg://user?id=${a.user.id})`)
      .join(' ');
    ctx.replyWithMarkdown(`🔔 Tag admin:\n${tags}`);
  } catch {
    ctx.reply('Gagal mengambil admin.');
  }
});

// /rekap
bot.command('rekap', (ctx) => {
  if (ctx.chat.type === 'private') return ctx.reply('Hanya untuk grup.');
  if (!registeredGroups.has(ctx.chat.id)) return ctx.reply('Grup belum terdaftar. Gunakan /start.');

  const text = ctx.message.reply_to_message?.text;
  if (!text) return ctx.reply('Balas pesan yang berisi data K dan B.');

  const parse = (section) =>
    [...section.matchAll(/(\w+)\s+(\d+)/g)].map(([, , angka]) => Number(angka));

  const k = text.match(/K:\s*([\s\S]*?)\nB:/);
  const b = text.match(/B:\s*([\s\S]*)/);

  const kList = k ? parse(k[1]) : [];
  const bList = b ? parse(b[1]) : [];

  const totalK = kList.reduce((a, b) => a + b, 0);
  const totalB = bList.reduce((a, b) => a + b, 0);
  const total = totalK + totalB;

  let selisih = '';
  if (totalK > totalB) selisih = `\n\n🐟 B kekurangan ${totalK - totalB}`;
  else if (totalB > totalK) selisih = `\n\n🐠 K kekurangan ${totalB - totalK}`;

  ctx.reply(`🔵 K: [${kList.join(', ')}] = ${totalK}\n🔵 B: [${bList.join(', ')}] = ${totalB}${selisih}\n\n💰 Total Saldo: ${total} K`);
});

// /win
bot.command('win', (ctx) => {
  if (ctx.chat.type === 'private') return ctx.reply('Hanya untuk grup.');
  if (!registeredGroups.has(ctx.chat.id)) return ctx.reply('Grup belum terdaftar. Gunakan /start.');

  const text = ctx.message.reply_to_message?.text;
  if (!text) return ctx.reply('Balas pesan yang berisi data K dan B.');

  const parse = (section) => {
    return [...section.matchAll(/(\w+)\s+(\d+)(\s*lf)?/gi)].map(([, nama, angkaStr, lfFlag]) => {
      const angka = parseInt(angkaStr);
      const isLf = !!lfFlag;
      const fee = Math.floor(angka / 10) + (angka % 10 === 0 ? 0 : 1);
      const total = isLf ? angka - fee : angka + angka - fee;
      return { nama, angka, total, isLf };
    });
  };

  const k = text.match(/K:\s*([\s\S]*?)\nB:/i);
  const b = text.match(/B:\s*([\s\S]*)/i);

  const kList = k ? parse(k[1]) : [];
  const bList = b ? parse(b[1]) : [];

  const formatList = (list) =>
    list.map(u => `${u.nama} ${u.angka} // ${u.total}${u.isLf ? ' lf' : ''}`).join('\n');

  ctx.reply(`K:\n${formatList(kList)}\n\nB:\n${formatList(bList)}`);
});

// /contoh (khusus PM)
bot.command('contoh', (ctx) => {
  if (ctx.chat.type !== 'private') return;
  ctx.reply(`Contoh Format:

BESAR:
TEST 10
TEST 20

KECIL:
TEST 5
TEST 15

Penjelasan:
- List minimal 2 item
- Gunakan tanda titik dua (:)
- Nick tidak boleh angka semua
- Format spasi harus benar`);
});

// Jalankan bot
bot.launch();
console.log("🤖 Bot Rekap aktif...");
