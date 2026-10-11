# MELHORIAS — botwhatsapp-venom

> **Gerado por análise de código em 2026-10-05** · Stack: Node ESM + venom-bot 4.3.7 (bot de pedidos, estágios)
> Branch `master` · 7 módulos em src/ · estado em memória · sem testes · sem CI
>
> **Este arquivo é um plano de execução.** Cada item tem ID, `arquivo:linha`, mudança exata, critério de aceite e comando de verificação.

---

## 0. Como usar este documento

1. Execute na ordem **P0 → P1 → P2 → P3**, respeitando as ondas da §8.
2. Ao terminar um item: marque `- [x]`, rode o **Verificação**, comite `fix(<ID>): descrição`.
3. **O fluxo de estágios está testado só a olho** — o `BUG-01` abaixo derruba o processo com mensagem comum; corrigir primeiro.
4. **Idioma:** português.

---

## 1. Diagnóstico executivo

Bot de WhatsApp ("Delícias da Neide", assistente Carlos) com máquina de estágios (inicial → cardápio → bairro → endereço → atendente). Estado por número em `storage` (objeto em memória).

**O que está bem (não regredir):**

| Item | Evidência |
|---|---|
| Separação clara de estágios (arquivos 0-5) | `src/stages/` |
| Singleton do bot com estado privado (#) | `src/venom.js` |
| Ignora mensagens de grupo | `src/server.js:17` |
| Fallback de primeira mensagem cria o registro | `src/stages.js:40-50` |
| Bairro como dados separados | `src/stages/neighborhoods.js` |

**O que está quebrado:**

1. **Validação de opção é regex que aceita lixo:** `/[0|1|2]/.test(msg)` (`stages/1.js:9`) — classe de caracteres com `|` literal: aceita `"|"`, aceita `"10"`, aceita qualquer string **contendo** 0/1/2. `"10"` passa → `options[10]` é `undefined` → `TypeError` no `()` (`stages/1.js:15`) → **o loop `onMessage` rejeita e a mensagem cai no catch do `main`** (só loga; conversa trava naquele usuário).
2. **Estado só em memória:** `storage = Object.create({})` — reinício do processo perde todos os pedidos em andamento.
3. `new Date().setSeconds(60)` (`stages/1.js:29`, `stages/5.js:20`) retorna o **instante do próximo minuto**, não `agora+60s` — o comentário "1 minute of inactivity" mente (o timeout real varia de 0 a 60s).
4. venom-bot (Chrome/Puppeteer não-oficial) — risco de banimento da conta (§9); sem testes, sem CI, sem `.env`.

---

## 2. Tabela de prioridades

| ID | Título | Sev | Arquivo | Depende de |
|---|---|---|---|---|
| BUG-01 | Regex `/[0|1|2]/` aceita lixo → `options[N]` undefined → TypeError | **P1** | `src/stages/1.js:9,15` | — |
| BUG-02 | Timeout de inactivity calculado errado (`setSeconds(60)`) | **P1** | `src/stages/1.js:29`, `src/stages/5.js:20` | — |
| IMP-01 | Estado em memória — reinício perde pedidos | **P1** | `src/storage.js` | — |
| SEC-01 | venom-bot não-oficial — conta pode ser banida (§9) | **P1** | `package.json` | — |
| TEST-01 | Zero testes da máquina de estágios | **P2** | *(ausente)* | BUG-01 |
| DEVOPS-01 | Sem CI/lint | **P2** | *(ausente)* `.github/workflows/` | — |
| DOC-01 | README — setup, riscos, persistência | **P2** | `README.md` | IMP-01 |
| IMP-02 | Session name hardcoded (`'Delícias da Neide'`) | **P3** | `src/server.js:7` | — |

---

## 3. Segurança

### SEC-01 · Cliente WhatsApp não-oficial (venom-bot) · [P1]

- **Arquivo:** `package.json` (`"venom-bot": "4.3.7"`)
- **Evidência:** venom-bot automatiza o WhatsApp Web via Puppeteer sem API oficial — a Meta bloqueia contas que usam clientes não-licenciados.
- **Impacto:** o bot pode ser banido junto com o número do restaurante (perda de canal inteiro); 4.3.7 é de 2023 — cadeia de Puppeteer antiga.
- **Mudança:** registrar a decisão: (a) manter com número descartável/documentado, ou (b) migrar para a **WhatsApp Business Cloud API** oficial (item de projeto, §9). Atualizar venom-bot para a versão mais nova suportada como paliativo.
- **Aceite:** decisão documentada no README; dependência atualizada ou plano de migração escrito.
- **Verificação:**
  ```bash
  grep -n 'venom-bot' package.json && grep -ni 'cloud api\|banimento' README.md
  ```

---

## 4. Bugs e defeitos funcionais

### BUG-01 · Validação `/[0|1|2]/` aceita mensagem inválida e derruba o handler · [P1]

- **Arquivo:** `src/stages/1.js:9` (regex), `src/stages/1.js:15` (`options[Number(message)]()`)
- **Evidência:**
  ```javascript
  const isMsgValid = /[0|1|2]/.test(message)      // aceita '10', 'a|b', 'x1y'
  if (isMsgValid) {
    const option = options[Number(message)]()     // options[10] === undefined → TypeError
  ```
  `Number("10")=10` → `undefined()` lança; `Number("abc")=NaN` → `options[NaN]` undefined → também lança (mensagem "a1" passa no regex!).
- **Impacto:** qualquer cliente que digitar "10", "2021", "pedido com 1" (contém 1) etc. provoca exceção — a conversa daquele número trava (o `catch` do `server.js` só loga).
- **Mudança:** validação estrita: `/^[0-2]$/` (âncoras, só dígito) **e** guarda `const option = options[n]; if (!option) ...` antes de chamar.
- **Aceite:** `"10"`, `"abc"`, `"|"` caem na mensagem de erro; `"0"/"1"/"2"` avançam; nenhuma exceção no log.
- **Verificação:**
  ```bash
  node --input-type=module -e "const re=/^[0-2]$/; console.log(re.test('10'), re.test('|'), re.test('2'))"
  grep -n '\^\[0-2\]\$' src/stages/1.js
  ```

### BUG-02 · `setSeconds(60)` não é "agora + 60s" · [P1]

- **Arquivo:** `src/stages/1.js:29`, `src/stages/5.js:20`
- **Evidência:** `endsIn: new Date().setSeconds(60)` — `setSeconds(60)` define o campo segundo para 60, que normaliza para **o próximo minuto cheio** (00s). Comentário diz "1 minute of inactivity".
- **Impacto:** timeout real entre ~0s e ~60s, dependendo do segundo atual; em 12:00:59 o "1 minuto" vira 1 segundo — atendimento cedo demais.
- **Mudança:** `endsIn: Date.now() + 60_000` (ms puro, igual a `startsIn: getTime()`); conferir todos os usos de `endsIn` (grep).
- **Aceite:** timeout constante de 60s em qualquer minuto do relógio.
- **Verificação:**
  ```bash
  grep -n 'setSeconds' src/ || echo OK
  ```

---

## 5. Qualidade: testes

### TEST-01 · Zero testes da máquina de estágios · [P2]

- **Arquivo:** *(ausente)* `test/`
- **Evidência:** sem `test` no `package.json` (só `start`/`dev`); nenhum arquivo de teste.
- **Impacto:** o `BUG-01` é exatamente um teste de transição "mensagem inválida → continua no estágio" que pegaria.
- **Mudança:** testes unitários **sem WhatsApp**: mockar `VenomBot` (sendText grava mensagens), simular sequência `0→1→2→…` e casos-limite (`"10"`, `"|"`, vazio, timeout).
- **Aceite:** ≥ 8 asserções cobrindo todas as transições de `stages/1..5`.
- **Verificação:**
  ```bash
  npm test 2>&1 | tail -3
  ```

---

## 6. DevOps / Infra

### IMP-01 · Estado em memória — reinício perde pedidos · [P1]

- **Arquivo:** `src/storage.js`
- **Evidência:** `export const storage = Object.create({})` — nenhum dump/disk.
- **Impacto:** crash/deploy no meio de um pedido perde o carrinho do cliente (etapa endereço/item) — para bot de vendas é perda de negócio.
- **Mudança:** snapshot periódico (JSON em disco a cada transição, `load` no boot) — mantendo a interface `storage[from]` (menor mudança possível).
- **Aceite:** reiniciar o processo com pedido em andamento → estado restaurado.
- **Verificação:**
  ```bash
  grep -n 'readFile\|writeFile' src/storage.js
  ```

### DEVOPS-01 · Sem CI/lint · [P2]

- **Arquivo:** *(ausente)* `.github/workflows/`
- **Evidência:** nenhum workflow; ESLint só como devDep (`@rocketseat/eslint-config`) sem script `lint`.
- **Impacto:** `BUG-01` (regex) sobreviveria a qualquer lint/teste — não há nenhum dos dois no fluxo.
- **Mudança:** workflow: `node --check src/*.js src/stages/*.js` + `eslint src` + `npm test` (quando existir).
- **Aceite:** PR com erro de sintaxe bloqueado.
- **Verificação:**
  ```bash
  npx eslint src/ 2>&1 | tail -3
  ```

### IMP-02 · Session name hardcoded · [P3]

- **Arquivo:** `src/server.js:7`
- **Evidência:** `session: 'Delícias da Neide'` literal (também vira nome exibido no menu — `stages/0.js:13`).
- **Impacto:** trocar de restaurante = editar código; credencial de sessão do Venom amarrada a nome com espaço/acentos.
- **Mudança:** `process.env.BOT_SESSION || 'Delícias-da-Neide'` (Evitar espaço na sessão do Venom) + nome de exibição separado (`BOT_DISPLAY_NAME`).
- **Aceite:** outra sessão sem editar código.
- **Verificação:**
  ```bash
  grep -n 'BOT_SESSION\|process.env' src/server.js
  ```

---

## 7. Documentação

### DOC-01 · README sem setup/riscos/persistência · [P2]

- **Arquivo:** `README.md`
- **Evidência:** (ler antes; checar se documenta instalação do Chrome/Chromium que o venom exige, o fluxo de QR code, e o risco de banimento `SEC-01`).
- **Impacto:** usuário novo não sabe o pré-requisito mais frágil (Chrome) nem o risco da conta.
- **Mudança:** seções "Pré-requisitos" (Chrome, Node 18+), "QR code/primeira sessão", "Riscos" (banimento, §9 do plano), "Estado/Persistência" (após `IMP-01`).
- **Aceite:** terceiro sobe o bot e autentica pelo README.
- **Verificação:**
  ```bash
  grep -ni 'chrome\|qr\|risco' README.md
  ```

---

## 8. Ordem de execução (waves)

### Wave 1 — Estabilidade (P1)
1. **`BUG-01`** — regex estrita + guarda de `options`.
2. **`BUG-02`** — timeout correto.
3. **`IMP-01`** — persistência do storage.

### Wave 2 — Risco/qualidade (P1/P2)
4. **`SEC-01`** — decisão venom vs Cloud API registrada.
5. **`TEST-01`** — testes dos estágios (travam `BUG-01`).
6. **`DEVOPS-01`** + **`DOC-01`**.

### Wave 3 — Polish (P3)
7. **`IMP-02`** — env da sessão.

**Dependências:** `TEST-01` depois de `BUG-01`/`BUG-02` (os testes cobrem o comportamento novo) · `DOC-01` depois de `IMP-01` (documenta a persistência real).

---

## 9. Fora de escopo / riscos

| Item | Decisão | Motivo |
|---|---|---|
| Migrar para WhatsApp Cloud API oficial | **Decisão de produto** | Melhor caminho longo, mas muda custo/fluxo — registrar como opção no `SEC-01`, não fazer como "correção". |
| Auto-resposta para TODO qualquer mensagem | **Não** | Fluxo por estágio é intencional. |
| Adicionar pagamento no bot | **Não, aqui** | vira surface de dinheiro (PCI/LGPD) — projeto separado. |
| Escalar multi-restaurante | **Não** | `storage[from]` por número não tem noção de tenant. |

**Riscos:**

- Venom usa Chrome real — em servidor sem display, `xvfb` é necessário (documentar no `DOC-01`).
- Número real em teste pode ser banido — usar número de teste.

---

## 10. Definição de pronto (DoD)

**Funcional**
- [ ] `BUG-01` — `"10"`/`"|"`/`"a1"` caem no erro; `"0-2"` avançam; sem TypeError
- [ ] `BUG-02` — timeout = 60s constantes (sem `setSeconds`)

**Estabilidade/risco**
- [ ] `IMP-01` — estado sobrevive a reinício
- [ ] `SEC-01` — decisão documentada no README

**Qualidade/doc**
- [ ] `TEST-01` — ≥ 8 asserções de transição
- [ ] `DEVOPS-01` — CI com syntax+lint
- [ ] `DOC-01` — README completo
- [ ] `IMP-02` — sessão via env

**Validação final:**
```bash
node --check src/server.js && npx eslint src/ 2>&1 | tail -2
npm test 2>&1 | tail -3
grep -n '\^\[0-2\]\$' src/stages/1.js && grep -rn 'setSeconds' src/ || echo OK
```

---

*Fim do plano. Gerado por leitura direta do código em 2026-10-05. Nenhum item já estava corrigido — todos apontam para defeitos ainda presentes.*
