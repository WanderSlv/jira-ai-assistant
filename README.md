# 🚀 Jira AI Assistant

> Assistente inteligente e local para transformar relatos informais, prints e logs em chamados completos e canônicos no Jira com **1 único clique**, preenchendo automaticamente títulos, descrições ricas, número do chamado, produto, prioridade, cliente e representante via extensão do Chrome compatível com componentes React-Select (Atlaskit).

---

## 📋 Sumário
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Dependências e Pré-requisitos](#-dependências-e-pré-requisitos)
- [Instalação e Execução do Servidor](#-instalação-e-execução-do-servidor)
- [Tutorial: Instalação da Extensão do Chrome](#-tutorial-instalação-da-extensão-do-chrome)
- [Como Utilizar no Dia a Dia](#-como-utilizar-no-dia-a-dia)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Testes Automatizados](#-testes-automatizados)

---

## ✨ Funcionalidades Principais

- **Geração Canônica de Chamados**: Transforma explicações brutas, áudios transcritos ou logs em chamados bem estruturados com título sucinto, comportamento esperado, comportamento observado, passos para reproduzir e análise técnica.
- **Suporte a Multi-Provedores de IA**:
  - **Google Gemini**: Suporte nativo a `gemini-3.8-flash`, `gemini-1.5-flash`, `gemini-1.5-pro` ou modelos customizados com teste de chave integrado.
  - **Ollama Local**: Suporte a modelos locais offline (ex: `llama3`, `mistral`, `deepseek-r1`).
  - **Fallback Inteligente**: Funciona mesmo sem nenhuma chave de API configurada, extraindo metadados e formatando o card com regras locais determinísticas.
- **Upload e Análise de Imagens / Prints**: Suporte a colar ou anexar capturas de tela (PNG/JPEG) que são analisadas multimodalmente pela IA.
- **Extensão do Chrome com Injeção Direta**:
  - Detecta automaticamente formulários do Jira (ex: `/form/34`, modais e portais Atlassian).
  - Preenche campos de texto nativos e editores ricos.
  - Interage com dropdowns assíncronos **React-Select (Atlaskit)** para selecionar Produto, Prioridade, Cliente e fixar o Representante (Wander).
  - Adiciona um botão flutuante **`⚡ Preencher com Jira AI`** diretamente na interface do Jira.

---

## 📦 Dependências e Pré-requisitos

### Para rodar a aplicação:
1. **Node.js**: Versão 18.x ou superior (testado com Node.js 18, 20 e 22).
2. **NPM**: Gerenciador de pacotes incluso no Node.js.
3. **Navegador Web**: Google Chrome, Brave, Microsoft Edge ou qualquer navegador baseado em Chromium com suporte a extensões Manifest V3.

### Dependências do Node.js (instaladas via `package.json`):
- `express` (^4.21.0): Servidor HTTP local para APIs e interface estática.
- `dotenv` (^16.4.5): Gerenciamento de variáveis de ambiente.

### Opcional:
- Chave de API da Google AI Studio (`GEMINI_API_KEY`) para respostas inteligentes avançadas com Gemini.
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
   *Você também pode configurar a chave do Gemini diretamente pelo modal de configurações na interface web.*

4. **Inicie o servidor:**
   ```bash
   npm start
   ```
   O servidor estará disponível em: **`http://localhost:3000`**

---

## 🧩 Tutorial: Instalação da Extensão do Chrome

A extensão permite preencher o chamado diretamente na aba do Jira com 1 clique, sem necessidade de copiar e colar scripts no console do DevTools.

### Passo 1: Acesse a tela de Extensões do Navegador
Abra o Google Chrome (ou Brave / Edge) e acesse:
```text
chrome://extensions
```

### Passo 2: Habilite o Modo do Desenvolvedor
No canto superior direito da página, ative o botão deslizante **"Modo do desenvolvedor"** (*Developer mode*).

### Passo 3: Carregar a Extensão
1. No canto superior esquerdo, clique no botão **"Carregar sem compactação"** (*Load unpacked*).
2. Navegue até o diretório do projeto e selecione a pasta:
   ```text
   /home/wander/jira-ai-assistant/extension
   ```
   *(Ou a pasta `extension/` dentro do caminho onde você clonou o repositório)*.
3. Clique em **Selecionar pasta**.

### Passo 4: Fixe a Extensão na Barra de Tarefas
1. Clique no ícone de peça de quebra-cabeça (Extensões) ao lado da barra de endereços do Chrome.
2. Localize **Jira AI Assistant - Preenchimento Automático** e clique no ícone de alfinete (Fixar) para deixá-la sempre visível.

---

## 💡 Como Utilizar no Dia a Dia

```
┌─────────────────────────────────┐         ┌──────────────────────────────────┐
│   1. Interface Local            │         │   2. Aba do Jira no Navegador    │
│   http://localhost:3000         │ ──────> │   https://*.atlassian.net/...    │
│   Gera o card com IA / Fallback │  Sync   │   Botão flutuante ou extensão    │
│   e salva no storage da extensão│         │   preenche com 1 clique!         │
└─────────────────────────────────┘         └──────────────────────────────────┘
```

1. **Crie ou refine o chamado no assistente:**
   - Acesse `http://localhost:3000`.
   - Cole o relato bruto, logs ou informações do chamado na caixa de texto.
   - Opcionalmente, anexe ou cole prints de evidências.
   - Clique em **"Melhorar com IA"** ou pressione `Ctrl + Enter`.
   - O assistente extrai automaticamente cliente, produto, número do chamado e define prioridade e representante.
2. **Sincronização Automática:**
   - Ao gerar o card, a extensão sincroniza os dados instantaneamente em segundo plano.
3. **Preencha no Jira:**
   - Acesse a página de criação de chamado do seu Jira (ex: formulário de bug `/form/34`).
   - Um botão flutuante **`⚡ Preencher com Jira AI`** aparecerá no canto inferior direito da tela.
   - Clique no botão (ou abra o popup da extensão e clique em **"Preencher nesta Aba do Jira"**).
   - O título, descrição formatada, número de chamado e os seletores React-Select (Produto, Prioridade, Cliente e Representante Wander) serão preenchidos e confirmados sozinhos!

---

## 📂 Estrutura do Projeto

```text
jira-ai-assistant/
├── extension/                   # Extensão Manifest V3 para Chrome/Chromium
│   ├── manifest.json            # Manifesto e permissões da extensão
│   ├── content_jira.js          # Injetado no Jira para automação dos inputs e React-Select
│   ├── content_assistant.js     # Injetado no localhost:3000 para sincronização de dados
│   ├── inpage_fiber.js          # Injeção no contexto da página para seletores React
│   ├── popup.html / popup.js    # Popup da barra de ferramentas do navegador
│   └── icons/                   # Ícones da extensão (16, 48, 128)
├── public/                      # Frontend do assistente local
│   ├── index.html               # Interface web com Tailwind CSS
│   ├── app.js                   # Lógica da UI, editor rico, IA e atalhos
│   ├── script_generator.js      # Gerador determinístico de preenchimento e fallbacks
│   └── styles.css               # Estilos complementares e customizações visuais
├── test/                        # Suíte de testes automatizados
│   ├── enhance.test.js          # Testes da API de inteligência artificial e extração
│   ├── frontend.test.js         # Testes de entrega dos ativos estáticos
│   ├── open_jira.test.js        # Testes de abertura do Jira
│   └── script_generator.test.js # Testes do gerador de scripts e seletores
├── presets.json                 # Modelos de prompts e diretrizes canônicas
├── server.js                    # Servidor Express, endpoints de IA e configuração
├── package.json                 # Metadados e scripts npm
└── README.md                    # Este guia de uso e instalação
```

---

## 🧪 Testes Automatizados

Para executar todos os testes automatizados da aplicação:

```bash
npm test
```

São 27 testes cobrindo:
- Endpoints da API Express (`/api/enhance`, `/api/config`, `/api/test-google-key`, `/api/open-jira`).
- Fallback determinístico na ausência de chaves de API.
- Extração de entidades (Produto, Cliente, Número de chamado, Representante).
- Conversão bidirecional Markdown ↔ HTML Jira.
- Entrega íntegra de assets de frontend.
