/**
 * Game Catur (Modular Chess)
 * © 2024 - Powered by AI
 * 
 * FORMAT: commands/nemo/gamecatur.js
 * PENGGUNAAN:
 *   !gamecatur            - Lihat board
 *   !gamecatur <move>     - Bergerak (e.g., 'e2e4') - *validasi dasar aktif*
 *   !gamecatur help       - Bantu
 *   !gamecatur status     - Info
 */

const fs = require('fs');
const path = require('path');

// Board 8x8
function createBoard() {
  const cols = 'abcdefgh'.split('');
  const rows = 1;
  const pieces = [
    // pawns
    [...cols].map(() => '\u265F'),
    [\u265C,\u265E,\u265D,\u265B,\u265A,\u265D,\u265E,\u265C],
    [...cols].map(() => ' ' ),
    [...cols].map(() => ' ' ),
    [...cols].map(() => ' ' ),
    [...cols].map(() => ' ' ),
    [\u2654,\u265E,\u265D,\u265B,\u265A,\u265D,\u265E,\u2656],
    [...cols].map(() => '\u2659')
  ];
  return pieces;
}

function printBoard(pieces) {
  let output = '';
  pieces.forEach((row, i) => {
    output += (8 - i) + ' | ';
    row.forEach(cell => output += cell + ' ');
    output += '\n';
  });
  output += '\n   a b c d e f g h\n';
  return output;
}

/**
 * Move parser / validator (STUB)
 * 
 * NOTES:
 * - Parse move notation (e.g., 'e2e4')
 * - Check movement validity
 * - Check check/mate conditions (TODO)
 */
function parseMove(move, board) {
  // Validasi format dasar
  if (!move || typeof move !== 'string' || move.length !== 4) {
    return { isValid: false, error: 'Format move salah (contoh: e2e4)' };
  }

  const source = move.substring(0, 2);
  const target = move.substring(2);

  // Validasi format kotak (a1-h8)
  const rowRegex = /^[a-h][1-8]$/;
  if (!rowRegex.test(source) || !rowRegex.test(target)) {
    return { isValid: false, error: 'Kotak tidak valid (contoh: a1, h8)' };
  }

  const sourcePos = getPosition(source);
  const targetPos = getPosition(target);

  // Validasi piece di source
  if (board[sourcePos[1]][sourcePos[0]] === ' ') {
    return { isValid: false, error: 'Tidak ada piece di sumber' };
  }

  return {
    isValid: true,
    from: source,
    to: target,
    sourcePos,
    targetPos
  };
}

function getPosition(row) {
  const colMap = {
    'a': 0, 'b': 1, 'c': 2, 'd': 3,
    'e': 4, 'f': 5, 'g': 6, 'h': 7
  };
  const col = row[0].toLowerCase();
  const rown = parseInt(row[1]);
  return [colMap[col], Math.abs(rown - 8)];
}

module.exports = async (command, args, msg, user, db, sock, m) => {
  if (!['gamecatur', 'catur'].includes(command)) return;

  const board = createBoard();
  const helpText = `⚡ *Game Catur* – versi demo. Fungsi utama:
    - !gamecatur             Lihat board
    - !gamecatur <move>      Bergerak (e.g., 'e2e4') - *validasi dasar*
    - !gamecatur help        Bantu (ini)
    - !gamecatur status      Info
  `;

  if (!args || !args[0]) {
    await msg.reply(printBoard(board));
    return;
  }

  if (args[0] === 'help') {
    await msg.reply(helpText);
    return;
  }

  if (args[0] === 'status') {
    await msg.reply(`*Status*: Permainan baru. ❯ Validasi move aktif, perlu logika pergerakan`);
    return;
  }

  // Attempt move
  const res = parseMove(args[0], board);
  if (!res.isValid) {
    await msg.reply(`❌ *Error*: ${res.error}\nContoh: !gamecatur e2e4`);
    return;
  }

  await msg.reply(`✅ *Move valid*: ${args[0]}\n*Proses: (TODO logika pergerakan, validasi pernah bergerak, check/checkmate)*`);
};
