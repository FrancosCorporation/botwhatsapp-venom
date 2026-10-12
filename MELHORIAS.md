# MELHORIAS — botwhatsapp-venom

> **Gerado por análise de código em 2026-10-05** · Stack: Node ESM + venom-bot 4.3.7 (bot de pedidos, estágios)
> Branch `master` · 7 módulos em src/ · estado JSON local · lint/sintaxe em CI · testes pendentes
>
> **Este arquivo é um plano de execução.** Cada item tem ID, `arquivo:linha`, mudança exata, critério de aceite e comando de verificação.

---

## 0. Como usar este documento

1. Execute na ordem **P0 → P1 → P2 → P3**, respeitando as ondas da §8.
2. Ao terminar um item: marque `- [x]`, rode o **Verificação**, comite `fix(<ID>): descrição`.
3. O fluxo não tem testes automatizados (`TEST-01`); a política desta execução não autorizou adicionar ou executar testes.
4. **Idioma:** português.

---

## 1. Diagnóstico executivo

Bot de WhatsApp ("Delícias da Neide", assistente Carlos) com máquina de estágios (inicial → cardápio → bairro → endereço → atendimento). O estado por número é persistido em `data/storage.json`.

**O que está bem (não regredir):**

| Item | Evidência |
|---|---|
| Separação clara de estágios (arquivos 0-5) | `src/stages/` |
| Singleton do bot com estado privado (#) | `src/venom.js` |
| Ignora mensagens de grupo | `src/server.js:17` |
| Fallback de primeira mensagem cria o registro | `src/stages.js:40-50` |
| Bairro como dados separados | `src/stages/neighborhoods.js` |

**Defeitos encontrados na análise inicial (corrigidos nesta rodada):**

1. **Validação permissiva de opções:** as regex dos estágios 1 e 2 aceitavam texto parcial; `"10"` podia selecionar uma opção inexistente e derrubar o handler. Agora os dois estágios aceitam apenas opções completas e conhecidas.
2. **Estado só em memória:** reiniciar o processo perdia pedidos em andamento. Agora há leitura no boot e gravação JSON atômica após cada mensagem processada.
3. **Timeout incorreto:** `setSeconds(60)` nos estágios 1, 4 e 5 apontava para o próximo minuto. Agora o prazo usa 60 segundos desde o instante atual.
4. O cliente Venom continua não oficial e a conta pode sofrer restrição (§9). A API oficial continua sendo a alternativa de produção.

---

## 2. Tabela de prioridades

| ID | Título | Sev | Arquivo | Depende de |
|---|---|---|---|---|
| BUG-01 | Validação de opção aceita texto parcial e opção inexistente | **P1** | `src/stages/1.js`, `src/stages/2.js` | — |
| BUG-02 | Timeout de inatividade calculado errado (`setSeconds(60)`) | **P1** | `src/stages/1.js`, `src/stages/4.js`, `src/stages/5.js` | — |
| BUG-03 | Consulta de taxa reinicia o menu e repete a saudação | **P2** | `src/stages/1.js` | — |
| IMP-01 | Estado em memória — reinício perde pedidos | **P1** | `src/storage.js` | — |
| SEC-01 | Venom não oficial e cadeia de dependências vulnerável | **P1** | `package.json` | — |
| SEC-02 | Venom grava tokens com permissões `0777` | **P1** | `src/venom.js` | SEC-01 |
| TEST-01 | Zero testes da máquina de estágios | **P2** | *(ausente)* | BUG-01 |
| BUG-04 | Arquivo temporário de persistência podia reutilizar nome/PID antigo | **P1** | `src/storage.js` | IMP-01 |
| DEVOPS-01 | Sem CI/lint | **P2** | `.github/workflows/ci.yml`, `package.json` | — |
| DEVOPS-02 | CI não bloqueia novas vulnerabilidades críticas | **P1** | `.github/workflows/ci.yml` | SEC-01 |
| DOC-01 | README — setup, riscos, persistência | **P2** | `README.md` | IMP-01 |
| IMP-02 | Session name hardcoded (`'Delícias da Neide'`) | **P3** | `src/server.js:7` | — |

---

## 3. Segurança

### SEC-01 · Cliente WhatsApp não-oficial (venom-bot) · [P1]

- **Arquivo:** `package.json` (`"venom-bot": "4.3.7"`)
- **Evidência:** venom-bot automatiza o WhatsApp Web via Puppeteer e não é a API oficial. A versão publicada 5.3.0 também usa Puppeteer 21; no teste local da cadeia, ela elevou os achados de 1 para 6 críticos e de 122 para 176 altos.
- **Impacto:** a conta pode sofrer restrição; a cadeia antiga mantém vulnerabilidades sem correção publicada.
- **Mudança:** manter `4.3.7` por enquanto, aplicar resoluções pontuais para vulnerabilidades transitivas, proteger a pasta de sessão e documentar a migração futura para a **WhatsApp Business Cloud API** oficial.
- **Aceite:** decisão e limites documentados no README; auditoria sem vulnerabilidades críticas; migração oficial registrada como decisão de produto.
- **Verificação:**
  ```bash
  grep -n 'venom-bot\|resolutions' package.json && grep -ni 'cloud api\|restrição\|risco' README.md
  ```

### SEC-02 · Venom publica permissões `0777` para tokens · [P1]

- **Evidência:** Venom 4.3.7 executa `chmodSync(..., '777')` na pasta `tokens/` e no arquivo `<sessão>.data.json` ao salvar a sessão.
- **Impacto:** tokens de autenticação podem ficar acessíveis a outros usuários locais se depender apenas do `chmod` posterior do wrapper.
- **Mudança:** guardar `tokens/` dentro de `.private/` com modo `0700`, mover a pasta legada sem sobrescrever dados, falhar de forma segura se origem e destino já existirem, e reaplicar permissões no wrapper.
- **Aceite:** nenhum caminho de sessão fica atravessável por outros usuários locais no Linux; pasta `.private/` ignorada pelo Git.
- **Verificação:** checagem sintática e inspeção estática do caminho passado em `mkdirFolderToken`; não abrir uma sessão real nesta tarefa.

### BUG-04 · Arquivo temporário fixo podia ser reutilizado · [P1]

- **Evidência:** o temporário usava somente o PID do processo e era aberto com `'w'`, que reutiliza um arquivo existente.
- **Impacto:** um temporário residual ou link simbólico no diretório de estado podia ser sobrescrito em vez de rejeitado.
- **Mudança:** gerar nome aleatório criptográfico por gravação, criar em modo exclusivo (`'wx'`) e só remover o temporário quando esta execução realmente o criou.
- **Aceite:** cada gravação usa um caminho novo e exclusivo com modo `0600`.
- **Verificação:** checagem sintática e ESLint; não executar testes.

---

## 4. Bugs e defeitos funcionais

### BUG-01 · Validação permissiva aceita opção inválida nos estágios 1 e 2 · [P1]

- **Arquivo:** `src/stages/1.js` (regex/opções), `src/stages/2.js` (regex/cardápio)
- **Evidência:**
  ```javascript
  const isMsgValid = /[0|1|2]/.test(message)      // aceita '10', 'a|b', 'x1y'
  if (isMsgValid) {
    const option = options[Number(message)]()     // options[10] === undefined → TypeError
  ```
  `Number("10")=10` → `undefined()` lança; `Number("abc")=NaN` → `options[NaN]` undefined → também lança (mensagem "a1" passa no regex!).
- **Impacto:** qualquer cliente que digitar "10", "2021", "pedido com 1" (contém 1) etc. provoca exceção — a conversa daquele número trava (o `catch` do `server.js` só loga).
- **Mudança:** validação exata nos dois estágios e guarda de opção/cardápio antes de acessar. O estágio 2 só aceita `1` a `5`, `#` e `*`.
- **Aceite:** `"10"`, `"abc"`, `"|"` e opções fora do cardápio recebem erro sem TypeError; entradas completas mantêm o estágio correto.
- **Verificação:**
  ```bash
  grep -nE '\^\[0-2\]\$|\^\(\?:\[1-5\]\|#\|\\\*\)\$' src/stages/1.js src/stages/2.js
  ```

### BUG-02 · `setSeconds(60)` não é "agora + 60s" · [P1]

- **Arquivo:** `src/stages/1.js`, `src/stages/4.js`, `src/stages/5.js`
- **Evidência:** `endsIn: new Date().setSeconds(60)` define o segundo para 60 e normaliza para o próximo minuto cheio, em vez de somar 60 segundos.
- **Impacto:** timeout real entre ~0s e ~60s, dependendo do segundo atual; em 12:00:59 o "1 minuto" vira 1 segundo — atendimento cedo demais.
- **Mudança:** usar `INACTIVITY_TIMEOUT_MS` e `Date.now() + INACTIVITY_TIMEOUT_MS` em todos os caminhos de atendimento.
- **Aceite:** timeout constante de 60s em qualquer minuto do relógio.
- **Verificação:**
  ```bash
  grep -n 'setSeconds' src/ || echo OK
  ```

### BUG-03 · Consultar taxa de entrega repete a saudação · [P2]

- **Arquivo:** `src/stages/1.js`
- **Evidência:** a opção `2` mostrava a tabela de bairros e definia `nextStage: null`; o fallback levava o contato ao estágio inicial e enviava a saudação novamente.
- **Mudança:** manter o contato no menu depois de exibir as taxas.
- **Aceite:** a resposta de taxas aparece uma vez e `1`/`0` continuam disponíveis.
- **Verificação:** `grep -n 'nextStage: STAGES.MENU' src/stages/1.js`

---

## 5. Qualidade: testes

### TEST-01 · Zero testes da máquina de estágios · [P2]

- **Arquivo:** *(ausente)* `test/`
- **Evidência:** sem `test` no `package.json` (só `start`/`dev`); nenhum arquivo de teste.
- **Impacto:** o `BUG-01` é exatamente um teste de transição "mensagem inválida → continua no estágio" que pegaria.
- **Mudança:** adicionar testes unitários **sem WhatsApp**: mockar `VenomBot` e cobrir transições e entradas-limite.
- **Aceite:** ≥ 8 asserções cobrindo todas as transições de `stages/1..5`.
- **Estado:** pendente. A instrução desta execução proíbe adicionar ou executar testes sem pedido explícito.
- **Verificação futura:**
  ```bash
  npm test 2>&1 | tail -3
  ```

---

## 6. DevOps / Infra

### IMP-01 · Estado em memória — reinício perde pedidos · [P1]

- **Arquivo:** `src/storage.js`
- **Evidência:** `export const storage = Object.create({})` — nenhum dump/disk.
- **Impacto:** crash/deploy no meio de um pedido perde o carrinho do cliente (etapa endereço/item) — para bot de vendas é perda de negócio.
- **Mudança:** carregar JSON no boot e gravar arquivo temporário seguido de rename atômico após cada mensagem processada; limitar permissões do arquivo e da pasta.
- **Aceite:** pedido em andamento é restaurado; arquivo fica privado e JSON inválido interrompe a inicialização sem apagar o estado.
- **Verificação:**
  ```bash
  grep -n 'readFileSync\|writeFileSync\|renameSync' src/storage.js
  ```

### DEVOPS-01 · Sem CI/lint · [P2]

- **Arquivo:** `.github/workflows/ci.yml`, `package.json`
- **Evidência:** não havia workflow nem script de lint.
- **Impacto:** erros sintáticos não eram barrados por CI.
- **Mudança:** workflow Node 22 com `yarn run check` (ESLint 10 e `node --check`); instalação de CI pula scripts de download de navegador.
- **Aceite:** PR com erro de sintaxe bloqueado.
- **Verificação:**
  ```bash
  corepack yarn run check
  ```

### IMP-02 · Session name hardcoded · [P3]

- **Arquivo:** `src/server.js:7`
- **Evidência:** `session: 'Delícias da Neide'` literal (também vira nome exibido no menu — `stages/0.js:13`).
- **Impacto:** trocar de restaurante = editar código; credencial de sessão do Venom amarrada a nome com espaço/acentos.
- **Mudança:** ler `BOT_SESSION` e `BOT_DISPLAY_NAME` do `.env.example`; validar o identificador antes de abrir a sessão e proteger `tokens/` com permissão `0700`.
- **Aceite:** outra sessão sem editar código.
- **Verificação:**
  ```bash
  grep -n 'BOT_SESSION\|process.env' src/server.js
  ```

---

## 7. Documentação

### DOC-01 · README sem setup/riscos/persistência · [P2]

- **Arquivo:** `README.md`
- **Evidência:** o README antigo não informava o QR, a persistência local, o `.env` nem o risco do cliente não oficial.
- **Impacto:** quem instala não sabe onde ficam os dados e a sessão nem quais limites operacionais existem.
- **Mudança:** documentar Node 22.13+, primeiro QR, sessão, variáveis, persistência, risco de restrição e migração para a Cloud API.
- **Aceite:** terceiro sobe o bot e autentica pelo README.
- **Verificação:**
  ```bash
  grep -ni 'chromium\|qr\|risco\|cloud api\|storage.json' README.md
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
6. **`DEVOPS-02`** — audit de dependências com bloqueio para críticas.
7. **`DEVOPS-01`** + **`DOC-01`**.

### Wave 3 — Polish (P3)
8. **`IMP-02`** — env da sessão.

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

- Venom baixa Chromium e o executa headless; o host Linux ainda precisa das bibliotecas de sistema do Chromium.
- O Venom 4.3.7 ainda aplica `0777` dentro de `.private/tokens`; o diretório pai `0700` mantém os arquivos inacessíveis a outros usuários no Linux.
- Número real em teste pode ser banido — usar número de teste.

---

## 10. Definição de pronto (DoD)

**Funcional**
- [x] `BUG-01` — `"10"`/`"|"`/`"a1"` caem no erro; `"0"` a `"2"` avançam; sem TypeError
- [x] `BUG-02` — timeout = 60s constantes (sem `setSeconds`)
- [x] `BUG-03` — consulta de taxa mantém o menu sem repetir a saudação

**Estabilidade/risco**
- [x] `IMP-01` — estado carregado no boot e gravado atomicamente com permissões privadas
- [x] `SEC-01` — risco, auditoria e decisão de migração documentados no README
- [x] `SEC-02` — permissões amplas internas do Venom isoladas sob `.private/0700` com migração legada segura
- [x] `BUG-04` — temporário de estado único por gravação, criação exclusiva e modo `0600`

**Qualidade/doc**
- [ ] `TEST-01` — ≥ 8 asserções de transição
- [x] `DEVOPS-01` — CI com sintaxe e lint
- [x] `DEVOPS-02` — CI falha para vulnerabilidade crítica e registra a contagem do audit
- [x] `DOC-01` — README completo
- [x] `IMP-02` — sessão e nome via env

**Validação final:**
```bash
corepack yarn run audit:critical
corepack yarn run check
grep -n 'INACTIVITY_TIMEOUT_MS' src/stages/{1,4,5,index}.js && ! rg -n 'setSeconds' src/
git diff --check
```

## 11. Auditoria de acompanhamento — 2026-10-11

- O commit base `d6edc42` está em `origin/master`; a execução CI `38159586014` passou em sintaxe/lint. O workflow não tinha uma verificação de dependências e usava `ubuntu-latest`; agora a CI bloqueia findings críticos e fixa `ubuntu-24.04`.
- O audit local atual tem 0 críticas, 27 altas, 9 moderadas e 4 baixas. O Yarn Classic retorna código não zero para qualquer severidade; `--level` filtra a tabela e não altera o código de saída. `scripts/check-critical-audit.mjs` valida o resumo, confere o código bitmask e falha somente se o audit estiver inconsistente ou houver crítica. [Referência do Yarn Classic](https://classic.yarnpkg.com/lang/en/docs/cli/audit/).
- SEC-02 corrige a exposição de sessão do Venom 4.3.7: a biblioteca usa `0777`, então o wrapper passa a guardar os dados abaixo de `.private/0700` e migra a pasta antiga apenas quando o destino ainda não existe. A sessão real não foi aberta.
- BUG-04 usa um temporário criptograficamente único, criado com `wx` e modo `0600`, evitando reutilizar arquivo residual/link simbólico.
- ESLint, `node --check`, `audit:critical` (0 críticas) e `git diff --check` passaram. Não foram adicionados/executados testes nem iniciado um cliente WhatsApp.

---

*Plano gerado em 2026-10-05 e atualizado em 2026-10-11. `TEST-01` permanece pendente; os demais itens implementáveis desta rodada estão concluídos.*
