// Testes da lógica: node padel-torneio/test.js
const assert = require('assert');
const L = require('./logic.js');

function build(results) {
  // results: { 'R1-C3': [ga, gb, tb?], ... }
  const s = L.defaultState();
  L.allMatches(s).forEach((x) => {
    const r = results[x.id];
    if (r) { x.ga = r[0]; x.gb = r[1]; x.tb = r[2] || null; }
  });
  return s;
}
const order = (s) => L.standings(s).map((r) => r.id).join('');
let n = 0;
function t(name, fn) { fn(); n++; console.log('ok -', name); }

t('sem resultados: todos empatados na 1.ª posição', () => {
  const st = L.standings(L.defaultState());
  assert(st.every((r) => r.rank === 1 && r.points === 0));
  assert.strictEqual(L.progress(L.defaultState()).done, 0);
});

t('vitória = 3 pontos, derrota = 0', () => {
  const st = L.standings(build({ 'R1-C3': [6, 2] }));
  const A = st.find((r) => r.id === 'A'), B = st.find((r) => r.id === 'B');
  assert.deepStrictEqual([A.points, A.wins, A.diff], [3, 1, 4]);
  assert.deepStrictEqual([B.points, B.losses, B.diff], [0, 1, -4]);
});

t('empate sem ponto decisivo não conta; com ponto decisivo conta sem mexer nos jogos', () => {
  let s = build({ 'R1-C3': [5, 5] });
  assert.strictEqual(L.resolveMatch(L.allMatches(s)[0]).status, 'needs-tiebreak');
  assert(L.standings(s).every((r) => r.points === 0));
  s = build({ 'R1-C3': [5, 5, 'away'] });
  const st = L.standings(s);
  const B = st.find((r) => r.id === 'B');
  assert.deepStrictEqual([B.points, B.diff, B.gw], [3, 0, 5]);
  assert.strictEqual(st[0].id, 'B');
});

t('2 equipas empatadas em vitórias: confronto direto vence a diferença de jogos', () => {
  // A e B com 2 vitórias; A ganhou a B, mas B tem melhor diferença de jogos
  const s = build({
    'R1-C3': [5, 4],  // A > B
    'R2-C3': [5, 4],  // A > C
    'R3-C3': [3, 6],  // A < D
    'R2-C4': [6, 0],  // B > D
    'R1-C4': [5, 4],  // C > D
    'R3-C4': [6, 0]   // B > C
  });
  const st = L.standings(s);
  const byId = Object.fromEntries(st.map((r) => [r.id, r]));
  assert.strictEqual(byId.A.wins, 2); assert.strictEqual(byId.B.wins, 2);
  assert(byId.B.diff > byId.A.diff, 'B deve ter melhor diferença');
  assert(st.findIndex((r) => r.id === 'A') < st.findIndex((r) => r.id === 'B'), 'A à frente de B por confronto direto');
  assert.strictEqual(byId.A.decidedBy, 'confronto direto');
});

t('ciclo de 3 equipas: mini-liga empata e decide a diferença de jogos', () => {
  // A>B, B>C, C>A (1 vitória cada no grupo) e todas ganham a D
  const s = build({
    'R1-C3': [6, 5],  // A > B  (A +1)
    'R3-C4': [6, 4],  // B > C  (B +2)
    'R2-C3': [3, 6],  // A < C  (C +3)
    'R3-C3': [6, 0],  // A > D
    'R2-C4': [6, 0],  // B > D
    'R1-C4': [6, 0]   // C > D
  });
  const st = L.standings(s);
  const w = Object.fromEntries(st.map((r) => [r.id, r]));
  assert.deepStrictEqual([w.A.wins, w.B.wins, w.C.wins, w.D.wins], [2, 2, 2, 0]);
  assert.strictEqual(st[3].id, 'D');
  // diffs: A = (6+3+6)-(5+6+0)=4 ; B = (5+6+6)-(6+4+0)=7 ; C = (4+6+6)-(6+3+0)=7
  assert.strictEqual(w.A.diff, 4); assert.strictEqual(w.B.diff, 7); assert.strictEqual(w.C.diff, 7);
  assert.strictEqual(w.A.rank, 3);
  // B e C empatam em diff (7); jogos ganhos: B=17, C=16 -> B à frente
  assert.strictEqual(order(s), 'BCAD');
  assert(w.B.gw > w.C.gw);
  assert.strictEqual(st[0].id, 'B'); assert.strictEqual(st[1].id, 'C');
});

t('posições partilhadas só quando todos os critérios empatam', () => {
  const s = build({ 'R1-C3': [6, 2], 'R1-C4': [6, 2] });
  const st = L.standings(s);
  assert.strictEqual(st[0].rank, 1); assert.strictEqual(st[1].rank, 1);
  assert(st[0].shared && st[1].shared);
  assert.strictEqual(st[2].rank, 3);
});

t('texto de partilha e validação do estado', () => {
  const s = build({ 'R1-C3': [6, 2], 'R1-C4': [5, 5, 'home'] });
  const txt = L.standingsText(s);
  assert(txt.includes('Campeonato de Padel') && txt.includes('ponto decisivo'));
  assert(L.validState(s));
  assert(!L.validState({ teams: [] }));
  const bad = JSON.parse(JSON.stringify(s)); bad.rounds[0].matches[0].home = 'Z';
  assert(!L.validState(bad));
});

console.log('\n' + n + ' testes passaram');
