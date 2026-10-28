# 🎾 Campeonato de Padel — app de resultados

Mini torneio todos-contra-todos (4 duplas, 2 campos, 3 rondas de 30 min).
App 100 % estática em HTML/JS com [reveal.js](https://revealjs.com) — sem build, sem servidor.

## Como usar

- Abrir `index.html` no browser (funciona offline, o reveal.js está em `vendor/reveal/`).
- No telemóvel a app abre em modo *scroll* vertical; no computador são slides (setas ← →).
- Escrever os jogos ganhos de cada dupla em cada jogo → a classificação atualiza sozinha.
- Em caso de empate aparece a escolha do **ponto decisivo** (conta como vitória, mas não altera os jogos ganhos/perdidos).
- Os dados ficam guardados no dispositivo (`localStorage`). No último slide: exportar/importar JSON e limpar resultados.
- "📋 Copiar para WhatsApp" gera a classificação e os resultados em texto.

Para publicar (ex.: GitHub Pages) basta servir a pasta `padel-torneio/`.

## Editar o torneio

| O quê | Onde |
|---|---|
| Nomes das duplas | no slide **Equipas** (ou em `defaultState()` em `logic.js`) |
| Título, data, local, horas, campos, calendário | `defaultState()` em `logic.js` |
| Cores / aspeto | `style.css` |
| Regras de pontuação e desempate | `logic.js` (`standings`) |

> Se mudares o `defaultState()` depois de já teres usado a app, usa "Limpar resultados" ou apaga o `localStorage` do site,
> porque o estado guardado tem prioridade sobre o valor por defeito.

## Desempates

1. Mais vitórias · 2. Confronto direto · 3. Melhor diferença de jogos · 4. Mais jogos ganhos.
Com 3+ duplas empatadas, o confronto direto conta só os jogos entre as duplas empatadas.

## Testes

```bash
node padel-torneio/test.js
```
