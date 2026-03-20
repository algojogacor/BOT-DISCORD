module.exports = async (command, args, msg, user, db, sock, m) => {
    if (command !== 'test') return;
    
    // CARA PAKAI:
    // • !test                -> mencoba fitur test
    // • !test <nama>         -> test dengan nama
    
    let hasil = "Ini hasil dari fitur test";
    if (args[0]) {
        hasil += " dengan nama " + args[0];
    }
    await msg.reply(hasil);
};
