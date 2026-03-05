// src/engine/sponsor.js — Sponsorship System
// Setiap awal musim, user ditawarkan 3 sponsor. Masing-masing punya risk/reward berbeda.

import { dbGet, dbAll, dbRun, getClub } from '../db/database.js';
import { formatMoney } from './transfer.js';

// ─── Sponsor Templates ───────────────────────────────────────────────────────
const SPONSOR_POOL = [
    // Safe sponsors (upfront tinggi, bonus kecil)
    { name: 'NusaBank', type: 'safe', upfront: 12_000_000, win_bonus: 0, goal_bonus: 0, objective: null, obj_bonus: 0 },
    { name: 'IndoFoods', type: 'safe', upfront: 10_000_000, win_bonus: 100_000, goal_bonus: 0, objective: null, obj_bonus: 0 },
    { name: 'TelkomCel', type: 'safe', upfront: 11_000_000, win_bonus: 0, goal_bonus: 50_000, objective: null, obj_bonus: 0 },
    { name: 'AquaPure', type: 'safe', upfront: 9_000_000, win_bonus: 150_000, goal_bonus: 0, objective: null, obj_bonus: 0 },

    // Balanced sponsors (upfront sedang, bonus lumayan)
    { name: 'GoRide', type: 'balanced', upfront: 5_000_000, win_bonus: 500_000, goal_bonus: 100_000, objective: null, obj_bonus: 0 },
    { name: 'ShopeeMall', type: 'balanced', upfront: 4_000_000, win_bonus: 400_000, goal_bonus: 150_000, objective: null, obj_bonus: 0 },
    { name: 'SPPG', type: 'balanced', upfront: 6_000_000, win_bonus: 350_000, goal_bonus: 0, objective: null, obj_bonus: 0 },
    { name: 'BukaLapangan', type: 'balanced', upfront: 3_500_000, win_bonus: 600_000, goal_bonus: 80_000, objective: null, obj_bonus: 0 },

    // High-risk sponsors (upfront kecil, bonus RAKSASA kalau juara)
    { name: 'CryptoNusa', type: 'risky', upfront: 2_000_000, win_bonus: 200_000, goal_bonus: 0, objective: 'juara', obj_bonus: 30_000_000 },
    { name: 'MegaCorp Global', type: 'risky', upfront: 1_500_000, win_bonus: 100_000, goal_bonus: 0, objective: 'top3', obj_bonus: 18_000_000 },
    { name: 'Sawit Industri', type: 'risky', upfront: 1_000_000, win_bonus: 300_000, goal_bonus: 200_000, objective: 'juara', obj_bonus: 25_000_000 },
    { name: 'EliteWear', type: 'risky', upfront: 2_500_000, win_bonus: 0, goal_bonus: 0, objective: 'top3', obj_bonus: 20_000_000 },
];

// ─── Generate 3 Sponsor Options ──────────────────────────────────────────────
export function generateSponsorOffers(clubId) {
    const club = getClub(clubId);
    if (!club) return [];

    // Scale sponsors based on club reputation
    const repMod = 1 + (club.reputation - 50) * 0.02; // rep 80 → 1.6x, rep 50 → 1.0x

    // Pick one from each category
    const safe = shuffleArray(SPONSOR_POOL.filter(s => s.type === 'safe'))[0];
    const balanced = shuffleArray(SPONSOR_POOL.filter(s => s.type === 'balanced'))[0];
    const risky = shuffleArray(SPONSOR_POOL.filter(s => s.type === 'risky'))[0];

    return [safe, balanced, risky].map((s, idx) => ({
        ...s,
        upfront: Math.floor(s.upfront * repMod),
        win_bonus: Math.floor(s.win_bonus * repMod),
        goal_bonus: Math.floor(s.goal_bonus * repMod),
        obj_bonus: Math.floor(s.obj_bonus * repMod),
        idx: idx + 1,
    }));
}

// ─── Format Sponsor Offers ───────────────────────────────────────────────────
export function formatSponsorOffers(offers) {
    let msg = `🤝 *TAWARAN SPONSOR MUSIM INI*\n\nPilih salah satu sponsor dada:\n\n`;
    for (const o of offers) {
        const emoji = o.type === 'safe' ? '🟢' : o.type === 'balanced' ? '🟡' : '🔴';
        msg += `${o.idx}. ${emoji} *${o.name}* (${o.type.toUpperCase()})\n`;
        msg += `   💰 Upfront: ${formatMoney(o.upfront)}\n`;
        if (o.win_bonus) msg += `   🏆 Bonus Menang: +${formatMoney(o.win_bonus)}/match\n`;
        if (o.goal_bonus) msg += `   ⚽ Bonus Gol: +${formatMoney(o.goal_bonus)}/gol\n`;
        if (o.objective) {
            const objLabel = o.objective === 'juara' ? 'Juara Liga' : 'Finish Top 3';
            msg += `   🎯 Bonus Objektif (${objLabel}): +${formatMoney(o.obj_bonus)}\n`;
        }
        msg += '\n';
    }
    msg += `_Balas nomor pilihanmu (1-3)_`;
    return msg;
}

// ─── Activate Sponsor ────────────────────────────────────────────────────────
export function activateSponsor(clubId, sponsor) {
    // Deactivate old sponsors
    dbRun(`UPDATE sponsors SET is_active = 0 WHERE club_id = ?`, clubId);

    dbRun(`INSERT INTO sponsors (club_id, name, type, upfront, win_bonus, goal_bonus, objective, obj_bonus, is_active) VALUES (?,?,?,?,?,?,?,?,1)`,
        clubId, sponsor.name, sponsor.type, sponsor.upfront, sponsor.win_bonus, sponsor.goal_bonus, sponsor.objective || null, sponsor.obj_bonus);

    // Pay upfront immediately
    dbRun(`UPDATE clubs SET balance = balance + ? WHERE id = ?`, sponsor.upfront, clubId);
    dbRun(`INSERT INTO finance_log (club_id, type, amount, description) VALUES (?, 'revenue', ?, ?)`,
        clubId, sponsor.upfront, `Sponsor ${sponsor.name} — Upfront`);

    return `✅ *Sponsor ${sponsor.name} Aktif!*\n\n💰 Upfront ${formatMoney(sponsor.upfront)} sudah masuk ke kas klub!`;
}

// ─── Process Win Bonus (dipanggil setelah match) ─────────────────────────────
export function processSponsorWinBonus(clubId, goalsScored) {
    const sponsor = dbGet(`SELECT * FROM sponsors WHERE club_id = ? AND is_active = 1`, clubId);
    if (!sponsor) return 0;

    let totalBonus = 0;

    // Win bonus
    if (sponsor.win_bonus > 0) {
        totalBonus += sponsor.win_bonus;
    }

    // Goal bonus
    if (sponsor.goal_bonus > 0 && goalsScored > 0) {
        totalBonus += sponsor.goal_bonus * goalsScored;
    }

    if (totalBonus > 0) {
        dbRun(`UPDATE clubs SET balance = balance + ? WHERE id = ?`, totalBonus, clubId);
        dbRun(`INSERT INTO finance_log (club_id, type, amount, description) VALUES (?, 'revenue', ?, ?)`,
            clubId, totalBonus, `Bonus Sponsor ${sponsor.name}`);
    }

    return totalBonus;
}

// ─── Process End-of-Season Objective ─────────────────────────────────────────
export function processSponsorObjective(clubId, finalPosition) {
    const sponsor = dbGet(`SELECT * FROM sponsors WHERE club_id = ? AND is_active = 1`, clubId);
    if (!sponsor || !sponsor.objective) return { bonus: 0, met: false };

    let met = false;
    if (sponsor.objective === 'juara' && finalPosition === 1) met = true;
    if (sponsor.objective === 'top3' && finalPosition <= 3) met = true;

    if (met && sponsor.obj_bonus > 0) {
        dbRun(`UPDATE clubs SET balance = balance + ? WHERE id = ?`, sponsor.obj_bonus, clubId);
        dbRun(`INSERT INTO finance_log (club_id, type, amount, description) VALUES (?, 'revenue', ?, ?)`,
            clubId, sponsor.obj_bonus, `🎯 Bonus Objektif Sponsor ${sponsor.name} TERCAPAI!`);
        return { bonus: sponsor.obj_bonus, met: true, sponsorName: sponsor.name };
    }

    return { bonus: 0, met: false, sponsorName: sponsor.name };
}

// ─── Get Active Sponsor ──────────────────────────────────────────────────────
export function getActiveSponsor(clubId) {
    return dbGet(`SELECT * FROM sponsors WHERE club_id = ? AND is_active = 1`, clubId);
}

// ─── Format Active Sponsor ───────────────────────────────────────────────────
export function formatActiveSponsor(clubId) {
    const s = getActiveSponsor(clubId);
    if (!s) return '❌ Belum ada sponsor aktif. Sponsor akan ditawarkan di awal musim.';

    const emoji = s.type === 'safe' ? '🟢' : s.type === 'balanced' ? '🟡' : '🔴';
    let msg = `🤝 *SPONSOR AKTIF*\n\n`;
    msg += `${emoji} *${s.name}* (${s.type.toUpperCase()})\n`;
    msg += `💰 Upfront: ${formatMoney(s.upfront)}\n`;
    if (s.win_bonus) msg += `🏆 Bonus Menang: +${formatMoney(s.win_bonus)}/match\n`;
    if (s.goal_bonus) msg += `⚽ Bonus Gol: +${formatMoney(s.goal_bonus)}/gol\n`;
    if (s.objective) {
        const objLabel = s.objective === 'juara' ? 'Juara Liga' : 'Finish Top 3';
        msg += `🎯 Objektif: ${objLabel} → +${formatMoney(s.obj_bonus)}\n`;
    }
    return msg;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
