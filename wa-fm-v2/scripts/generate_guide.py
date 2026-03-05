# scripts/generate_guide.py — Generate Game Guide PDF using ReportLab
# Panduan lengkap Football Manager WhatsApp

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

OUTPUT = os.path.join(os.path.dirname(__file__), '..', 'docs', 'Game_Guide_WA_FM.pdf')
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

# ─── Colors ────────────────────────────────────────────────────────────────────
PRIMARY    = HexColor('#1a1a2e')
ACCENT     = HexColor('#e94560')
ACCENT2    = HexColor('#0f3460')
GOLD       = HexColor('#f5a623')
BG_LIGHT   = HexColor('#f0f0f5')
BG_TABLE   = HexColor('#16213e')
TEXT_WHITE = white
TEXT_DARK  = HexColor('#222222')
GREEN      = HexColor('#27ae60')
BLUE       = HexColor('#2980b9')
RED        = HexColor('#c0392b')
ORANGE     = HexColor('#e67e22')


def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        rightMargin=18*mm, leftMargin=18*mm,
        topMargin=15*mm, bottomMargin=15*mm,
        title='WA Football Manager — Panduan Lengkap',
        author='FM Bot Team',
    )

    styles = getSampleStyleSheet()

    # ─── Custom Styles ─────────────────────────────────────────────────────
    title_style = ParagraphStyle('TitleCustom', parent=styles['Title'],
        fontSize=28, leading=34, textColor=ACCENT, alignment=TA_CENTER,
        spaceAfter=6*mm, fontName='Helvetica-Bold')

    subtitle_style = ParagraphStyle('SubtitleCustom', parent=styles['Normal'],
        fontSize=13, leading=17, textColor=ACCENT2, alignment=TA_CENTER,
        spaceAfter=10*mm, fontName='Helvetica-Oblique')

    h1 = ParagraphStyle('H1Custom', parent=styles['Heading1'],
        fontSize=20, leading=26, textColor=ACCENT, spaceBefore=8*mm,
        spaceAfter=4*mm, fontName='Helvetica-Bold',
        borderWidth=0, borderPadding=0)

    h2 = ParagraphStyle('H2Custom', parent=styles['Heading2'],
        fontSize=15, leading=20, textColor=ACCENT2, spaceBefore=5*mm,
        spaceAfter=3*mm, fontName='Helvetica-Bold')

    h3 = ParagraphStyle('H3Custom', parent=styles['Heading3'],
        fontSize=12, leading=16, textColor=HexColor('#333'), spaceBefore=3*mm,
        spaceAfter=2*mm, fontName='Helvetica-Bold')

    body = ParagraphStyle('BodyCustom', parent=styles['Normal'],
        fontSize=10, leading=15, textColor=TEXT_DARK, alignment=TA_JUSTIFY,
        spaceAfter=2*mm, fontName='Helvetica')

    cmd_style = ParagraphStyle('CmdStyle', parent=styles['Code'],
        fontSize=9.5, leading=13, textColor=HexColor('#0d47a1'),
        backColor=HexColor('#e3f2fd'), borderWidth=0.5,
        borderColor=HexColor('#90caf9'), borderPadding=4,
        fontName='Courier', spaceAfter=1.5*mm)

    tip_style = ParagraphStyle('TipStyle', parent=body,
        fontSize=9.5, leading=14, textColor=HexColor('#1b5e20'),
        backColor=HexColor('#e8f5e9'), borderWidth=0.5,
        borderColor=GREEN, borderPadding=6, spaceAfter=3*mm)

    warn_style = ParagraphStyle('WarnStyle', parent=body,
        fontSize=9.5, leading=14, textColor=HexColor('#e65100'),
        backColor=HexColor('#fff3e0'), borderWidth=0.5,
        borderColor=ORANGE, borderPadding=6, spaceAfter=3*mm)

    bullet = ParagraphStyle('BulletCustom', parent=body,
        fontSize=10, leading=14, leftIndent=12, bulletIndent=0,
        spaceAfter=1*mm, fontName='Helvetica')

    # ─── Helper Functions ──────────────────────────────────────────────────
    def hr():
        return HRFlowable(width='100%', thickness=0.5, color=HexColor('#cccccc'),
                          spaceBefore=3*mm, spaceAfter=3*mm)

    def cmd_table(rows, col_widths=None):
        """Create a styled command table"""
        if not col_widths:
            col_widths = [45*mm, 110*mm]
        t = Table(rows, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), BG_TABLE),
            ('TEXTCOLOR', (0, 0), (-1, 0), TEXT_WHITE),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTNAME', (0, 1), (0, -1), 'Courier'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('BACKGROUND', (0, 1), (-1, -1), BG_LIGHT),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, BG_LIGHT]),
            ('GRID', (0, 0), (-1, -1), 0.4, HexColor('#cccccc')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ]))
        return t

    def info_table(rows, col_widths=None):
        """Create a styled info/data table"""
        if not col_widths:
            col_widths = [50*mm, 50*mm, 55*mm]
        t = Table(rows, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), ACCENT2),
            ('TEXTCOLOR', (0, 0), (-1, 0), TEXT_WHITE),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('BACKGROUND', (0, 1), (-1, -1), white),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f5f7fa')]),
            ('GRID', (0, 0), (-1, -1), 0.3, HexColor('#dddddd')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ]))
        return t

    # ─── Build Elements ────────────────────────────────────────────────────
    elements = []

    # ═══════════════════════════════════════════════════════════════════════
    # COVER PAGE
    # ═══════════════════════════════════════════════════════════════════════
    elements.append(Spacer(1, 40*mm))
    elements.append(Paragraph('⚽ FOOTBALL MANAGER', title_style))
    elements.append(Paragraph('WhatsApp Edition', ParagraphStyle('Sub', parent=title_style,
        fontSize=22, textColor=ACCENT2, spaceAfter=4*mm)))
    elements.append(Paragraph('— Next-Level Edition —', subtitle_style))
    elements.append(hr())
    elements.append(Paragraph(
        'Panduan lengkap untuk menjadi manajer terbaik.<br/>'
        'Kelola klub, beli pemain, atur taktik, dan raih gelar juara — '
        'semua dari chat WhatsApp!',
        ParagraphStyle('CoverBody', parent=body, fontSize=12, leading=18,
                       alignment=TA_CENTER, textColor=HexColor('#555555'))
    ))
    elements.append(Spacer(1, 15*mm))
    elements.append(Paragraph(
        'Fitur: Liga Nyata (EPL + La Liga) • Match Engine Interaktif • Transfer & Negosiasi<br/>'
        'Scouting & Youth Academy • Sponsorship • Backroom Staff • Derby & Rivalitas<br/>'
        'Player Personalities • Piala Domestik • Manager Career',
        ParagraphStyle('Features', parent=body, fontSize=10, leading=15,
                       alignment=TA_CENTER, textColor=ACCENT2)
    ))
    elements.append(Spacer(1, 30*mm))
    elements.append(Paragraph('v2.0 — Next-Level Edition', ParagraphStyle('Ver', parent=body,
        fontSize=9, alignment=TA_CENTER, textColor=HexColor('#999999'))))
    elements.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # TABLE OF CONTENTS
    # ═══════════════════════════════════════════════════════════════════════
    elements.append(Paragraph('DAFTAR ISI', h1))
    elements.append(hr())
    toc_items = [
        '1. Memulai Permainan',
        '2. Mengelola Tim & Skuad',
        '3. Sistem Pertandingan (Match Engine)',
        '4. Transfer & Pasar Pemain',
        '5. Scouting & Youth Academy',
        '6. Taktik & Formasi',
        '7. Keuangan & Sponsorship',
        '8. Backroom Staff',
        '9. Derby & Rivalitas',
        '10. Kepribadian & Gaya Bermain Pemain',
        '11. Piala Domestik',
        '12. Karir Manajer',
        '13. Daftar Semua Command',
    ]
    for item in toc_items:
        elements.append(Paragraph(item, ParagraphStyle('TOC', parent=body,
            fontSize=11, leading=18, leftIndent=10*mm, fontName='Helvetica')))
    elements.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════
    # 1. MEMULAI PERMAINAN
    # ═══════════════════════════════════════════════════════════════════════
    elements.append(Paragraph('1. Memulai Permainan', h1))
    elements.append(hr())

    elements.append(Paragraph('Langkah Pertama', h2))
    elements.append(Paragraph(
        'Football Manager WhatsApp adalah game manajemen sepak bola yang dimainkan '
        'sepenuhnya melalui chat WhatsApp. Kamu menjadi manajer sebuah klub, mengatur '
        'taktik, membeli pemain, dan memimpin tim ke puncak klasemen!', body))

    elements.append(Paragraph('Cara Memulai:', h3))
    steps = [
        '<b>!buatliga</b> — Buat liga baru dengan 18 klub Indonesia (jika belum ada liga)',
        '<b>!daftar</b> — Pilih klub yang ingin kamu kelola',
        '<b>!mulai</b> — Mulai musim liga (setelah minimal 1 user mendaftar)',
        '<b>!main</b> — Mainkan pertandingan matchday pertama!',
    ]
    for i, step in enumerate(steps, 1):
        elements.append(Paragraph(f'{i}. {step}', bullet))

    elements.append(Spacer(1, 3*mm))
    elements.append(Paragraph(
        '💡 TIP: Setelah memilih tim, cek skuadmu dengan !timku dan !pemain. '
        'Kenali kekuatan dan kelemahan timmu sebelum mulai bermain!', tip_style))

    # ═══════════════════════════════════════════════════════════════════════
    # 2. MENGELOLA TIM
    # ═══════════════════════════════════════════════════════════════════════
    elements.append(Paragraph('2. Mengelola Tim & Skuad', h1))
    elements.append(hr())

    elements.append(Paragraph(
        'Sebagai manajer, kamu bertanggung jawab atas semua aspek klubmu. '
        'Dari melihat kondisi pemain hingga mengatur kapten tim.', body))

    elements.append(cmd_table([
        ['Command', 'Fungsi'],
        ['!timku', 'Lihat profil lengkap klubmu (reputasi, budget, formasi)'],
        ['!pemain', 'Daftar semua pemain dengan overall, posisi, dan kondisi'],
        ['!pemaindetail [nama]', 'Detail pemain: kepribadian, gaya bermain, statistik'],
        ['!cedera', 'Lihat pemain yang sedang cedera dan estimasi pemulihan'],
        ['!kontrak', 'Daftar kontrak pemain yang akan habis'],
        ['!fitness', 'Laporan kebugaran seluruh skuad'],
        ['!rotasi', 'Saran rotasi pemain berdasarkan fatigue'],
        ['!kapten', 'Assign kapten tim (otomatis pilih pemain terbaik)'],
        ['!harmony', 'Laporan harmoni dan chemistry skuad'],
    ]))

    elements.append(Spacer(1, 3*mm))
    elements.append(Paragraph(
        '⚠️ PERHATIAN: Pemain yang kelelahan (fatigue tinggi) akan bermain buruk! '
        'Gunakan !fitness dan !rotasi secara rutin untuk menjaga performa skuad.', warn_style))

    # ═══════════════════════════════════════════════════════════════════════
    # 3. MATCH ENGINE
    # ═══════════════════════════════════════════════════════════════════════
    elements.append(PageBreak())
    elements.append(Paragraph('3. Sistem Pertandingan', h1))
    elements.append(hr())

    elements.append(Paragraph(
        'Match Engine menggunakan sistem <b>Markov Chain</b> yang mensimulasikan '
        'pertandingan secara real-time. Kamu akan diminta membuat keputusan penting '
        'di momen-momen krusial!', body))

    elements.append(Paragraph('Alur Pertandingan:', h2))
    flow_steps = [
        '<b>Pre-Match Press Conference</b> — Jawab pertanyaan wartawan (mempengaruhi morale)',
        '<b>Babak 1 (0-45 menit)</b> — Simulasi berjalan, event muncul secara acak',
        '<b>Decision Points</b> — Bot bertanya saat momen krusial (cedera, kartu merah, dll)',
        '<b>Halftime Team Talk</b> — Berikan motivasi atau kritik ke pemain',
        '<b>Babak 2 (45-90 menit)</b> — Simulasi lanjut dengan perubahan taktik',
        '<b>Post-Match Interview</b> — Respons setelah pertandingan',
    ]
    for i, step in enumerate(flow_steps, 1):
        elements.append(Paragraph(f'{i}. {step}', bullet))

    elements.append(Paragraph('Decision Points (Momen Keputusan):', h2))
    elements.append(info_table([
        ['Situasi', 'Waktu', 'Pilihan'],
        ['Cedera Pemain', 'Kapan saja', 'Ganti pemain atau lanjutkan'],
        ['Kartu Merah', 'Menit 20+', 'Ubah taktik (defensive/balanced/attacking)'],
        ['Tertinggal Jauh', 'Menit 70+', 'All-out attack / ganti pemain / motivasi'],
        ['Unggul Tipis', 'Menit 80+', 'Bertahan / terus serang / buang waktu'],
        ['Momen Terakhir', 'Menit 85+', 'Kirim semua ke depan / normal / kiper maju'],
        ['Halftime', 'Menit 45', 'Motivasi / kritik / analisis / substitusi'],
    ]))

    elements.append(Spacer(1, 3*mm))
    elements.append(Paragraph(
        '💡 TIP: Keputusanmu di Decision Points langsung mempengaruhi hasil! '
        'Memilih "All-out attack" saat tertinggal bisa membalik skor, tapi '
        'juga berisiko kebobolan lebih banyak.', tip_style))

    # ═══════════════════════════════════════════════════════════════════════
    # 4. TRANSFER
    # ═══════════════════════════════════════════════════════════════════════
    elements.append(PageBreak())
    elements.append(Paragraph('4. Transfer & Pasar Pemain', h1))
    elements.append(hr())

    elements.append(Paragraph(
        'Sistem transfer memungkinkanmu membeli, menjual, dan meminjamkan pemain. '
        'Negosiasi berjalan otomatis berdasarkan nilai pasar dan budget klub.', body))

    elements.append(cmd_table([
        ['Command', 'Fungsi'],
        ['!cari [nama/posisi]', 'Cari pemain di pasar transfer'],
        ['!beli [nama] [harga]', 'Tawar pemain (contoh: !beli Messi 50M)'],
        ['!jual [nama]', 'Jual pemain ke klub AI dengan harga pasar'],
        ['!pinjam [nama]', 'Pinjamkan pemain ke klub lain (6 bulan)'],
        ['!freeagent', 'Lihat daftar pemain bebas transfer'],
    ]))

    elements.append(Paragraph('Mekanisme Negosiasi:', h2))
    nego_items = [
        'Tawaran ≥90% nilai pasar → <font color="#27ae60"><b>DITERIMA</b></font>',
        'Tawaran 70-90% nilai pasar → <font color="#e67e22"><b>COUNTER OFFER</b></font> (mereka minta lebih)',
        'Tawaran <70% nilai pasar → <font color="#c0392b"><b>DITOLAK KERAS</b></font>',
        'Jika pemain punya <b>Release Clause</b>, bayar di atas klausul = otomatis diterima',
    ]
    for item in nego_items:
        elements.append(Paragraph(f'• {item}', bullet))

    elements.append(Spacer(1, 2*mm))
    elements.append(Paragraph(
        '💡 TIP: Scout pemain terlebih dahulu (!scout [nama]) untuk mengetahui '
        'Potential Ability (PA) mereka sebelum membeli. Jangan beli kucing dalam karung!', tip_style))

    # ═══════════════════════════════════════════════════════════════════════
    # 5. SCOUTING & YOUTH
    # ═══════════════════════════════════════════════════════════════════════
    elements.append(Paragraph('5. Scouting & Youth Academy', h1))
    elements.append(hr())

    elements.append(Paragraph(
        'Kirim scout ke berbagai wilayah untuk menemukan bakat tersembunyi, '
        'atau scout pemain spesifik untuk mengetahui potensi mereka.', body))

    elements.append(cmd_table([
        ['Command', 'Fungsi'],
        ['!scout', 'Lihat menu scouting dan wilayah tersedia'],
        ['!scout [nama]', 'Scout pemain spesifik (gratis, 2-3 MD)'],
        ['!scout region [n]', 'Kirim scout ke wilayah (berbayar)'],
        ['!laporanscout', 'Lihat hasil laporan scout'],
        ['!scoutedpemain', 'Shortlist pemain yang sudah di-scout'],
        ['!youth', 'Lihat Youth Academy (pemain muda akademi)'],
        ['!promosi [n]', 'Promosikan pemain muda ke first team'],
    ]))

    elements.append(Paragraph('Wilayah Scouting:', h2))
    elements.append(info_table([
        ['Wilayah', 'Biaya', 'Kualitas'],
        ['Premier League', '50K', '⭐⭐⭐⭐⭐ (85)'],
        ['La Liga', '45K', '⭐⭐⭐⭐ (82)'],
        ['Serie A', '40K', '⭐⭐⭐⭐ (80)'],
        ['Bundesliga', '40K', '⭐⭐⭐⭐ (79)'],
        ['Liga 1 Indonesia', '15K', '⭐⭐⭐ (60)'],
        ['Amerika Selatan', '35K', '⭐⭐⭐⭐ (75)'],
        ['Afrika', '20K', '⭐⭐⭐ (65)'],
    ]))

    # ═══════════════════════════════════════════════════════════════════════
    # 6. TAKTIK & FORMASI
    # ═══════════════════════════════════════════════════════════════════════
    elements.append(PageBreak())
    elements.append(Paragraph('6. Taktik & Formasi', h1))
    elements.append(hr())

    elements.append(Paragraph(
        'Atur formasi dan gaya bermain timmu. Semakin sering menggunakan formasi, '
        'semakin tinggi <b>Tactical Familiarity</b> yang meningkatkan performa tim.', body))

    elements.append(cmd_table([
        ['Command', 'Fungsi'],
        ['!formasi [formasi]', 'Ganti formasi (contoh: !formasi 4-4-2)'],
        ['!style [gaya]', 'Ganti gaya bermain'],
        ['!taktikinfo', 'Lihat info taktik saat ini + familiarity'],
        ['!setpiece', 'Atur spesialis set piece (penalti, free kick, corner)'],
        ['!role [nama] [role]', 'Assign role khusus ke pemain'],
    ]))

    elements.append(Paragraph('Gaya Bermain:', h2))
    elements.append(info_table([
        ['Gaya', 'Serangan', 'Pertahanan'],
        ['Attacking', '+20%', '-15%'],
        ['Pressing', '+15%', '-10%'],
        ['Balanced', 'Normal', 'Normal'],
        ['Counter', '-15%', '+20%'],
        ['Defensive', '-25%', '+30%'],
    ]))

    # ═══════════════════════════════════════════════════════════════════════
    # 7. KEUANGAN & SPONSORSHIP
    # ═══════════════════════════════════════════════════════════════════════
    elements.append(Paragraph('7. Keuangan & Sponsorship', h1))
    elements.append(hr())

    elements.append(Paragraph(
        'Kelola keuangan klub dengan bijak. Pendapatan berasal dari tiket, '
        'TV rights, merchandise, dan sponsor. Pengeluaran utama adalah gaji pemain dan staf.', body))

    elements.append(cmd_table([
        ['Command', 'Fungsi'],
        ['!keuangan', 'Ringkasan keuangan (saldo, budget, gaji)'],
        ['!keuangandetail', 'Keuangan detail + riwayat transaksi'],
        ['!upgrade [tipe]', 'Upgrade fasilitas (stadium/academy/training)'],
        ['!sponsor', 'Lihat/pilih sponsor musim ini'],
    ]))

    elements.append(Paragraph('Sistem Sponsorship (BARU!):', h2))
    elements.append(Paragraph(
        'Setiap awal musim, kamu ditawarkan 3 sponsor dengan profil risiko berbeda:', body))

    elements.append(info_table([
        ['Tipe', 'Upfront', 'Potensi Bonus'],
        ['🟢 Safe', 'Tinggi (9-12M)', 'Bonus kecil per menang'],
        ['🟡 Balanced', 'Sedang (3-6M)', 'Bonus menang + gol lumayan'],
        ['🔴 Risky', 'Rendah (1-2.5M)', 'Bonus RAKSASA jika juara/top 3'],
    ]))

    elements.append(Spacer(1, 2*mm))
    elements.append(Paragraph(
        '⚠️ PERHATIAN: Financial Fair Play (FFP) berlaku! Jika saldo negatif '
        'melebihi -50M, klubmu akan dikenai pengurangan 3 poin dan fanbase trust turun.', warn_style))

    # ═══════════════════════════════════════════════════════════════════════
    # 8. BACKROOM STAFF
    # ═══════════════════════════════════════════════════════════════════════
    elements.append(PageBreak())
    elements.append(Paragraph('8. Backroom Staff (BARU!)', h1))
    elements.append(hr())

    elements.append(Paragraph(
        'Rekrut staf kepelatihan untuk meningkatkan performa timmu. '
        'Setiap role memiliki efek langsung pada pertandingan dan pelatihan.', body))

    elements.append(cmd_table([
        ['Command', 'Fungsi'],
        ['!staf', 'Lihat semua backroom staff saat ini'],
        ['!rekrutstaf [role]', 'Rekrut staf baru (lihat daftar role di bawah)'],
    ]))

    elements.append(Paragraph('Daftar Role Staf:', h2))
    elements.append(info_table([
        ['Role', 'Efek Maksimal', 'Command'],
        ['🏥 Physio', 'Cedera -40%, Recovery +30%', '!rekrutstaf physio'],
        ['📋 Asisten Manajer', 'Taktik familiarity +50%', '!rekrutstaf assistant'],
        ['⚔️ Pelatih Menyerang', 'Serangan +12%', '!rekrutstaf coach_attack'],
        ['🛡️ Pelatih Bertahan', 'Pertahanan +12%', '!rekrutstaf coach_defense'],
        ['🏃 Pelatih Kebugaran', 'Fatigue -30%', '!rekrutstaf coach_fitness'],
    ]))

    elements.append(Spacer(1, 2*mm))
    elements.append(Paragraph(
        '💡 TIP: Staf rating tinggi memiliki gaji mahal tapi efeknya sangat terasa. '
        'Physio berkualitas tinggi bisa mengurangi cedera hingga 40%! '
        'Klub dengan reputasi rendah tidak bisa merekrut staf top-tier.', tip_style))

    # ═══════════════════════════════════════════════════════════════════════
    # 9. DERBY & RIVALITAS
    # ═══════════════════════════════════════════════════════════════════════
    elements.append(Paragraph('9. Derby & Rivalitas (BARU!)', h1))
    elements.append(hr())

    elements.append(Paragraph(
        'Pertandingan melawan rival tradisional memiliki intensitas yang lebih tinggi! '
        'Kartu kuning/merah 2x lebih sering dan pemain bermain dengan energi ekstra.', body))

    elements.append(Paragraph('!derby — Lihat daftar rivalitas', cmd_style))

    elements.append(Paragraph('Efek Derby Match:', h2))
    derby_effects = [
        'Probabilitas kartu kuning & merah meningkat hingga <b>2x lipat</b>',
        'Energi pemain meningkat <b>+5%</b> (mengabaikan sebagian fatigue)',
        'Atmosfer memanas — permainan lebih intens dan dramatis',
        'Fanbase trust turun drastis jika kalah di laga derby',
    ]
    for item in derby_effects:
        elements.append(Paragraph(f'• {item}', bullet))

    # ═══════════════════════════════════════════════════════════════════════
    # 10. KEPRIBADIAN PEMAIN
    # ═══════════════════════════════════════════════════════════════════════
    elements.append(Paragraph('10. Kepribadian & Gaya Bermain (BARU!)', h1))
    elements.append(hr())

    elements.append(Paragraph(
        'Setiap pemain memiliki kepribadian unik dan gaya bermain yang mempengaruhi '
        'perilaku mereka di lapangan dan di luar lapangan.', body))

    elements.append(Paragraph('!pemaindetail [nama] — Lihat detail pemain', cmd_style))

    elements.append(Paragraph('Kepribadian:', h2))
    elements.append(info_table([
        ['Kepribadian', 'Emoji', 'Efek'],
        ['Leader', '👑', 'Meningkatkan morale skuad saat jadi kapten'],
        ['Ambitious', '🔥', 'Minta dijual jika klub gagal berprestasi'],
        ['Loyal', '💙', 'Jarang minta pindah, loyal kepada klub'],
        ['Mercenary', '💰', 'Selalu mengejar gaji tertinggi'],
        ['Troublemaker', '⚡', 'Bisa memicu drama ruang ganti'],
        ['Professional', '📋', 'Konsisten, jarang bermasalah'],
    ]))

    elements.append(Paragraph('Gaya Bermain (Playstyle Trait):', h2))
    elements.append(info_table([
        ['Trait', 'Emoji', 'Efek di Match'],
        ['Poacher', '🦊', 'Peluang gol +40% (penyerang)'],
        ['Playmaker', '🧠', 'Peluang assist +30%, assist rate tim naik'],
        ['Dribbler', '💨', 'Peluang assist +15%'],
        ['Free-Kick Specialist', '🎯', 'Bonus di tendangan bebas'],
        ['Anchor', '⚓', 'Stabilkan pertahanan'],
    ]))

    # ═══════════════════════════════════════════════════════════════════════
    # 11. PIALA
    # ═══════════════════════════════════════════════════════════════════════
    elements.append(PageBreak())
    elements.append(Paragraph('11. Piala Domestik', h1))
    elements.append(hr())

    elements.append(Paragraph(
        'Selain liga, klubmu juga bisa bertanding di Piala Domestik — '
        'turnamen knockout yang berjalan paralel dengan musim liga.', body))

    elements.append(cmd_table([
        ['Command', 'Fungsi'],
        ['!piala', 'Lihat status dan bracket piala'],
        ['!mainpiala', 'Mainkan pertandingan piala berikutnya'],
    ]))

    # ═══════════════════════════════════════════════════════════════════════
    # 12. KARIR MANAJER
    # ═══════════════════════════════════════════════════════════════════════
    elements.append(Paragraph('12. Karir Manajer', h1))
    elements.append(hr())

    elements.append(Paragraph(
        'Bangun reputasimu sebagai manajer! Menang = reputasi naik, kalah = turun. '
        'Reputasi tinggi membuka pintu ke klub-klub besar.', body))

    elements.append(cmd_table([
        ['Command', 'Fungsi'],
        ['!manajer', 'Lihat profil manajer (reputasi, riwayat)'],
        ['!board', 'Lihat laporan direksi dan target musim'],
        ['!lamarpekerjaan', 'Lihat lowongan manajer di klub lain'],
        ['!lamar [nomor]', 'Lamar ke klub tertentu'],
    ]))

    elements.append(Paragraph(
        '⚠️ PERHATIAN: Jika kepercayaan board (Board Confidence) turun di bawah 20, '
        'kamu bisa DIPECAT! Perhatikan target musim dan jaga hubungan baik dengan direksi.', warn_style))

    # ═══════════════════════════════════════════════════════════════════════
    # 13. DAFTAR SEMUA COMMAND
    # ═══════════════════════════════════════════════════════════════════════
    elements.append(PageBreak())
    elements.append(Paragraph('13. Daftar Semua Command', h1))
    elements.append(hr())

    all_cmds = [
        ('🏠 CORE', [
            ('!menu', 'Tampilkan menu utama'),
            ('!buatliga', 'Buat liga baru'),
            ('!daftar', 'Pilih tim untuk dikelola'),
            ('!mulai', 'Mulai musim liga'),
            ('!main', 'Mainkan matchday berikutnya'),
            ('!next / !lanjut', 'Lanjut ke matchday berikutnya'),
            ('!info', 'Info liga saat ini'),
        ]),
        ('📊 INFO', [
            ('!klasemen', 'Lihat klasemen liga'),
            ('!jadwal', 'Lihat jadwal pertandingan'),
            ('!timku', 'Profil klub lengkap'),
            ('!pemain', 'Daftar skuad'),
            ('!pemaindetail [nama]', 'Detail pemain + personality'),
            ('!topscorer', 'Daftar top skor'),
            ('!cedera', 'Pemain cedera'),
            ('!kontrak', 'Kontrak akan habis'),
            ('!keuangan', 'Ringkasan keuangan'),
            ('!keuangandetail', 'Keuangan detail'),
        ]),
        ('⚽ TRANSFER', [
            ('!cari [nama]', 'Cari pemain di pasar'),
            ('!beli [nama] [harga]', 'Beli pemain'),
            ('!jual [nama]', 'Jual pemain'),
            ('!pinjam [nama]', 'Pinjamkan pemain'),
            ('!freeagent', 'Daftar free agent'),
        ]),
        ('⚙️ TAKTIK', [
            ('!formasi [formasi]', 'Ganti formasi'),
            ('!style [gaya]', 'Ganti gaya bermain'),
            ('!taktikinfo', 'Info taktik & familiarity'),
            ('!role [nama] [role]', 'Assign role pemain'),
            ('!setpiece', 'Atur spesialis set piece'),
        ]),
        ('🔭 SCOUTING', [
            ('!scout', 'Menu scouting'),
            ('!scout [nama]', 'Scout pemain spesifik'),
            ('!scout region [n]', 'Scout wilayah'),
            ('!laporanscout', 'Hasil laporan scout'),
            ('!scoutedpemain', 'Shortlist scout'),
            ('!youth', 'Youth academy'),
            ('!promosi [n]', 'Promosi pemain muda'),
        ]),
        ('🤝 SPONSOR & STAF (BARU)', [
            ('!sponsor', 'Lihat/pilih sponsor'),
            ('!staf', 'Lihat backroom staff'),
            ('!rekrutstaf [role]', 'Rekrut staf baru'),
            ('!derby', 'Daftar rivalitas liga'),
        ]),
        ('👔 MANAJER', [
            ('!manajer', 'Profil manajer'),
            ('!board', 'Laporan direksi'),
            ('!lamarpekerjaan', 'Lowongan manajer'),
            ('!lamar [n]', 'Lamar ke klub'),
        ]),
        ('🏆 LAINNYA', [
            ('!piala', 'Status piala domestik'),
            ('!mainpiala', 'Main piala'),
            ('!fitness', 'Laporan kebugaran'),
            ('!rotasi', 'Saran rotasi'),
            ('!harmony', 'Harmoni skuad'),
            ('!kapten', 'Assign kapten'),
            ('!cuaca', 'Kondisi cuaca match berikutnya'),
            ('!upgrade [tipe]', 'Upgrade fasilitas'),
            ('!tawaranai', 'Tawaran transfer AI'),
            ('!bicara [nama]', 'Bicara dengan pemain'),
        ]),
    ]

    for section_title, cmds in all_cmds:
        elements.append(Paragraph(section_title, h2))
        rows = [['Command', 'Fungsi']]
        for cmd, desc in cmds:
            rows.append([cmd, desc])
        elements.append(cmd_table(rows))
        elements.append(Spacer(1, 2*mm))

    # ═══════════════════════════════════════════════════════════════════════
    # FOOTER / BACK COVER
    # ═══════════════════════════════════════════════════════════════════════
    elements.append(PageBreak())
    elements.append(Spacer(1, 50*mm))
    elements.append(Paragraph('Selamat Bermain, Manajer! ⚽🏆', ParagraphStyle('End', parent=title_style,
        fontSize=22, textColor=ACCENT2)))
    elements.append(Spacer(1, 8*mm))
    elements.append(Paragraph(
        'Semua pertandingan dimulai dari satu pesan WhatsApp.<br/>'
        'Bangun dinasti, cetak sejarah, dan buktikan bahwa kamu adalah<br/>'
        'manajer terhebat sepanjang masa!',
        ParagraphStyle('EndBody', parent=body, fontSize=12, leading=18,
                       alignment=TA_CENTER, textColor=HexColor('#666666'))
    ))
    elements.append(Spacer(1, 15*mm))
    elements.append(Paragraph(
        'WA Football Manager v2.0 — Next-Level Edition',
        ParagraphStyle('EndVer', parent=body, fontSize=9,
                       alignment=TA_CENTER, textColor=HexColor('#aaaaaa'))
    ))

    # ─── Build ─────────────────────────────────────────────────────────────
    doc.build(elements)
    print(f'✅ PDF berhasil dibuat: {os.path.abspath(OUTPUT)}')
    print(f'   📄 Ukuran: {os.path.getsize(OUTPUT) / 1024:.1f} KB')


if __name__ == '__main__':
    build_pdf()
