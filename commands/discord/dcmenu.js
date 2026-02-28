// ╔══════════════════════════════════════════════════════════════╗
// ║   DC MENU — commands/discord/dcmenu.js                       ║
// ╚══════════════════════════════════════════════════════════════╝

module.exports = async function dcMenuCmd(command, args, msg, user, db) {
    if (command !== 'menu' && command !== 'help' && command !== 'start') return;

    const linked = Object.values(db.discordLinks || {}).includes(msg.author) ? '🔗 Linked ke WA' : '❌ Belum link WA';

    return msg.reply(
`━━━━━━━━━━━━━━━━━━━━━━━━
🎮 **ALGOJO BOT v2.0 | Discord**
━━━━━━━━━━━━━━━━━━━━━━━━

👤 **${msg.pushName}** | Lv.${user.level} | ${linked}

**💰 EKONOMI**
\`!dompet\` \`!bank\` \`!depo\` \`!tarik\` \`!tf\`
\`!top\` \`!pinjam\` \`!bayar\`

**📈 INVESTASI**
\`!saham\` \`!crypto\` \`!valas\` \`!properti\`

**🌾 USAHA**
\`!farm\` \`!ternak\` \`!mining\` \`!pabrik\`
\`!kerja\` \`!jobs\`

**🎲 GAME**
\`!roulette\` \`!mines\` \`!duel\` \`!battle\`
\`!bola\` \`!trivia\` \`!wordle\` \`!tebak\`

**🤖 AI**
\`!ai\` \`!reset\` \`!persona\`

**🔗 LINK AKUN WA**
\`!link 628xxx\` → Hubungkan ke akun WA
\`!linkstatus\`  → Cek status link
\`!unlink\`      → Putuskan link

━━━━━━━━━━━━━━━━━━━━━━━━
💡 Semua data sinkron dengan Bot WA!`
    );
};