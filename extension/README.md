# Extensão do Chrome: Jira AI Assistant

Extensão Manifest V3 para automação e preenchimento de chamados no Jira com 1 clique, incluindo seleção real em componentes React-Select (Atlaskit).

---

## 🚀 Como instalar no Google Chrome (1 minuto)

1. Abra o Google Chrome e acesse:
   ```text
   chrome://extensions
   ```
2. No canto superior direito, ative a chave **"Modo do desenvolvedor"** (*Developer mode*).
3. No canto superior esquerdo, clique no botão **"Carregar sem compactação"** (*Load unpacked*).
4. Selecione a pasta da extensão no seu computador:
   ```text
   /home/wander/jira-ai-assistant/extension
   ```
5. Pronto! O ícone verde do **Jira AI Assistant** aparecerá na barra de extensões do seu Chrome.

---

## 🎯 Como usar no dia a dia

### Método 1: Botão Flutuante Direto no Jira (Mais Rápido)
1. Abra o assistente no navegador: `http://localhost:3000`
2. Digite sua explicação bruta e gere o chamado com IA.
3. Abra ou acerte a aba do seu chamado no Jira (ex: formulário de bug `/form/34`).
4. Um botão flutuante **`⚡ Preencher com Jira AI`** aparecerá automaticamente no canto inferior da página do Jira.
5. Dê **1 clique** no botão:
   - Título e Descrição são preenchidos;
   - Número do chamado é preenchido;
   - **Produto**, **Prioridade**, **Cliente** e **Representante (Wander)** são abertos, buscados e clicados automaticamente via React-Select!

### Método 2: Pelo Ícone da Extensão
1. Na aba do chamado no Jira, clique no ícone da extensão no Chrome.
2. Veja o resumo dos dados sincronizados.
3. Clique em **"⚡ Preencher nesta Aba do Jira"**.
