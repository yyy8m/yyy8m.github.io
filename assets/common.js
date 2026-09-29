/* ツールばこ 共通ヘルパー — すべてブラウザ内で完結し、外部へデータを送信しない */
var TB = (function () {
  'use strict';
  var TB = {};

  TB.$ = function (id) { return document.getElementById(id); };

  TB.copy = function (id, btn) {
    var el = TB.$(id);
    var text = ('value' in el) ? el.value : el.textContent;
    var done = function () {
      if (!btn) return;
      var o = btn.textContent; btn.textContent = 'コピーしました';
      setTimeout(function () { btn.textContent = o; }, 1400);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else { fallback(); }
    function fallback() {
      var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t);
      t.select(); try { document.execCommand('copy'); done(); } catch (e) {} t.remove();
    }
  };

  TB.download = function (data, filename, mime) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  TB.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ---------- かな変換 ---------- */
  TB.hiraToKata = function (s) {
    return s.replace(/[ぁ-ゖゝゞ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) + 0x60); });
  };
  TB.kataToHira = function (s) {
    return s.replace(/[ァ-ヶヽヾ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); });
  };

  var HALF = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝｧｨｩｪｫｯｬｭｮｰ､｡｢｣･';
  var FULL = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンァィゥェォッャュョー、。「」・';
  var h2f = {}, f2h = {};
  for (var i = 0; i < HALF.length; i++) { h2f[HALF[i]] = FULL[i]; f2h[FULL[i]] = HALF[i]; }
  var DAKU = 'カキクケコサシスセソタチツテトハヒフヘホ', DAKU_V = 'ガギグゲゴザジズゼゾダヂヅデドバビブベボ', HANDAKU = 'ハヒフヘホ', HANDAKU_V = 'パピプペポ';
  for (i = 0; i < DAKU.length; i++) f2h[DAKU_V[i]] = f2h[DAKU[i]] + 'ﾞ';
  for (i = 0; i < HANDAKU.length; i++) f2h[HANDAKU_V[i]] = f2h[HANDAKU[i]] + 'ﾟ';
  f2h['ヴ'] = 'ｳﾞ'; f2h['ヮ'] = 'ﾜ'; f2h['ヵ'] = 'ｶ'; f2h['ヶ'] = 'ｹ'; f2h['ヰ'] = 'ｲ'; f2h['ヱ'] = 'ｴ';
  f2h['゛'] = 'ﾞ'; f2h['゜'] = 'ﾟ';

  TB.fullKanaToHalf = function (s) {
    var out = '';
    for (var i = 0; i < s.length; i++) { var c = s[i]; out += (f2h[c] !== undefined) ? f2h[c] : c; }
    return out;
  };
  TB.halfKanaToFull = function (s) {
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i], n = s[i + 1], f = h2f[c];
      if (f === undefined) { out += c; continue; }
      if (n === 'ﾞ') {
        var k = DAKU.indexOf(f);
        if (k >= 0) { out += DAKU_V[k]; i++; continue; }
        if (f === 'ウ') { out += 'ヴ'; i++; continue; }
      } else if (n === 'ﾟ') {
        var h = HANDAKU.indexOf(f);
        if (h >= 0) { out += HANDAKU_V[h]; i++; continue; }
      }
      out += f;
    }
    return out.replace(/ﾞ/g, '゛').replace(/ﾟ/g, '゜');
  };

  /* 全角英数・記号(U+FF01-FF5E)と半角(U+0021-007E)の相互変換 */
  TB.fullAsciiToHalf = function (s, opt) {
    opt = opt || { alnum: true, symbol: true, space: true };
    return s.replace(/[！-～　]/g, function (c) {
      if (c === '　') return opt.space ? ' ' : c;
      var h = String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
      var isAlnum = /[0-9A-Za-z]/.test(h);
      if (isAlnum ? opt.alnum : opt.symbol) return h;
      return c;
    });
  };
  TB.halfAsciiToFull = function (s, opt) {
    opt = opt || { alnum: true, symbol: true, space: true };
    return s.replace(/[ -~]/g, function (c) {
      if (c === ' ') return opt.space ? '　' : c;
      var isAlnum = /[0-9A-Za-z]/.test(c);
      if (isAlnum ? opt.alnum : opt.symbol) return String.fromCharCode(c.charCodeAt(0) + 0xFEE0);
      return c;
    });
  };

  /* ---------- Shift_JIS (CP932) エンコーダ ----------
     ブラウザ標準の TextDecoder('shift_jis') から逆引き表を作る（外部ライブラリ不要）。 */
  var sjisMap = null;
  TB.sjisTable = function () {
    if (sjisMap) return sjisMap;
    sjisMap = new Map();
    var dec = new TextDecoder('shift_jis');
    var b1 = new Uint8Array(1), b2 = new Uint8Array(2), i, lead, trail, ch;
    for (i = 0; i <= 0x80; i++) sjisMap.set(String.fromCharCode(i), [i]);
    for (i = 0xA1; i <= 0xDF; i++) { b1[0] = i; sjisMap.set(dec.decode(b1), [i]); }
    var leads = [];
    for (lead = 0x81; lead <= 0x9F; lead++) leads.push(lead);
    for (lead = 0xE0; lead <= 0xEC; lead++) leads.push(lead);
    for (lead = 0xEF; lead <= 0xFC; lead++) leads.push(lead);
    leads.push(0xED, 0xEE); /* NEC選定IBM拡張は重複時に優先しない */
    for (var li = 0; li < leads.length; li++) {
      lead = leads[li];
      for (trail = 0x40; trail <= 0xFC; trail++) {
        if (trail === 0x7F) continue;
        b2[0] = lead; b2[1] = trail;
        ch = dec.decode(b2);
        if (ch.length !== 1 || ch === '�') continue;
        if (!sjisMap.has(ch)) sjisMap.set(ch, [lead, trail]);
      }
    }
    sjisMap.set('¥', [0x5C]); sjisMap.set('‾', [0x7E]);
    sjisMap.set('−', sjisMap.get('－'));
    return sjisMap;
  };
  /* 戻り値: {bytes: Uint8Array, bad: [{ch, index}]} */
  TB.encodeSjis = function (s, replacement) {
    var map = TB.sjisTable(), out = [], bad = [], idx = 0;
    var rep = replacement === undefined ? [0x3F] : map.get(replacement) || [0x3F];
    for (var ch of s) {
      var b = map.get(ch);
      if (b) { out.push.apply(out, b); } else { bad.push({ ch: ch, index: idx }); out.push.apply(out, rep); }
      idx++;
    }
    return { bytes: new Uint8Array(out), bad: bad };
  };
  TB.sjisBytesOf = function (ch) { return TB.sjisTable().get(ch) || null; };

  /* data-copy="要素ID" を持つボタンを自動でコピーボタンにする */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-copy]');
    if (b) TB.copy(b.getAttribute('data-copy'), b);
  });

  return TB;
})();
