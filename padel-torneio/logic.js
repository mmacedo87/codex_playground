/*
 * Lógica do mini torneio de padel (sem dependências, funciona no browser e em Node).
 *
 * Regras implementadas:
 *  - Vitória = 3 pontos, derrota = 0.
 *  - Vence quem tiver mais jogos ganhos; em caso de empate há ponto decisivo
 *    (o vencedor é escolhido manualmente e NÃO altera a contagem de jogos).
 *  - Desempate: 1) vitórias, 2) confronto direto, 3) diferença de jogos,
 *    4) jogos ganhos. Com 3+ equipas empatadas, o confronto direto é uma
 *    mini-liga (vitórias nos jogos disputados só entre as equipas empatadas).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PadelLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var WIN_POINTS = 3;

  /* ---------- Estado inicial (editar aqui para mudar equipas/calendário) ---------- */
  function defaultState() {
    return {
      version: 1,
      meta: {
        title: 'Campeonato de Padel',
        subtitle: 'Todos contra Todos · 2 Campos · 3 Rondas',
        date: 'Sábado 31/10/2026',
        time: '11h30 – 13h00',
        place: 'Top Padel',
        gameMinutes: 30
      },
      teams: [
        { id: 'A', players: ['Nuno Rocha', 'Nuno Dias'] },
        { id: 'B', players: ['Macedo', 'Antunes'] },
        { id: 'C', players: ['Pinheiro', 'Rolo'] },
        { id: 'D', players: ['Alex', 'Ricardo'] }
      ],
      rounds: [
        { n: 1, time: '11h30 – 12h00', matches: [
          m('R1-C3', 'Campo 3', 'A', 'B'),
          m('R1-C4', 'Campo 4', 'C', 'D')
        ] },
        { n: 2, time: '12h00 – 12h30', matches: [
          m('R2-C3', 'Campo 3', 'A', 'C'),
          m('R2-C4', 'Campo 4', 'B', 'D')
        ] },
        { n: 3, time: '12h30 – 13h00', matches: [
          m('R3-C3', 'Campo 3', 'A', 'D'),
          m('R3-C4', 'Campo 4', 'B', 'C')
        ] }
      ]
    };
  }

  function m(id, court, home, away) {
    // ga/gb = jogos ganhos de cada equipa; tb = vencedor do ponto decisivo ('home'|'away'|null)
    return { id: id, court: court, home: home, away: away, ga: null, gb: null, tb: null };
  }

  function allMatches(state) {
    var out = [];
    state.rounds.forEach(function (r) { r.matches.forEach(function (x) { out.push(x); }); });
    return out;
  }

  /* ---------- Resultado de um jogo ---------- */
  function resolveMatch(x) {
    if (!isNum(x.ga) || !isNum(x.gb)) return { status: 'pending' };
    if (x.ga > x.gb) return { status: 'done', winner: 'home', viaTiebreak: false };
    if (x.ga < x.gb) return { status: 'done', winner: 'away', viaTiebreak: false };
    if (x.tb === 'home' || x.tb === 'away') return { status: 'done', winner: x.tb, viaTiebreak: true };
    return { status: 'needs-tiebreak' };
  }

  function isNum(v) { return typeof v === 'number' && isFinite(v) && v >= 0; }

  /* ---------- Classificação ---------- */
  function standings(state) {
    var stats = {};
    state.teams.forEach(function (t) {
      stats[t.id] = { id: t.id, played: 0, wins: 0, losses: 0, points: 0, gw: 0, gl: 0, diff: 0, h2h: 0 };
    });
    var results = [];
    allMatches(state).forEach(function (x) {
      var r = resolveMatch(x);
      if (r.status !== 'done') return;
      var h = stats[x.home], a = stats[x.away];
      if (!h || !a) return;
      results.push({ home: x.home, away: x.away, winner: r.winner === 'home' ? x.home : x.away });
      h.played++; a.played++;
      h.gw += x.ga; h.gl += x.gb; a.gw += x.gb; a.gl += x.ga;
      var w = r.winner === 'home' ? h : a, l = r.winner === 'home' ? a : h;
      w.wins++; w.points += WIN_POINTS; l.losses++;
    });
    var rows = Object.keys(stats).map(function (k) {
      var s = stats[k]; s.diff = s.gw - s.gl; return s;
    });
    // ordem estável de partida: ordem das equipas no estado
    var order = {}; state.teams.forEach(function (t, i) { order[t.id] = i; });
    rows.sort(function (x, y) { return (y.points - x.points) || (order[x.id] - order[y.id]); });

    // grupos com os mesmos pontos (= mesmas vitórias)
    var sorted = [], i = 0;
    while (i < rows.length) {
      var j = i;
      while (j + 1 < rows.length && rows[j + 1].points === rows[i].points) j++;
      var group = rows.slice(i, j + 1);
      if (group.length > 1) {
        var ids = {}; group.forEach(function (g) { ids[g.id] = true; g.h2h = 0; });
        results.forEach(function (r) { if (ids[r.home] && ids[r.away]) stats[r.winner].h2h++; });
        group.sort(function (x, y) {
          return (y.h2h - x.h2h) || (y.diff - x.diff) || (y.gw - x.gw) || (order[x.id] - order[y.id]);
        });
      }
      sorted = sorted.concat(group);
      i = j + 1;
    }

    // posições (partilhadas se todos os critérios empatam) e critério decisivo
    sorted.forEach(function (row, idx) {
      var prev = sorted[idx - 1];
      if (prev && sameKey(prev, row)) { row.rank = prev.rank; row.shared = true; prev.shared = true; }
      else row.rank = idx + 1;
    });
    sorted.forEach(function (row, idx) {
      var next = sorted[idx + 1];
      row.decidedBy = null;
      if (next && next.points === row.points && !sameKey(row, next)) {
        row.decidedBy = row.h2h !== next.h2h ? 'confronto direto'
          : row.diff !== next.diff ? 'diferença de jogos'
          : 'jogos ganhos';
      }
    });
    return sorted;
  }

  function sameKey(a, b) {
    return a.points === b.points && a.h2h === b.h2h && a.diff === b.diff && a.gw === b.gw;
  }

  function progress(state) {
    var ms = allMatches(state), done = 0, tb = 0;
    ms.forEach(function (x) {
      var r = resolveMatch(x);
      if (r.status === 'done') done++;
      if (r.status === 'needs-tiebreak') tb++;
    });
    return { done: done, total: ms.length, needsTiebreak: tb, complete: done === ms.length };
  }

  /* ---------- Texto para partilhar (WhatsApp) ---------- */
  function teamLabel(state, id) {
    var t = state.teams.filter(function (x) { return x.id === id; })[0];
    return t ? t.players.join(' & ') : id;
  }

  function standingsText(state) {
    var p = progress(state), medals = ['🥇', '🥈', '🥉'];
    var lines = ['🎾 *' + state.meta.title + '*', '📊 Classificação (' + p.done + '/' + p.total + ' jogos)', ''];
    standings(state).forEach(function (r) {
      var pos = r.rank <= 3 ? medals[r.rank - 1] : r.rank + 'º';
      lines.push(pos + ' ' + teamLabel(state, r.id) + ' — ' + r.points + ' pts (' +
        r.wins + 'V ' + r.losses + 'D, ' + (r.diff > 0 ? '+' : '') + r.diff + ')');
    });
    var results = [];
    state.rounds.forEach(function (rd) {
      rd.matches.forEach(function (x) {
        var r = resolveMatch(x);
        if (r.status === 'pending') return;
        var score = x.ga + '-' + x.gb + (r.status === 'done' && r.viaTiebreak ? ' (ponto decisivo)' : '');
        results.push('R' + rd.n + ' · ' + teamLabel(state, x.home) + ' ' + score + ' ' + teamLabel(state, x.away));
      });
    });
    if (results.length) { lines.push('', '📋 Resultados'); lines = lines.concat(results); }
    return lines.join('\n');
  }

  /* ---------- Validação de estado importado ---------- */
  function validState(s) {
    try {
      if (!s || !Array.isArray(s.teams) || s.teams.length !== 4) return false;
      if (!Array.isArray(s.rounds) || s.rounds.length !== 3) return false;
      var ids = {};
      s.teams.forEach(function (t) {
        if (typeof t.id !== 'string' || !Array.isArray(t.players) || t.players.length !== 2) throw 0;
        ids[t.id] = true;
      });
      s.rounds.forEach(function (r) {
        if (!Array.isArray(r.matches) || r.matches.length !== 2) throw 0;
        r.matches.forEach(function (x) {
          if (!ids[x.home] || !ids[x.away]) throw 0;
          if (x.ga !== null && !isNum(x.ga)) throw 0;
          if (x.gb !== null && !isNum(x.gb)) throw 0;
        });
      });
      return !!s.meta && typeof s.meta.title === 'string';
    } catch (e) { return false; }
  }

  return {
    WIN_POINTS: WIN_POINTS,
    defaultState: defaultState,
    allMatches: allMatches,
    resolveMatch: resolveMatch,
    standings: standings,
    progress: progress,
    standingsText: standingsText,
    teamLabel: teamLabel,
    validState: validState
  };
});
