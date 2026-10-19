/* core.js — pembaca spreadsheet & fungsi bantu (dipakai generator dan semua template) */
(function (g) {
  const U = {};

  // ---------- Spreadsheet ----------
  U.sheetId = function (s) {
    s = String(s || '');
    const m = s.match(/\/d\/([\w-]{20,})/) || s.match(/^([\w-]{30,})$/);
    return m ? m[1] : null;
  };

  U.parseCSV = function (t) {
    const rows = [];
    let r = [], c = '', q = false;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (q) {
        if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; }
        else c += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { r.push(c); c = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && t[i + 1] === '\n') i++;
        r.push(c); rows.push(r); r = []; c = '';
      } else c += ch;
    }
    if (c !== '' || r.length) { r.push(c); rows.push(r); }
    return rows;
  };

  // baris [kunci, isi, ...] -> objek {kunci: isi}. Isi kosong dan placeholder "(...)" dilewati.
  U.toData = function (rows) {
    const d = {};
    rows.forEach(r => {
      const k = (r[0] || '').trim().toLowerCase(), v = (r[1] || '').trim();
      if (!k || !v || k === 'kunci' || /^\(.*\)$/.test(v)) return;
      d[k] = v;
    });
    return d;
  };

  U.fetchSheet = async function (id) {
    const key = 'sheet:' + id;
    try {
      const c = JSON.parse(sessionStorage.getItem(key));
      if (c && Date.now() - c.t < 120000) return c.d;
    } catch (e) {}
    // headers=0 wajib: tanpa itu Google menggabungkan baris awal menjadi satu "header"
    const urls = [
      `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&headers=0`,
      `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`
    ];
    let err;
    for (const u of urls) {
      try {
        const res = await fetch(u);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const text = await res.text();
        if (/^\s*<(!doctype|html)/i.test(text)) throw new Error('sheet belum dibagikan');
        const d = U.toData(U.parseCSV(text));
        try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d })); } catch (e) {}
        return d;
      } catch (e) { err = e; }
    }
    throw new Error('Tidak bisa membaca spreadsheet. Pastikan dibagikan "Siapa saja yang memiliki link" (' + err.message + ')');
  };

  // ---------- Google Drive ----------
  U.driveId = function (u) {
    u = String(u || '');
    const m = u.match(/\/d\/([\w-]+)/) || u.match(/[?&]id=([\w-]+)/);
    return m ? m[1] : null;
  };
  U.img = function (u, w) {
    const id = U.driveId(u);
    return id ? `https://lh3.googleusercontent.com/d/${id}=w${w || 1200}` : (u || '');
  };
  U.imgAlt = function (u, w) {
    const id = U.driveId(u);
    return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w${w || 1200}` : (u || '');
  };
  // pasang gambar ke <img>; kalau gagal coba jalur cadangan
  U.setImg = function (el, u, w) {
    if (!u) return false;
    el.referrerPolicy = 'no-referrer';
    el.onerror = function () { el.onerror = null; el.src = U.imgAlt(u, w); };
    el.src = U.img(u, w);
    return true;
  };

  // ---------- Bantu ----------
  U.q = n => new URLSearchParams(location.search).get(n);
  U.guest = d => (U.q('to') || '').trim() || d['nama tamu default'] || 'Tamu Undangan';
  U.panggilan = (d, jk) => d['nama panggilan ' + jk] || (d['nama ' + jk] || '').split(' ')[0];
  U.hex = v => /^#[0-9a-f]{3,8}$/i.test(v || '');
  U.slug = s => String(s || '').trim().replace(/\s+/g, '-').replace(/[\\/?#%"<>|:*]/g, '');
  U.slugDefault = d => U.slug(U.panggilan(d, 'pria') + '&' + U.panggilan(d, 'wanita'));

  // "2027-05-19 09:00" (WIB) -> Date
  U.waktu = function (d) {
    const m = (d['waktu mulai'] || '').match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    return m ? new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+07:00`) : null;
  };
  U.hari = dt => new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(dt);

  U.waLink = function (d, hadir, nama) {
    const num = String(d['nomor wa'] || '').replace(/\D/g, '').replace(/^0/, '62');
    const msg = (d[hadir ? 'pesan hadir' : 'pesan tidak hadir'] || '').replace(/\{nama\}/g, nama);
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  };

  g.Undangan = U;
  if (typeof module === 'object') module.exports = U;
})(typeof window !== 'undefined' ? window : globalThis);
