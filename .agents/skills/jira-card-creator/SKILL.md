---
name: jira-card-creator
description: >-
  Criação canônica, formatação, envio para a extensão do Chrome (Jira AI Assistant em localhost:3000)
  e abertura de cards/chamados no Jira (Bugs, Hotfixes, Tarefas, Features) para a Nina Tecnologia,
  com metadados obrigatórios (Produto, Cliente, Representante Wander, Número do Chamado) e seções
  oficiais (História & Contexto, Reprodução, Comportamento Atual/Esperado, Evidências/Logs, Análise Técnica).
  Use esta skill sempre que o usuário solicitar criação, formatação ou abertura de cards no Jira,
  quando pedir para "incluir na extensão", "enviar para a extensão", "mandar para o Jira AI Assistant"
  ou "sincronizar com a extensão", ou quando o analisa-log (nina-log-analysis) concluir uma investigação
  de incidente e demandar abertura de chamado.
---

# 🚀 Jira Card Creator (Padrão Nina Tecnologia)

Skill especializada na estruturação, sincronização com a extensão do Chrome (**Jira AI Assistant**) e criação de chamados oficiais de engenharia no Jira da Nina Tecnologia (`ninatecnologia.atlassian.net`), com foco especial na conversão direta de relatos e diagnósticos do **`nina-log-analysis`** em cards de alta precisão técnica.

---

## 🛠️ Procedimento Operacional da IA

Quando acionada para criar, formatar ou enviar um card para a extensão/Jira, siga rigorosamente as etapas:

### 1. Ingestão e Mapeamento dos Dados

Colete as informações técnicas a partir de uma das seguintes origens:
- **Diagnóstico do `nina-log-analysis`:** Mapeie os 4 itens obrigatórios:
  1. *Evidência* ➔ `📸 Evidências & Logs` (timestamps, blocos, arquivos, linhas)
  2. *Interpretação* ➔ `📜 História & Contexto` e `❌ Comportamento Atual` / `✅ Comportamento Esperado`
  3. *Confiança* ➔ Avaliação de prioridade (**Alta** = `Alto` / `Hotfix`; **Média** = `Médio` / `Bug`; **Baixa** = `Baixo`)
  4. *Próxima verificação* ➔ `👨🏽‍💻 Análise Técnica` (ações recomendadas e hipóteses de causa raiz)
- **Relato Direto / Contexto do Usuário:** Extraia produto, cliente, número do chamado/conversa (se houver), prioridade, comportamento atual, comportamento esperado e passos para reprodução.

### 2. Formatação Canônica Obrigatória

O card gerado deve seguir os padrões documentados em:
- [Templates Oficiais de Cards](references/card_templates.md)
- [Mapeamento de Campos e Opções](references/field_mappings.md)
- [Exemplo de Conversão Log ➔ Card](examples/from_log_diagnosis.md)

#### Título Padrão
```text
[<Produto>] - <Resumo claro, técnico e objetivo>
```
*Exemplo:* `[NinaChat] - Timeout de 30s na integração Tasy ao confirmar agendamento no bloco api_agendamento`

#### Metadados e Campos Fixos
- **Representante do Cliente (`customfield_10388`):** SEMPRE **`Wander`** (AccountId: `712020:cd611e98-f544-49d8-8b38-030098aa7bfd`).
- **Produto (`customfield_10102`):** `NinaChat`, `HUB`, `Checkin`, `Plataforma`, `Portal`, `APP Paciente`, `Infraestrutura` ou `Interno`.
- **Cliente (`customfield_10520`):** Nome do cliente/hospital (ex: `MULTIMED`, `Unimed`) ou `Nina`.
- **Número do Chamado (`customfield_10521`):** ID da conversa investigada, número do protocolo ou `-`.
- **Projeto Padrão:** **`SD`** (Desenvolvimento) para bugs técnicos/hotfixes ou **`AUTO`** para automações.

### 3. Proteção LGPD e Sanitização
Antes de exibir, sincronizar ou enviar o card:
- **Anonimize CPFs:** Substitua por `***.XXX.XXX-**`.
- **Oculte Telefones e Senhas:** Nunca inclua credenciais, senhas, tokens ou dados sensíveis de pacientes na descrição do Jira.

---

### 4. Execução (Escolha conforme o pedido do usuário)

#### Método A: Incluir / Enviar para a Extensão do Chrome (Jira AI Assistant Local)
**Quando usar:** Sempre que o usuário disser *"incluir na extensão"*, *"enviar para a extensão"*, *"mandar para a extensão"*, *"colocar na extensão"*, *"sincronizar com o assistente"*, *"Jira AI Assistant"* ou *"preencher pela extensão"*.

**Como funciona:** A extensão do Chrome (`Jira AI Assistant`) lê automaticamente o último card salvo no servidor local em `http://localhost:3000/api/latest-card`. Para incluí-lo na extensão, envie o card para `POST http://localhost:3000/api/sync-card` por uma das duas formas abaixo:

1. **Envio direto via HTTP `POST http://localhost:3000/api/sync-card` (Preferido quando a IA já estruturou o título e descrição canônicos):**
   ```bash
   curl -sS -X POST http://localhost:3000/api/sync-card \
     -H "Content-Type: application/json" \
     -d '{
       "titulo": "[NinaChat] - Resumo técnico do problema",
       "descricao": "🤖 Produto & Área do produto\n...\n\n📜 História & Contexto\n...",
       "type": "bug",
       "source": "skill",
       "fields": {
         "Cliente": "Unimed",
         "Produto": "NinaChat",
         "Prioridade": "Alto",
         "Representante": "Wander",
         "NumeroChamado": "12345"
       }
     }'
   ```
   *(Use `"type": "bug"` para Bug/Hotfix ou `"type": "feature"` para Feature/Melhoria/Tarefa. Se estiver usando Python/`urllib` para evitar problemas de escape de aspas no shell, envie o JSON diretamente via `urllib.request`.)*

2. **Via Script Auxiliar da Skill (`--send` / `--sync`):**
   ```bash
   python3 ~/.gemini/antigravity-cli/skills/jira-card-creator/scripts/create_card.py \
     -t "<diagnostico_ou_texto>" --send
   ```
   *(Flags opcionais: `--product`, `--client`, `--ticket`, `--priority`, `--type`. Se estiver dentro do repositório `jira-ai-assistant`, também pode usar `.agents/skills/jira-card-creator/scripts/create_card.py`.)*

- **Verificação de resposta:** Confirme que a resposta retornou `"ok": true` (HTTP 200) e avise o usuário que o card já está disponível na extensão do Chrome (basta clicar no ícone da extensão ou no botão flutuante `⚡ Preencher com Jira AI` na aba do Jira).
- **Se `localhost:3000` estiver offline (`Connection refused`):** Informe claramente ao usuário que o servidor local do **Jira AI Assistant** não está rodando na porta `3000` (ele pode iniciá-lo com `npm start` em `/home/wander/jira-ai-assistant`) e apresente o card formatado em Markdown como fallback.

#### Método B: Criação Direta via Jira MCP (`jira_create_issue`)
**Quando usar:** Quando o usuário solicitar a abertura direta no Jira (*"crie direto no Jira"*, *"abra o chamado no Jira"*, *"pode criar o card"*) ou confirmar a prévia para criação via MCP.

```json
{
  "project_key": "SD",
  "issue_type": "Bug",
  "summary": "[NinaChat] - ...",
  "description": "...",
  "additional_fields": "{\"priority\": {\"name\": \"Alto\"}, \"customfield_10102\": [{\"value\": \"NinaChat\"}], \"customfield_10388\": {\"accountId\": \"712020:cd611e98-f544-49d8-8b38-030098aa7bfd\"}, \"customfield_10520\": [\"Cliente\"], \"customfield_10521\": \"12345\", \"labels\": [\"analisa-log\"]}"
}
```

#### Método C: Apenas Prévia / Formatação (sem envio automático)
**Quando usar:** Quando o usuário pedir apenas para *"formatar"*, *"montar"* ou *"gerar uma prévia"* sem especificar extensão nem abertura direta.
- Exiba o card formatado no padrão oficial (ou gere `--format mcp-args` / Markdown via `create_card.py`).
- Ao final, pergunte se deseja **(1) incluir na extensão do Chrome** ou **(2) criar direto no Jira via MCP**.

---

## 🤝 Integração com o `nina-log-analysis`

Quando o usuário estiver analisando logs com o `nina-log-analysis` e houver um diagnóstico conclusivo:
1. Apresente os 4 itens do diagnóstico.
2. Ao final, pergunte proativamente se deseja **incluir o card na extensão** ou **abrir direto no Jira**, ou apresente a prévia formatada do card.
3. Se o usuário pedir para incluir na extensão, execute o **Método A** (`POST http://localhost:3000/api/sync-card` ou `--send`).
4. Se o usuário pedir para criar direto no Jira (`"sim"`, `"crie o card"`, `"abra o chamado"`), execute o **Método B** (`jira_create_issue` no projeto `SD`) e retorne a URL do chamado criado (`https://ninatecnologia.atlassian.net/browse/<KEY>`).
