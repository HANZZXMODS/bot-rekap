const { Telegraf } = require('telegraf');
const bot = new Telegraf('8168359606:AAHu8EsJ-QL1aAVoO-oZOzNGal2lzjOhArU');

const registeredGroups = new Set(); // ✅ Tambahkan baris ini di sini

// Logging untuk debugging
bot.use((ctx, next) => {
  const username = ctx.from?.username || ctx.from?.first_name || ctx.from?.id;
  console.log(`[${new Date().toISOString()}] ${ctx.updateType} from ${username}`);
  return next();
});

// /start (khusus di PM) 
bot.start(async (ctx) => {
  if (ctx.chat.type === 'private') {
    return ctx.reply('Selamat datang di bot!\n\nGunakan /rules untuk melihat peraturan.');
  }

  const DEVELOPER_ID = 7535364533; // Ganti dengan ID Telegram developer kamu

  const isAdmin = async (userId) => {
    try {
      const member = await ctx.telegram.getChatMember(ctx.chat.id, userId);
      return ['creator', 'administrator'].includes(member.status);
    } catch (err) {
      console.error('Gagal cek admin:', err);
      return false;
    }
  };

  const isDevAdmin = await isAdmin(DEVELOPER_ID);

  // Ambil info nama/username developer
  let developerInfo = "@reyzzdb"; // default jika gagal ambil data
  try {
    const devMember = await ctx.telegram.getChatMember(ctx.chat.id, DEVELOPER_ID);
    const user = devMember.user;
    developerInfo = user.username
      ? `@${user.username}`
      : `${user.first_name || ''} ${user.last_name || ''}`.trim();
  } catch (err) {
    console.warn("Gagal ambil info developer:", err.message);
  }

  if (!isDevAdmin) {
    return ctx.replyWithMarkdown(`👋 Halo *${ctx.from.first_name}*,\n\nDEVELOPER SAYA BELUM JADI ADMIN DI GRUP INI.\n\nJika ingin menggunakan bot, *masukkan dan admin-kan developer* terlebih dahulu.\n\n📌 Developer: ${developerInfo}`);
  }

registeredGroups.add(ctx.chat.id);
  ctx.reply('Bot aktif dan siap digunakan di grup ini! 💪');
});

// /rules 
bot.command('rules', (ctx) => {
  ctx.reply(
    '📝 RULES:\n' +
    '1. Tidak spam\n' +
    '2. Sopan terhadap semua anggota\n' +
    '3. Tidak mengirim link tanpa izin\n' +
    '4. Gunakan format yang benar\n' +
    '5. Dilarang menggunakan bot untuk hal negatif\n' +
    '6. Jika ada yang kurang mengerti tanya kan kepada developer'
  );
});

// /antilink
bot.command('antilink', (ctx) => {
  if (ctx.chat.type === 'private') {
    return ctx.reply('Perintah ini hanya bisa digunakan di grup.');
  }
  
  ctx.reply('🔗 Antilink aktif!\nLink yang dikirim akan dihapus otomatis.');
});

// Hapus pesan jika mengandung link (otomatis)
bot.on('message', (ctx, next) => {
  const messageText = ctx.message?.text || '';
  const isLink = /https?:\/\/\S+|www\.\S+/gi.test(messageText);

  if (isLink && ctx.chat.type !== 'private') {
    ctx.deleteMessage().catch(() => {});
    ctx.reply('⚠️ Link tidak diperbolehkan!').catch(() => {});
  } else {
    next();
  }
});

// /tag (tag semua admin kecuali bot)
bot.command('tag', async (ctx) => {
  if (ctx.chat.type === 'private') {
    return ctx.reply('Perintah ini hanya bisa digunakan di grup.');
  }
  
  try {
    const admins = await ctx.getChatAdministrators();
    const tags = admins
      .filter(admin => !admin.user.is_bot)
      .map(admin => admin.user.username ? `@${admin.user.username}` : `[${admin.user.first_name}](tg://user?id=${admin.user.id})`)
      .join(' ');

    if (tags) {
      ctx.replyWithMarkdown(`🔔 Tag admin:\n${tags}`);
    } else {
      ctx.reply('Tidak ada admin yang bisa ditandai.');
    }
  } catch (err) {
    console.error('Gagal mengambil daftar admin:', err);
    ctx.reply('Gagal mengambil admin.');
  }
});

// /rekap
bot.command('rekap', (ctx) => {
  if (ctx.chat.type === 'private') {
    return ctx.reply('Fitur ini hanya bisa digunakan di grup.');
  }

  if (!registeredGroups.has(ctx.chat.id)) {
    return ctx.reply('Grup ini belum terdaftar. Silakan gunakan perintah /start di grup ini untuk mendaftarkan grup.');
  }

  const text = ctx.message.reply_to_message?.text;
  if (!text) return ctx.reply('Balas pesan yang berisi data K dan B.');

  const parse = (section) =>
    [...section.matchAll(/(\w+)\s+(\d+)/g)].map(([, , angka]) => Number(angka));

  const kMatch = text.match(/K:\s*([\s\S]*?)\nB:/);
  const bMatch = text.match(/B:\s*([\s\S]*)/);

  const kList = kMatch ? parse(kMatch[1]) : [];
  const bList = bMatch ? parse(bMatch[1]) : [];

  const totalK = kList.reduce((a, b) => a + b, 0);
  const totalB = bList.reduce((a, b) => a + b, 0);
  const total = totalK + totalB;

  let selisih = '';
  if (totalK > totalB) {
    selisih = `\n\n🐟 B masih kekurangan ${totalK - totalB} untuk menyamai K.`;
  } else if (totalB > totalK) {
    selisih = `\n\n🐠 K masih kekurangan ${totalB - totalK} untuk menyamai B.`;
  }

  ctx.reply(
    `🔵 K: [${kList.join(', ')}] = ${totalK}  \n\n🔵 B: [${bList.join(', ')}] = ${totalB}${selisih}\n\n💰 Saldo Anda seharusnya: ${total} K`
  );
});

// /win 
bot.command('win', (ctx) => {
  if (ctx.chat.type === 'private') {
    return ctx.reply('Fitur ini hanya bisa digunakan di grup.');
  }
  
  if (!registeredGroups.has(ctx.chat.id)) {
    return ctx.reply('Grup ini belum terdaftar. Silakan gunakan perintah /start di grup ini untuk mendaftarkan grup.');
  }
  
  const text = ctx.message.reply_to_message?.text;
  if (!text) return ctx.reply('Balas pesan yang berisi data K dan B.');

  const parse = (section) => {
    return [...section.matchAll(/(\w+)\s+(\d+)(\s*lf)?/gi)].map(([, nama, angkaStr, lfFlag]) => {
      const angka = parseInt(angkaStr);
      const isLf = !!lfFlag;
      const fee = hitungFee(angka);
      const total = isLf ? angka - fee : angka + angka - fee;
      return { nama, angka, total, isLf };
    });
  };
// hitung fee admin
  const hitungFee = (jumlah) => {
    if (jumlah < 1) return 0;
    return Math.floor(jumlah / 10) + (jumlah % 10 === 0 ? 0 : 1);
  };

  const kMatch = text.match(/K:\s*([\s\S]*?)\nB:/i);
  const bMatch = text.match(/B:\s*([\s\S]*)/i);

  const kList = kMatch ? parse(kMatch[1]) : [];
  const bList = bMatch ? parse(bMatch[1]) : [];

  const formatList = (list) => list.map(u =>
    `${u.nama} ${u.angka} // ${u.total}${u.isLf ? ' lf' : ''}`
  ).join('\n');

  ctx.reply(
    `K:\n${formatList(kList)}\n\nB:\n${formatList(bList)}`
  );
});
// contoh (khusus PM)
bot.command('contoh', (ctx) => {
  if (ctx.chat.type !== 'private') return;

  ctx.reply(`Contoh Format:

BESAR:
TEST 10
TEST 20
TEST 30
TEST 40
TEST 50

KECIL:
TEST 5
TEST 15
TEST 25
TEST 35

Penjelasan:
- List harus memiliki lebih dari dua item. 
- Format harus memiliki titik dua (:) setelah setiap header seperti contoh 'BESAR:' dan 'KECIL:'. 
- Dan nick tidak boleh memiliki angka contoh 'TEST123 10' 
- Dan harus memiliki spasi pada nick contoh 'TEST 10' 
- Dan jika ingin menggunakan emoji harus memiliki spasi pada nick contoh 'TEST 10 😂' 
- Ini buat lu yg dongo pake nya dan nyalahin bot nya padahal yg lain bisa`);
});

// Jalankan bot 
bot.launch();
console.log("🤖 Bot Rekap aktif...");