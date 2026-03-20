/**
 * Game Catur (Modular Chess)
 * © 2024 - Powered by AI
 * 
 * ❯ FORMAT: commands/nemo/gamecatur.js
 * ❯ PENGGUNAAN:
 *   !gamecatur            - Start game / view current board
 *   !gamecatur <move>     - Move notation (e.g., 'e2e4') (TODO impl)
 *   !gamecatur help       - Show this message
 *   !gamecatur status     - Show game status
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
 * NOTES (not implemented):
 * - Parse move notation (e.g., 'e2e4')
 * - Check movement validity
 * - Check check/mate conditions
 * 
 * Example:
 * { from: 'e2', to: 'e4' } ➔ move e2 to e4
 */
function parseMove(move) {
  // TODO
  return false;
}

module.exports = async (command, args, msg, user, db, sock, m) => {
  if (!['gamecatur', 'catur'].includes(command)) return;

  const board = createBoard();
  const helpText = `⚡ *Game Catur* – versi demo. Fungsi utama:
    - !gamecatur             Lihat board
    - !gamecatur <move>      Bergerak (e.g., 'e2e4') - (TODO impl)
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
    await msg.reply(`*Status*: Permainan baru. ❯ Perlu fitur move parser.`);
    return;
  }

  if (args[0]) { // Attempt move
    await msg.reply(`*Fitur bergerak* (TODO) : ${args[0]}`);
  }
};
