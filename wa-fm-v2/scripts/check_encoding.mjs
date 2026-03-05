import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'fs';

const db = new DatabaseSync('d:\\\\wa-fm-v2\\\\data\\\\game.db');

let output = '';

output += '=== ACCENTED NAMES ===\n';
const samples = db.prepare(`
  SELECT name FROM players 
  WHERE name LIKE '%nchez%' OR name LIKE '%ndez%' OR name LIKE '%ovic%'
  LIMIT 10
`).all();
samples.forEach(r => { output += r.name + '\n'; });

output += '\n=== LA LIGA CLUBS ===\n';
const clubs = db.prepare("SELECT name FROM clubs WHERE league_id = 2 ORDER BY id").all();
clubs.forEach(c => { output += c.name + '\n'; });

writeFileSync('d:\\\\wa-fm-v2\\\\data\\\\encoding_check2.txt', output, 'utf-8');
console.log('done');
db.close();
