// src/engine/staff.js — Backroom Staff System
// Physio, Assistant Manager, Specialist Coaches

import { dbGet, dbAll, dbRun, getClub } from '../db/database.js';
import { formatMoney } from './transfer.js';

// ─── Staff Templates ─────────────────────────────────────────────────────────
const STAFF_POOL = {
    physio: [
        { name: 'Dr. Agus Salim', rating: 50, wage: 8_000 },
        { name: 'Dr. Rina Hartati', rating: 65, wage: 15_000 },
        { name: 'Dr. Carlos Ferreira', rating: 80, wage: 30_000 },
        { name: 'Dr. Hans Müller', rating: 90, wage: 50_000 },
    ],
    assistant: [
        { name: 'Budi Cahyono', rating: 50, wage: 10_000 },
        { name: 'Rizky Hidayat', rating: 65, wage: 20_000 },
        { name: 'Luis Enríquez', rating: 80, wage: 35_000 },
        { name: 'Marco Bianchi', rating: 90, wage: 55_000 },
    ],
    coach_attack: [
        { name: 'Dedi Supriadi', rating: 50, wage: 8_000 },
        { name: 'Paulo Mendes', rating: 65, wage: 18_000 },
        { name: 'Jean-Pierre Blanc', rating: 80, wage: 32_000 },
        { name: 'Alessandro Rossi', rating: 90, wage: 48_000 },
    ],
    coach_defense: [
        { name: 'Tono Suryadi', rating: 50, wage: 8_000 },
        { name: 'Diego Ramírez', rating: 65, wage: 18_000 },
        { name: 'Fabio Cannavese', rating: 80, wage: 32_000 },
        { name: 'Jürgen Kessler', rating: 90, wage: 48_000 },
    ],
    coach_fitness: [
        { name: 'Iwan Setiawan', rating: 50, wage: 7_000 },
        { name: 'Maria Santos', rating: 65, wage: 14_000 },
        { name: 'Pierre Duval', rating: 80, wage: 28_000 },
        { name: 'Kenji Tanaka', rating: 90, wage: 45_000 },
    ],
};

const ROLE_LABELS = {
    physio: '🏥 Kepala Medis',
    assistant: '📋 Asisten Manajer',
    coach_attack: '⚔️ Pelatih Menyerang',
    coach_defense: '🛡️ Pelatih Bertahan',
    coach_fitness: '🏃 Pelatih Kebugaran',
};

// ─── Get Current Staff ───────────────────────────────────────────────────────
export function getClubStaff(clubId) {
    return dbAll(`SELECT * FROM backroom_staff WHERE club_id = ?`, clubId);
}

// ─── Generate Hire Options ───────────────────────────────────────────────────
export function getHireOptions(clubId, role) {
    const club = getClub(clubId);
    if (!club) return [];
    const pool = STAFF_POOL[role];
    if (!pool) return [];

    // Filter berdasarkan reputasi klub — klub kecil tidak bisa hire staf top-tier
    const maxRating = Math.min(100, club.reputation + 15);
    return pool.filter(s => s.rating <= maxRating);
}

// ─── Hire Staff ──────────────────────────────────────────────────────────────
export function hireStaff(clubId, role, staffIndex) {
    const club = getClub(clubId);
    if (!club) return { ok: false, msg: '❌ Klub tidak ditemukan.' };

    const options = getHireOptions(clubId, role);
    if (staffIndex < 0 || staffIndex >= options.length) return { ok: false, msg: '❌ Staf tidak valid.' };

    const staff = options[staffIndex];

    // Cek apakah sudah punya staf peran ini
    const existing = dbGet(`SELECT * FROM backroom_staff WHERE club_id = ? AND role = ?`, clubId, role);
    if (existing) {
        // Fire old staff
        dbRun(`DELETE FROM backroom_staff WHERE id = ?`, existing.id);
    }

    // Cek budget gaji
    if (club.wage_budget < staff.wage) {
        return { ok: false, msg: `❌ Budget gaji tidak cukup! Butuh ${formatMoney(staff.wage)}/mgg.` };
    }

    dbRun(`INSERT INTO backroom_staff (club_id, name, role, rating, wage) VALUES (?,?,?,?,?)`,
        clubId, staff.name, role, staff.rating, staff.wage);

    dbRun(`UPDATE clubs SET wage_budget = wage_budget - ? WHERE id = ?`, staff.wage, clubId);

    const label = ROLE_LABELS[role] || role;
    return {
        ok: true,
        msg: `✅ *${staff.name}* berhasil direkrut sebagai ${label}!\n⭐ Rating: ${staff.rating}/100\n💵 Gaji: ${formatMoney(staff.wage)}/mgg`,
    };
}

// ─── Fire Staff ──────────────────────────────────────────────────────────────
export function fireStaff(clubId, role) {
    const existing = dbGet(`SELECT * FROM backroom_staff WHERE club_id = ? AND role = ?`, clubId, role);
    if (!existing) return { ok: false, msg: '❌ Kamu tidak punya staf di posisi ini.' };

    dbRun(`DELETE FROM backroom_staff WHERE id = ?`, existing.id);
    dbRun(`UPDATE clubs SET wage_budget = wage_budget + ? WHERE id = ?`, existing.wage, clubId);

    return { ok: true, msg: `🔴 *${existing.name}* dipecat. Wage budget +${formatMoney(existing.wage)}/mgg.` };
}

// ─── Get Staff Effect Modifiers ──────────────────────────────────────────────
export function getStaffModifiers(clubId) {
    const staff = getClubStaff(clubId);
    const mods = {
        injuryReduction: 0,       // Physio: mengurangi peluang cedera
        recoveryBoost: 0,         // Physio: mempercepat recovery
        tacticalBoost: 0,         // Assistant: boost tactical familiarity gain
        attackBoost: 0,           // Coach Attack: boost serangan di match
        defenseBoost: 0,          // Coach Defense: boost pertahanan di match
        fatigueReduction: 0,      // Coach Fitness: mengurangi fatigue per match
    };

    for (const s of staff) {
        const r = s.rating / 100; // 0.0 - 1.0

        switch (s.role) {
            case 'physio':
                mods.injuryReduction = r * 0.4;   // max 40% injury reduction
                mods.recoveryBoost = r * 0.3;     // max 30% faster recovery
                break;
            case 'assistant':
                mods.tacticalBoost = r * 0.5;     // max 50% faster familiarity gain
                break;
            case 'coach_attack':
                mods.attackBoost = r * 0.12;      // max 12% attack boost
                break;
            case 'coach_defense':
                mods.defenseBoost = r * 0.12;     // max 12% defense boost
                break;
            case 'coach_fitness':
                mods.fatigueReduction = r * 0.3;  // max 30% fatigue reduction
                break;
        }
    }

    return mods;
}

// ─── Format Staff Report ─────────────────────────────────────────────────────
export function formatStaffReport(clubId) {
    const staff = getClubStaff(clubId);
    const allRoles = Object.keys(ROLE_LABELS);

    let msg = `👥 *BACKROOM STAFF*\n${'─'.repeat(30)}\n\n`;

    if (staff.length === 0) {
        msg += `Belum ada staf. Ketik *!rekrutstaf* untuk merekrut.\n\n`;
    }

    for (const role of allRoles) {
        const label = ROLE_LABELS[role];
        const s = staff.find(st => st.role === role);
        if (s) {
            msg += `${label}\n  👤 *${s.name}* ⭐${s.rating} | 💵${formatMoney(s.wage)}/mgg\n\n`;
        } else {
            msg += `${label}\n  _Kosong — ketik !rekrutstaf ${role}_\n\n`;
        }
    }

    const mods = getStaffModifiers(clubId);
    msg += `📊 *Efek Staf:*\n`;
    if (mods.injuryReduction > 0) msg += `  🏥 Cedera -${Math.round(mods.injuryReduction * 100)}%\n`;
    if (mods.recoveryBoost > 0) msg += `  💪 Recovery +${Math.round(mods.recoveryBoost * 100)}%\n`;
    if (mods.tacticalBoost > 0) msg += `  📋 Taktik +${Math.round(mods.tacticalBoost * 100)}%\n`;
    if (mods.attackBoost > 0) msg += `  ⚔️ Serangan +${Math.round(mods.attackBoost * 100)}%\n`;
    if (mods.defenseBoost > 0) msg += `  🛡️ Pertahanan +${Math.round(mods.defenseBoost * 100)}%\n`;
    if (mods.fatigueReduction > 0) msg += `  🏃 Fatigue -${Math.round(mods.fatigueReduction * 100)}%\n`;

    return msg;
}

// ─── Format Hire Menu ────────────────────────────────────────────────────────
export function formatHireMenu(clubId, role) {
    const label = ROLE_LABELS[role];
    if (!label) return '❌ Peran tidak valid. Pilihan: physio, assistant, coach_attack, coach_defense, coach_fitness';

    const options = getHireOptions(clubId, role);
    if (options.length === 0) return `❌ Tidak ada kandidat ${label} tersedia untuk level klubmu saat ini.`;

    let msg = `${label} — *KANDIDAT*\n\n`;
    options.forEach((s, i) => {
        const stars = s.rating >= 80 ? '🌟' : s.rating >= 65 ? '⭐' : '👤';
        msg += `${i + 1}. ${stars} *${s.name}*\n   Rating: ${s.rating}/100 | Gaji: ${formatMoney(s.wage)}/mgg\n\n`;
    });
    msg += `_Balas nomor untuk merekrut_`;
    return msg;
}

// ─── Weekly Staff Wages ──────────────────────────────────────────────────────
export function processStaffWages(clubId) {
    const staff = getClubStaff(clubId);
    const total = staff.reduce((s, st) => s + (st.wage || 0), 0);
    if (total > 0) {
        dbRun(`UPDATE clubs SET balance = balance - ? WHERE id = ?`, total, clubId);
        dbRun(`INSERT INTO finance_log (club_id, type, amount, description) VALUES (?, 'expense', ?, 'Gaji backroom staff')`,
            clubId, total);
    }
    return total;
}
