# 🚀 Jira AI Assistant

> Assistente inteligente e local para transformar relatos informais, prints e logs em chamados completos e canônicos no Jira com **1 único clique**, preenchendo automaticamente títulos, descrições ricas, número do chamado, produto, prioridade, cliente e **Representante do Cliente\*** via extensão do Chrome compatível com componentes React-Select (Atlaskit).

---

## 📋 Sumário
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Dependências e Pré-requisitos](#-dependências-e-pré-requisitos)
- [Instalação e Execução do Servidor](#-instalação-e-execução-do-servidor)
- [Tutorial: Instalação da Extensão do Chrome](#-tutorial-instalação-da-extensão-do-chrome)
- [Guia Passo a Passo: Como Utilizar a Ferramenta](#-guia-passo-a-passo-como-utilizar-a-ferramenta)
- [Campos Preenchidos Automaticamente no Jira](#-campos-preenchidos-automaticamente-no-jira)
- [Solução de Dúvidas e Problemas Frequentes](#-solução-de-dúvidas-e-problemas-frequentes)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Testes Automatizados](#-testes-automatizados)

---

## ✨ Funcionalidades Principais

- **Geração Canônica de Chamados**: Transforma explicações brutas, áudios transcritos ou logs em chamados técnicos no padrão oficial (Título canônico, Contexto, Comportamento Esperado, Comportamento Observado, Passos para Reprodução e Análise Técnica).
- **Suporte a Multi-Provedores de IA**:
  - **Google Gemini**: Suporte nativo a `gemini-3.8-flash`, `gemini-1.5-flash`, `gemini-1.5-pro` ou modelos customizados com teste de chave integrado.
  - **Ollama Local**: Suporte a modelos locais offline (ex: `llama3`, `mistral`, `deepseek-r1`).
  - **Fallback Inteligente**: Funciona perfeitamente mesmo sem nenhuma chave de API, extraindo metadados e formatando o card com regras locais determinísticas.
- **Upload e Análise Multimodal de Imagens**: Arraste, anexe ou cole com `Ctrl + V` prints de tela e logs de erro para enriquecer o contexto da IA.
- **Extensão do Chrome Manifest V3**:
  - Injeção direta e compatibilidade com modais, páginas normais e portais Jira Service Management (`/form/34`).
  - **Polling Assíncrono:** Aguarda ativamente o Jira buscar na API e renderizar a opção desejada na tela, disparando a sequência real de eventos de mouse (`PointerEvent` + `MouseEvent` + `Enter`).
  - **Reconhecimento Inteligente de Rótulos:** Encontra rótulos com asteriscos obrigatórios (`Representante do Cliente*`, `Produto*`, `Cliente*`).
  - **Detecção Automática da Aba do Jira:** Se você clicar no popup enquanto estiver em outra aba, a extensão localiza o Jira aberto, alterna para ele e executa o preenchimento.
  - **Botão Flutuante Verde:** Botão `⚡ Preencher com Jira AI` integrado diretamente na tela do Jira.

---

## 📦 Dependências e Pré-requisitos

### Para rodar a aplicação:
1. **Node.js**: Versão 18.x ou superior (testado com Node.js 18, 20, 22 e 24).
2. **NPM**: Gerenciador de pacotes incluso no Node.js.
3. **Navegador Web**: Google Chrome, Brave, Microsoft Edge ou Opera (qualquer navegador Chromium).

### Dependências do Node.js (instaladas via `package.json`):
- `express` (^4.21.0): Servidor HTTP local para APIs e interface estática.
- `dotenv` (^16.4.5): Gerenciamento de variáveis de ambiente.

### Opcional:
- Chave de API da Google AI Studio (`GEMINI_API_KEY`) para respostas avançadas com Gemini.
- Ollama instalado localmente se desejar inferência 100% offline.

---

## 🛠️ Instalação e Execução do Servidor

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/WanderSlv/jira-ai-assistant.git
   cd jira-ai-assistant
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente (opcional):**
   ```bash
   cp .env.example .env
   ```
   *Dica: Você também pode salvar sua chave Gemini diretamente pelo modal de configurações na própria interface web.*

4. **Inicie o servidor:**
   ```bash
   npm start
   ```
   O portal estará disponível em: **`http://localhost:3000`**

---

## 🧩 Tutorial: Instalação da Extensão do Chrome

A extensão permite preencher o chamado diretamente na aba do Jira com **1 clique**, sem precisar abrir o DevTools ou colar códigos manualmente.

### Passo 1: Acesse a tela de Extensões do Navegador
Abra o Google Chrome e digite na barra de endereços:
```text
chrome://extensions
```

### Passo 2: Habilite o Modo do Desenvolvedor
No canto superior direito da página, ative o botão **"Modo do desenvolvedor"** (*Developer mode*).

### Passo 3: Carregar a Extensão
1. No canto superior esquerdo, clique no botão **"Carregar sem compactação"** (*Load unpacked*).
2. Selecione a pasta da extensão no seu computador:
   ```text
   /home/wander/jira-ai-assistant/extension
   ```
   *(Ou a pasta `extension/` dentro do diretório do projeto clonado)*.
3. Clique em **Selecionar pasta**.

### Passo 4: Fixe a Extensão na Barra de Tarefas
1. Clique no ícone de peça de quebra-cabeça (Extensões) ao lado da barra de endereços do Chrome.
2. Localize **Jira AI Assistant - Preenchimento Automático** e clique no ícone de alfinete (Fixar) para deixá-la sempre visível.

---

## 💡 Guia Passo a Passo: Como Utilizar a Ferramenta

```
┌─────────────────────────────────┐               ┌──────────────────────────────────┐
│   1. Portal Local               │               │   2. Aba do Jira no Navegador    │
│   http://localhost:3000         │ ────────────> │   https://*.atlassian.net/...    │
│   - Cole o relato bruto / prints│  Sincroniza   │   - Botão flutuante na página OU │
│   - Clique em "Melhorar com IA" │  em tempo     │   - Clique no ícone da extensão  │
│   - Ajuste os campos se desejar │  real         │   => Tudo preenchido com 1 clique│
└─────────────────────────────────┘               └──────────────────────────────────┘
```

### Passo 1: Acesse o Assistente Local
Abra o navegador e acesse **`http://localhost:3000`**.

### Passo 2: Digite ou Cole a Explicação Bruta
Na caixa **"Explicação Bruta"**, digite o relato informal do problema, cole logs ou mensagens recebidas do cliente.
> **Exemplo:**
> *"Identificado bug no chamado 45120 do cliente Unimed no ninachat. O atendente clica em enviar template ativo e a tela congela sem exibir mensagem de sucesso."*

### Passo 3: Anexe Prints ou Evidências (Opcional)
- Arraste arquivos de imagem para a área de prints ou simplesmente use **`Ctrl + V`** com um print na área de transferência.

### Passo 4: Gere o Chamado com IA
- Clique no botão **`✨ Melhorar com IA`** ou pressione o atalho **`Ctrl + Enter`**.
- A IA estruturará o chamado canônico e os metadados:
  - **Título sugerido**
  - **Descrição formatada**
  - **Número do chamado**
  - **Produto** (ex: `ninachat`)
  - **Prioridade** (ex: `Baixo` / `Médio` / `Alto`)
  - **Cliente** (ex: `Unimed`)
  - **Representante** (fixado como `Wander`)

### Passo 5: Preencha no Jira com 1 Clique (Escolha uma das 2 formas)

#### Forma A (Mais Rápida): Pelo Botão Flutuante Direto no Jira
1. Vá até a aba do seu chamado no Jira (ex: formulário de bug `/form/34` ou tela de criação).
2. Um botão flutuante verde **`⚡ Preencher com Jira AI`** estará visível no canto inferior direito da tela.
3. Dê **1 clique** no botão.
4. Pronto! O script preencherá todos os textos e selecionará automaticamente as opções dos seletores React.

#### Forma B: Pelo Popup da Extensão
1. Clique no ícone verde da extensão na barra de ferramentas do Chrome.
2. Veja o resumo dos dados sincronizados.
3. Clique em **`⚡ Preencher no Jira`**.
4. Se você estiver na aba do assistente ou em outra página, a extensão **localiza sua aba aberta do Jira, muda o foco para ela e preenche os campos automaticamente**!

#### Forma C (Alternativa sem extensão): Via Console (F12)
- Se preferir não usar a extensão, clique no botão **`📋 Copiar Código 1-Clique`** no assistente, abra o console do DevTools na página do Jira (`F12` -> `Console`), cole o código e aperte `Enter`.

---

## 🎯 Campos Preenchidos Automaticamente no Jira

| Campo no Formulário do Jira | Conteúdo Preenchido | Mecanismo de Preenchimento |
|---|---|---|
| **Título / Summary / Assunto** | Título canônico e objetivo | Disparo de eventos nativos de input |
| **Descrição / Description** | Relato técnico com negrito, código e listas | Injeção no editor rico (ProseMirror / Atlaskit) com fallback para textarea |
| **Número do chamado / Chamado** | Número extraído do texto ou `-` | Disparo de eventos nativos de input |
| **Produto** | `ninachat`, `ninaflow`, etc. | Pesquisa no React-Select + polling + clique real |
| **Prioridade** | `Baixo`, `Médio`, `Alto`, `Crítico` | Pesquisa no React-Select + polling + clique real |
| **Cliente** | Nome do cliente / conta identificada | Pesquisa no React-Select + polling + clique real |
| **Representante do Cliente\*** | **`Wander`** | Reconhecimento do rótulo `Representante do Cliente*`, pesquisa e seleção automática da opção |

---

## ❓ Solução de Dúvidas e Problemas Frequentes

### 1. "A extensão pesquisou o nome, mas não clicou na opção da lista"
- **Causa:** O Jira leva alguns milissegundos para carregar os usuários e itens pela rede após a digitação.
- **Solução:** A extensão possui **polling assíncrono ativo** que monitora o DOM por até 3,5 segundos, aguardando a opção real surgir na tela para disparar a sequência de `PointerEvent`, clique e confirmação por `Enter`.

### 2. "O campo Representante do Cliente* não foi preenchido"
- **Causa:** Rótulo no Jira possui asterisco de obrigatoriedade (`*`) ou pequenas variações de texto.
- **Solução:** O sistema utiliza normalização flexível e lista de apelidos que localiza o campo seja como `Representante do Cliente*`, `Representante` ou via atributo `for` do elemento HTML.

### 3. "Como atualizar a extensão após puxar novidades do Git?"
1. Acesse `chrome://extensions`.
2. No card do **Jira AI Assistant**, clique no botão **Recarregar 🔄**.
3. Atualize a página do Jira com `F5` e pronto!

---

## 📂 Estrutura do Projeto

```text
jira-ai-assistant/
├── extension/                   # Extensão Manifest V3 para Chrome/Chromium
│   ├── manifest.json            # Permissões, content_scripts e world: MAIN
│   ├── content_jira.js          # Injetado no Jira para preenchimento e clique no React-Select
│   ├── content_assistant.js     # Injetado no localhost:3000 para sincronização automática
│   ├── inpage_fiber.js          # Executado no contexto da página para disparar SyntheticEvents
│   ├── popup.html / popup.js    # Interface do popup com auto-detecção da aba do Jira
│   └── icons/                   # Ícones da extensão (16, 48, 128)
├── public/                      # Frontend do assistente local
│   ├── index.html               # Interface web com Tailwind CSS
│   ├── app.js                   # Lógica da UI, editor rico, IA e atalhos
│   ├── script_generator.js      # Gerador determinístico de preenchimento e fallbacks
│   └── styles.css               # Folha de estilos e customizações visuais
├── test/                        # Suíte de testes automatizados
│   ├── enhance.test.js          # Testes da API de IA e extração determinística
│   ├── frontend.test.js         # Testes de entrega dos ativos estáticos
│   ├── open_jira.test.js        # Testes de abertura do Jira
│   └── script_generator.test.js # Testes do gerador de scripts e seletores
├── presets.json                 # Modelos de prompts e diretrizes canônicas
├── server.js                    # Servidor Express, endpoints de IA e configuração
├── package.json                 # Metadados e scripts npm
└── README.md                    # Documentação completa de uso e instalação
```

---

## 🧪 Testes Automatizados

Para executar todos os 27 testes automatizados da aplicação:

```bash
npm test
```

Cobrem:
- Endpoints da API Express (`/api/enhance`, `/api/config`, `/api/test-google-key`, `/api/open-jira`).
- Fallback determinístico na ausência de chaves de API.
- Extração de entidades (Produto, Cliente, Número de chamado, Representante).
- Conversão bidirecional Markdown ↔ HTML Jira.
- Entrega íntegra de assets de frontend.
