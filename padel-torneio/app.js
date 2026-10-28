/* UI do torneio de padel: gera os slides (reveal.js), guarda no localStorage e atualiza a classificação. */
(function () {
  'use strict';
  var L = window.PadelLogic;
  var KEY = 'padel-torneio-2026-10-31';
  var state = load();

  /* ---------- Persistência ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var s = JSON.parse(raw); if (L.validState(s)) return s; }
    } catch (e) { /* ignora */ }
    return L.defaultState();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* modo privado */ }
  }

  /* ---------- Helpers ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function team(id) { return state.teams.filter(function (t) { return t.id === id; })[0]; }
  function label(id) {
    var t = team(id), names = t ? t.players.map(function (p) { return p.trim(); }).filter(Boolean) : [];
    return names.length ? names.join(' & ') : 'Equipa ' + id;
  }
  function badge(id) { return '<span class="badge ' + esc(id) + '">' + esc(id) + '</span>'; }
  function findMatch(id) { return L.allMatches(state).filter(function (x) { return x.id === id; })[0]; }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  var toastTimer;
  function toast(msg) {
    var el = $('#toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  /* ---------- Slides ---------- */
  function matchHTML(x) {
    return '<div class="match" data-match="' + esc(x.id) + '" data-prevent-swipe>' +
      '<div class="court">🎾 ' + esc(x.court) + '</div>' +
      '<div class="row">' +
        '<div class="side home">' + badge(x.home) + '<span class="names" data-names="' + esc(x.home) + '"></span></div>' +
        '<div class="score">' +
          '<input type="number" inputmode="numeric" min="0" max="99" data-f="ga" aria-label="Jogos ganhos ' + esc(x.home) + '">' +
          '<span class="dash">–</span>' +
          '<input type="number" inputmode="numeric" min="0" max="99" data-f="gb" aria-label="Jogos ganhos ' + esc(x.away) + '">' +
        '</div>' +
        '<div class="side away">' + badge(x.away) + '<span class="names" data-names="' + esc(x.away) + '"></span></div>' +
      '</div>' +
      '<div class="tb" hidden>⚖️ Empate — ponto decisivo ganho por: ' +
        '<button class="btn" data-tb="home">' + badge(x.home) + ' <span data-names="' + esc(x.home) + '"></span></button>' +
        '<button class="btn" data-tb="away">' + badge(x.away) + ' <span data-names="' + esc(x.away) + '"></span></button>' +
      '</div>' +
      '<div class="status"></div>' +
    '</div>';
  }

  function buildSlides() {
    var m = state.meta, html = '';

    html += '<section class="hero">' +
      '<div class="ball">🎾</div>' +
      '<h1>' + esc(m.title) + '</h1>' +
      '<div class="meta">' + esc(m.subtitle) + '<br><b>' + esc(m.date) + '</b> · ' + esc(m.time) + ' · 📍 ' + esc(m.place) + '</div>' +
      '<div class="hint">Avança com as setas / desliza · os resultados ficam guardados neste dispositivo</div>' +
    '</section>';

    html += '<section id="equipas"><h2>👥 Equipas</h2><div class="teams-grid">' +
      state.teams.map(function (t) {
        return '<div class="team-card ' + esc(t.id) + '" data-prevent-swipe>' +
          '<div class="head">' + badge(t.id) + ' Equipa ' + esc(t.id) + '</div>' +
          '<input type="text" data-team="' + esc(t.id) + '" data-p="0" value="' + esc(t.players[0]) + '" aria-label="Jogador 1 equipa ' + esc(t.id) + '">' +
          '<input type="text" data-team="' + esc(t.id) + '" data-p="1" value="' + esc(t.players[1]) + '" aria-label="Jogador 2 equipa ' + esc(t.id) + '">' +
        '</div>';
      }).join('') +
      '</div><div class="hint">Podes editar os nomes — atualizam-se em todos os slides.</div></section>';

    state.rounds.forEach(function (r) {
      html += '<section id="ronda-' + r.n + '">' +
        '<div class="round-head"><h2>' + r.n + '.ª Ronda</h2><span class="time">🕒 ' + esc(r.time) + '</span></div>' +
        r.matches.map(matchHTML).join('') +
      '</section>';
    });

    html += '<section id="classificacao"><h2>🥇 Classificação</h2>' +
      '<div id="rank-progress" class="muted small"></div>' +
      '<div id="rank-table"></div>' +
      '<div class="champ" id="champ" hidden></div>' +
      '<div class="actions"><button class="btn primary" id="btn-copy">📋 Copiar para WhatsApp</button></div>' +
    '</section>';

    html += '<section id="regras" class="rules"><h2>📌 Regras</h2><ul>' +
      '<li>3 jogos de ' + esc(m.gameMinutes) + ' minutos · todos contra todos · 6 jogos no total.</li>' +
      '<li>Vitória = <b>3 pontos</b>, derrota = 0.</li>' +
      '<li>Vence quem tiver mais jogos ganhos no final do tempo; em caso de empate joga-se um <b>ponto decisivo</b>.</li>' +
      '<li>Desempate:<ol class="tie-list"><li>Maior número de vitórias</li><li>Confronto direto</li><li>Melhor diferença entre jogos ganhos e perdidos</li><li>Maior número de jogos ganhos</li></ol></li>' +
      '<li class="muted">Com 3 ou mais equipas empatadas, o confronto direto conta só os jogos entre elas.</li>' +
    '</ul></section>';

    html += '<section id="admin"><h2>⚙️ Dados</h2>' +
      '<p class="muted small">Tudo é guardado automaticamente neste dispositivo. Exporta para fazer backup ou passar os resultados para outro telemóvel.</p>' +
      '<div class="actions">' +
        '<button class="btn" id="btn-export">⬇️ Exportar JSON</button>' +
        '<button class="btn" id="btn-import">⬆️ Importar JSON</button>' +
        '<button class="btn danger" id="btn-reset">🗑️ Limpar resultados</button>' +
      '</div>' +
      '<input type="file" id="file-import" accept="application/json,.json" hidden>' +
    '</section>';

    $('#slides').innerHTML = html;
  }

  /* ---------- Atualização da UI ---------- */
  function refreshNames() {
    $$('[data-names]').forEach(function (el) { el.textContent = label(el.getAttribute('data-names')); });
  }

  function updateMatch(el) {
    var x = findMatch(el.getAttribute('data-match')), r = L.resolveMatch(x);
    $$('input[data-f]', el).forEach(function (inp) {
      if (document.activeElement === inp) return;
      var v = x[inp.getAttribute('data-f')];
      inp.value = v === null ? '' : String(v);
    });
    var home = $('.side.home', el), away = $('.side.away', el), tb = $('.tb', el), st = $('.status', el);
    home.classList.toggle('win', r.status === 'done' && r.winner === 'home');
    away.classList.toggle('win', r.status === 'done' && r.winner === 'away');
    tb.hidden = r.status !== 'needs-tiebreak' && !(r.status === 'done' && r.viaTiebreak);
    $$('[data-tb]', el).forEach(function (b) { b.classList.toggle('on', x.tb === b.getAttribute('data-tb')); });
    st.className = 'status';
    if (r.status === 'pending') st.textContent = 'Por jogar';
    else if (r.status === 'needs-tiebreak') { st.textContent = 'Empatados — escolhe quem ganhou o ponto decisivo.'; st.classList.add('warn'); }
    else {
      var w = r.winner === 'home' ? x.home : x.away;
      st.textContent = 'Vitória de ' + label(w) + (r.viaTiebreak ? ' (ponto decisivo)' : '') + ' · +' + L.WIN_POINTS + ' pts';
      st.classList.add('ok');
    }
  }

  function medal(rank) { return ['🥇', '🥈', '🥉'][rank - 1] || (rank + 'º'); }

  function renderStandings() {
    var rows = L.standings(state), p = L.progress(state);
    $('#rank-progress').textContent = p.done + ' de ' + p.total + ' jogos concluídos';
    var html = '<table class="rank"><thead><tr><th>#</th><th>Dupla</th><th>J</th><th>V</th><th>D</th><th>JG</th><th>JP</th><th>Dif</th><th>Pts</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      var why = !p.done ? '' : r.shared ? 'empate total' : (r.decidedBy ? 'à frente por ' + r.decidedBy : '');
      html += '<tr class="' + (r.rank === 1 && p.done > 0 ? 'first' : '') + '">' +
        '<td class="pos">' + (p.done ? medal(r.rank) : '–') + '</td>' +
        '<td class="team">' + badge(r.id) + '<span>' + esc(label(r.id)) + (why ? '<span class="why">' + esc(why) + '</span>' : '') + '</span></td>' +
        '<td>' + r.played + '</td><td>' + r.wins + '</td><td>' + r.losses + '</td>' +
        '<td>' + r.gw + '</td><td>' + r.gl + '</td>' +
        '<td>' + (r.diff > 0 ? '+' : '') + r.diff + '</td>' +
        '<td class="pts">' + r.points + '</td></tr>';
    });
    $('#rank-table').innerHTML = html + '</tbody></table>' +
      '<div class="muted small" style="margin-top:6px">J jogos · V vitórias · D derrotas · JG jogos ganhos · JP jogos perdidos · Dif diferença</div>';

    var champ = $('#champ');
    if (p.complete) {
      champ.hidden = false;
      champ.textContent = rows[0].shared
        ? '⚠️ Empate total no 1.º lugar — decidam entre vocês (ex.: ponto decisivo extra).'
        : '🏆 Campeões: ' + label(rows[0].id) + '!';
    } else if (p.needsTiebreak) {
      champ.hidden = false;
      champ.textContent = '⚖️ Há ' + p.needsTiebreak + ' jogo(s) empatado(s) a aguardar o ponto decisivo.';
    } else champ.hidden = true;
  }

  function updateAll() {
    $$('.match').forEach(updateMatch);
    renderStandings();
  }

  /* ---------- Eventos ---------- */
  function parseGames(v) {
    if (v === '' || v === null) return null;
    var n = Math.floor(Number(v));
    return isFinite(n) && n >= 0 ? Math.min(n, 99) : null;
  }

  function bindEvents() {
    var root = $('#slides');

    root.addEventListener('input', function (e) {
      var t = e.target;
      if (t.matches('input[data-f]')) {
        var x = findMatch(t.closest('.match').getAttribute('data-match'));
        x[t.getAttribute('data-f')] = parseGames(t.value);
        if (x.ga !== x.gb) x.tb = null; // ponto decisivo só faz sentido num empate
        save(); updateAll();
      } else if (t.matches('input[data-team]')) {
        team(t.getAttribute('data-team')).players[Number(t.getAttribute('data-p'))] = t.value;
        save(); refreshNames(); renderStandings(); $$('.match').forEach(updateMatch);
      }
    });

    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tb]');
      if (b) {
        var x = findMatch(b.closest('.match').getAttribute('data-match')), v = b.getAttribute('data-tb');
        x.tb = x.tb === v ? null : v;
        save(); updateAll(); return;
      }
      var id = e.target.id;
      if (id === 'btn-copy') copyText(L.standingsText(state));
      else if (id === 'btn-export') exportJson();
      else if (id === 'btn-import') $('#file-import').click();
      else if (id === 'btn-reset') resetResults();
    });

    $('#file-import').addEventListener('change', importJson);
  }

  function copyText(text) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* ignora */ }
      document.body.removeChild(ta);
      toast(ok ? 'Classificação copiada ✅' : 'Não foi possível copiar');
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast('Classificação copiada ✅'); }, fallback);
    } else fallback();
  }

  function exportJson() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'padel-torneio.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('Exportado ⬇️');
  }

  function importJson(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var s = JSON.parse(rd.result);
        if (!L.validState(s)) throw new Error('inválido');
        state = s; save(); location.reload();
      } catch (err) { toast('Ficheiro inválido ❌'); }
    };
    rd.readAsText(f);
    e.target.value = '';
  }

  var resetArmed = null;
  function resetResults() {
    var btn = $('#btn-reset');
    if (!resetArmed) { // 1.º toque arma, 2.º toque confirma (confirm() não funciona em todos os ambientes)
      btn.textContent = '⚠️ Toca outra vez para apagar';
      resetArmed = setTimeout(function () { resetArmed = null; btn.textContent = '🗑️ Limpar resultados'; }, 4000);
      return;
    }
    clearTimeout(resetArmed); resetArmed = null; btn.textContent = '🗑️ Limpar resultados';
    L.allMatches(state).forEach(function (x) { x.ga = null; x.gb = null; x.tb = null; });
    save(); updateAll(); toast('Resultados limpos');
  }

  /* ---------- Arranque ---------- */
  buildSlides();
  refreshNames();
  bindEvents();
  updateAll();

  var narrow = window.matchMedia && window.matchMedia('(max-width: 800px)').matches;
  Reveal.initialize({
    hash: false,
    view: narrow ? 'scroll' : 'default', // no telemóvel: scroll vertical em vez de slides escalados
    scrollLayout: 'compact',
    width: 1100,
    height: 780,
    margin: 0.04,
    center: false,
    controls: true,
    progress: true,
    slideNumber: 'c/t',
    transition: 'slide'
  });
})();
