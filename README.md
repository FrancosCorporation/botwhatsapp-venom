# Bot de pedidos — Delícias da Neide

Bot de pedidos pelo WhatsApp, com escolha de sabores, endereço e uma etapa de atendimento. Este repositório é um fork mantido pela FrancosCorporation.

## Requisitos

- Node.js 22.13 ou superior.
- Corepack e Yarn Classic (a versão usada pelo `yarn.lock` é 1.22).
- Acesso à internet na primeira inicialização para o Venom baixar o Chromium que ele usa.
- Linux precisa das bibliotecas de sistema exigidas pelo Chromium. O bot roda em modo headless.

## Instalação e primeira conexão

```bash
git clone https://github.com/FrancosCorporation/botwhatsapp-venom.git
cd botwhatsapp-venom
PUPPETEER_SKIP_DOWNLOAD=true corepack yarn install --frozen-lockfile --ignore-scripts
cp .env.example .env
corepack yarn dev
```

Na primeira execução, aguarde o Chromium iniciar e escaneie o QR code exibido no terminal com o WhatsApp do número usado pelo bot. A sessão fica em `.private/tokens/` e será reutilizada nas próximas execuções. Mantenha essa pasta privada e fora de backups compartilhados: ela contém credenciais de sessão. Uma pasta legada `tokens/` é movida para esse local na inicialização; se as duas pastas já existirem, o bot para sem sobrescrever sessões.

Para iniciar sem o modo de desenvolvimento, use `corepack yarn start`.

## Configuração

| Variável | Padrão | Uso |
|---|---|---|
| `BOT_SESSION` | `Delicias-da-Neide` | Identificador local da sessão; use letras, números, ponto, hífen ou sublinhado. |
| `BOT_DISPLAY_NAME` | `Delícias da Neide` | Nome exibido nas mensagens do bot. |
| `BOT_DATA_FILE` | `data/storage.json` | Caminho do arquivo local que guarda carrinhos e atendimentos em andamento. |

O arquivo `.env` é carregado pelos comandos `start` e `dev`; não o versione. O exemplo em `.env.example` contém apenas valores públicos de configuração. `BOT_DATA_FILE` pode apontar para outro caminho; trate o arquivo como dado privado.

Os dados de pedidos ficam em JSON no disco e sobrevivem a reinícios. O arquivo e a pasta são criados com permissões restritas no Linux e a pasta `data/` é ignorada pelo Git. O conteúdo inclui número de WhatsApp, endereço e itens do pedido; proteja o arquivo e os backups conforme a política de privacidade da empresa. O armazenamento local foi feito para uma única instância do bot.

## Fluxo atual

1. `1` mostra o cardápio; `2` mostra as taxas por bairro; `0` ativa o modo de atendimento. O código não integra essa etapa a um atendente humano.
2. Durante a escolha, `1` a `5` adicionam sabores, `#` avança para o endereço e `*` cancela.
3. No endereço, `*` cancela. Depois, o cliente informa pagamento e troco.
4. O atendimento é encerrado com `ENCERRAR` ou após 60 segundos sem mensagem quando o cliente voltar a interagir.

O tempo limite é verificado quando chega uma mensagem. O bot não envia uma mensagem proativa ao completar os 60 segundos.

## Risco do canal WhatsApp

`venom-bot` automatiza o WhatsApp Web por um cliente não oficial. Esse método pode deixar de funcionar e pode levar à restrição do número. A dependência foi mantida em `4.3.7`: na comparação local, a versão publicada `5.3.0` manteve Puppeteer 21 e elevou os achados da auditoria para 6 críticos e 176 altos. Não atualize o cliente sem revisar o grafo e exercitar a conexão com um número de teste.

Foram aplicadas resoluções para dependências indiretas compatíveis e para a correção crítica de `form-data`. Em 11/10/2026, `yarn audit` apontou 0 críticos, 27 altos, 9 moderados e 4 baixos. Os advisories de [`braces`](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) e [`extract-zip`](https://github.com/advisories/GHSA-jmr9-qjv8-65gv) não listam versões corrigidas. A substituição da extração por uma resolução alternativa está descrita abaixo.

O Venom 4.3.7 aplica permissões `0777` à pasta e ao arquivo de token. O wrapper guarda tudo em `.private/` com modo `0700`, move a pasta legada `tokens/` sem sobrescrever dados e restringe novamente as permissões depois da inicialização. A pasta `.private/` está fora do Git.

Para uma operação de produção, avalie migrar para a WhatsApp Business Cloud API oficial. A migração depende de decisão de produto, configuração da conta e credenciais próprias; não faz parte deste bot.

## Verificações de código

```bash
corepack yarn run audit:critical
corepack yarn run check
```

`audit:critical` consulta o audit do Yarn Classic e bloqueia a CI somente se encontrar vulnerabilidades críticas; alertas graves, moderados e baixos continuam listados no plano enquanto não houver correções compatíveis para a cadeia do Venom/Puppeteer. `check` executa ESLint e checagem sintática dos arquivos JavaScript. O teste de extração cobre ZIPs normais e tentativas de escape.

### Extração de arquivos

A resolução de `extract-zip` usa `@electron-internal/extract-zip` com Node 22.13 ou superior. O pacote é destinado ao projeto Electron e seu uso externo não é oficialmente suportado; verificações locais cobrem ZIP normal, traversal e escape por symlink. A confirmação de fechamento dos alertas depende da reanálise do GitHub.

Execute `corepack yarn test:extract` para verificar os casos de extração.
