# PokerCraft GTO Analytics Dashboard

Dashboard avançado de análise para jogadores de torneios no GGNetwork/PokerCraft,
com foco em métricas GTO (Game Theory Optimal), gestão de banca e análise de histórico de mãos.

*Advanced analytics dashboard for GGNetwork/PokerCraft tournament players,
focused on GTO (Game Theory Optimal) metrics, bankroll management, and hand history analysis.*

---

## Acesse Online

**[🚀 Abrir o Dashboard](https://rhallyson-s-n.github.io/pokercraft_local_tournament)**

Não é necessário instalar nada — roda 100% no seu navegador via WebAssembly.
Seus dados ficam apenas no seu dispositivo e nunca são enviados para nenhum servidor.

*No installation required — runs 100% in your browser via WebAssembly.
Your data stays on your device and is never uploaded anywhere.*

---

## Funcionalidades / Features

### Análise de Torneios / Tournament Summary Analysis

1. **Performance Histórica** — Lucro acumulado, Max Drawdown e taxa de ITM ao longo do tempo
   *Historical Performance — Cumulative profit, Max Drawdown and ITM rate over time*

2. **Heatmap de RRE** — Eficiência de retorno por Buy-in, tamanho de field e horário do dia
   *RRE Heatmaps — Return efficiency by Buy-in, field size and time of day*

3. **Análise de Bankroll** — Simulação de Monte Carlo para risco de quebra
   *Bankroll Analysis — Monte Carlo simulation for bankruptcy risk*

4. **Distribuição de Prêmios** — Seus ganhos por torneio e por dia da semana
   *Prize Distribution — Your earnings by tournament and day of the week*

5. **RR por Percentil** — Qualidade das suas retas finais vs. multiplicação de prêmio
   *RR by Rank Percentile — Quality of your deep runs vs. prize multiplication*

### Análise de Histórico de Mãos / Hand History Analysis

1. **Grid GTO de Ranges** — Heatmap pré-flop com frequências de Raise/All-in/Call por posição e profundidade de stack
   *GTO Range Grid — Pre-flop heatmap with Raise/All-in/Call frequencies by position and stack depth*

2. **Equidade em All-ins** — Análise de sorte nas situações de all-in com cartas conhecidas
   *All-in Equity Chart — Luck analysis in all-in situations with known cards*

3. **Histórico de Fichas** — Evolução do stack mão a mão ao longo dos torneios
   *Chip Histories — Stack evolution hand by hand throughout tournaments*

4. **Uso de Mãos por Posição** — Heatmap de VPIP por posição na mesa
   *Hand Usage by Position — VPIP heatmap by table position*

---

## Como Coletar os Dados / Data Collection

Acesse o site do **Pokercraft** e baixe os seus dados:

- Clique no botão **verde** para baixar o *"Game summaries"* (resumo dos torneios)
- Clique no botão **vermelho** para baixar o *"Hand histories"* (histórico de mãos)

*Access the **Pokercraft** website and download your data:*
- *Click the **green** button to download "Game summaries"*
- *Click the **red** button to download "Hand histories"*

> **Atenção:** Se você tiver muitos torneios, o GGNetwork pode bloquear o download em massa.
> Nesse caso, baixe por períodos (mensal ou semanal).
>
> *If you have too many tournaments, GGNetwork may block bulk downloads.
> In that case, download by period (monthly or weekly).*

![pokercraft_download](./images/pokercraft_download.png)

**Prazos de expiração dos arquivos / File expiration dates:**
- Resumos de torneios: disponíveis por até **1 ano** — *Tournament summaries: available for up to **1 year***
- Históricos de mãos: disponíveis por até **3 meses** — *Hand histories: available for up to **3 months***

Após o download, coloque todos os arquivos `.zip` em uma única pasta e selecione-a no dashboard.

*After downloading, put all `.zip` files in a single folder and select it in the dashboard.*

---

## Desenvolvimento / Development

O projeto é composto por um workspace Rust com os seguintes crates:

*The project uses a Rust workspace with the following crates:*

- `crates/core` — Biblioteca principal de análise de poker / *Core poker analysis library*
- `crates/cli` — Ferramentas de CLI (benchmark, geração de cache) / *CLI tools (benchmark, cache generation)*
- `crates/wasm` — Bindings WebAssembly para o app web / *WebAssembly bindings for the web app*

### Build

```bash
cargo build --release
cargo test --release
```

---

## Créditos e Referência / Credits

Este projeto é uma adaptação do **[pokercraft-local](https://github.com/McDic/pokercraft-local)** criado por [McDic](https://github.com/McDic),
disponibilizado sob a licença MIT. A interface, engine de visualização GTO, métricas por Big Blind e o tema
dark mode foram desenvolvidos e expandidos nesta versão.

*This project is an adaptation of **[pokercraft-local](https://github.com/McDic/pokercraft-local)** created by [McDic](https://github.com/McDic),
released under the MIT license. The interface, GTO visualization engine, Big Blind metrics and
dark mode theme were developed and expanded in this version.*
