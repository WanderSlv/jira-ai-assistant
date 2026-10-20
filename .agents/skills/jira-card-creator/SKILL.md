---
name: jira-card-creator
description: >-
  Criação canônica e estruturação de cards/chamados no Jira (Bugs, Hotfixes, Tarefas)
  para a Nina Tecnologia, com metadados obrigatórios (Produto, Cliente, Representante Wander,
  Número do Chamado) e seções oficiais (História & Contexto, Reprodução, Comportamento Atual/Esperado,
  Evidências/Logs, Análise Técnica). Use esta skill sempre que o usuário solicitar criação,
  formatação ou abertura de cards no Jira, ou quando o analisa-log (nina-log-analysis)
  concluir uma investigação de incidente e demandar abertura de chamado.
---

# 🚀 Jira Card Creator (Padrão Nina Tecnologia)

Skill especializada na estruturação e criação de chamados oficiais de engenharia no Jira da Nina Tecnologia (`ninatecnologia.atlassian.net`), com foco especial na conversão direta de diagnósticos de logs do **`nina-log-analysis`** em cards de alta precisão técnica.

---

## 🛠️ Procedimento Operacional da IA

Quando acionada para criar ou sugerir um card no Jira, siga rigorosamente as etapas:

### 1. Ingestão e Mapeamento dos Dados

Colete as informações técnicas a partir de uma das seguintes origens:
- **Diagnóstico do `nina-log-analysis`:** Mapeie os 4 itens obrigatórios:
  1. *Evidência* ➔ `📸 Evidências & Logs` (timestamps, blocos, arquivos, linhas)
  2. *Interpretação* ➔ `📜 História & Contexto` e `❌ Comportamento Atual` / `✅ Comportamento Esperado`
  3. *Confiança* ➔ Avaliação de prioridade (**Alta** = `Alto` / `Hotfix`; **Média** = `Médio` / `Bug`; **Baixa** = `Baixo`)
  4. *Próxima verificação* ➔ `👨🏽‍💻 Análise Técnica` (ações recomendadas e hipóteses de causa raiz)
- **Relato Direto do Usuário:** Extraia o produto, cliente, comportamento observado e passos.

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
Antes de exibir ou enviar o card:
- **Anonimize CPFs:** Substitua por `***.XXX.XXX-**`.
- **Oculte Telefones e Senhas:** Nunca inclua credenciais, senhas ou dados sensíveis de pacientes na descrição do Jira.

### 4. Execução da Criação

Para gerar ou submeter o card, utilize os métodos abaixo:

#### Método A: Script Auxiliar da Skill (Recomendado para Validação)
```bash
# Formata o card em Markdown a partir de um diagnóstico:
python3 ~/.gemini/config/skills/jira-card-creator/scripts/create_card.py -t "<diagnostico_ou_texto>" --project "SD" --type "Bug"

# Gera argumentos JSON prontos para a ferramenta MCP:
python3 ~/.gemini/config/skills/jira-card-creator/scripts/create_card.py -t "<diagnostico_ou_texto>" --format mcp-args
```

#### Método B: Criação Direta via Jira MCP (`jira_create_issue`)
Se o usuário solicitar a abertura direta ou confirmar a prévia, chame a ferramenta MCP:
```json
{
  "project_key": "SD",
  "issue_type": "Bug",
  "summary": "[NinaChat] - ...",
  "description": "...",
  "additional_fields": "{\"priority\": {\"name\": \"Alto\"}, \"customfield_10102\": [{\"value\": \"NinaChat\"}], \"customfield_10388\": {\"accountId\": \"712020:cd611e98-f544-49d8-8b38-030098aa7bfd\"}, \"customfield_10520\": [\"Cliente\"], \"customfield_10521\": \"12345\", \"labels\": [\"analisa-log\"]}"
}
```

---

## 🤝 Integração com o `nina-log-analysis`

Quando o usuário estiver analisando logs com o `nina-log-analysis` e houver um diagnóstico conclusivo:
1. Apresente os 4 itens do diagnóstico.
2. Ao final, pergunte proativamente ao usuário se deseja abrir o card no Jira ou apresente a prévia formatada do card com a opção de envio imediato.
3. Se o usuário disser "sim", "crie o card" ou "abra o chamado", execute a criação no projeto `SD` e retorne a URL do chamado criado (`https://ninatecnologia.atlassian.net/browse/<KEY>`).
