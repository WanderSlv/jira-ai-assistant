# 🗺️ Mapeamento de Campos do Jira (Padrão Nina Tecnologia)

Este documento documenta a estrutura oficial de campos, identificadores e opções válidas para criação e atualização de chamados na instância Jira da Nina Tecnologia (`ninatecnologia.atlassian.net`).

---

## 📌 Projetos Principais

| Chave | Nome do Projeto | Descrição | Casos de Uso Recomendados |
| :--- | :--- | :--- | :--- |
| **`SD`** | **Desenvolvimento** | Projeto principal do time de engenharia e produto | **Hotfixes**, **Bugs em Produção**, **Tarefas técnicas** |
| **`AUTO`** | **Automação** | Projetos automatizados e formulários JSM (`/form/34`) | Incidentes capturados via formulário ou scripts |
| **`PB`** | **Backlog de Produto** | Gestão de demandas de produto e melhorias | Features, melhorias e histórias de usuário |
| **`QA`** | **QA** | Validações e testes de qualidade | Testes regressivos e planos de teste |

> [!TIP]
> Para bugs identificados durante investigações de incidentes em produção pelo `nina-log-analysis`, utilize preferencialmente o projeto **`SD`** (com tipo **`Hotfix`** ou **`Bug`**) ou **`AUTO`** caso seja solicitado direcionar para automação.

---

## 🏷️ Tipos de Itens (Issue Types)

| Nome no Jira | ID Padrão | Quando Utilizar |
| :--- | :--- | :--- |
| **`Hotfix`** | `10200` | Falhas graves, quebra de agendamento em produção, indisponibilidade de integração ou impacto direto em pacientes/clientes. |
| **`Bug`** | `10011` | Comportamentos anômalos, inconsistências visuais ou de fluxo sem parada total de serviço. |
| **`Tarefa`** | `10009` | Tarefas técnicas de engenharia, investigações aprofundadas ou ajustes de configuração. |
| **`Impeditivo de entrega`** | `10199` | Falhas encontradas em etapa de homologação/validação pelo cliente antes do go-live. |

---

## 📋 Campos Customizados Canônicos da Nina

### 1. Representante do Cliente (`customfield_10388`)
- **Tipo**: `userpicker`
- **Regra da Empresa**: O representante é **SEMPRE Wander** (`wander.silva`).
- **Account ID Jira**: `712020:cd611e98-f544-49d8-8b38-030098aa7bfd`
- **Email**: `wander.silva@confirmationcall.com.br`
- **Payload MCP / API**:
  ```json
  "customfield_10388": {
    "accountId": "712020:cd611e98-f544-49d8-8b38-030098aa7bfd"
  }
  ```

### 2. Produto (`customfield_10102`)
- **Tipo**: `multiselect` / `option`
- **Opções Válidas Oficiais**:
  - `Plataforma`
  - `HUB`
  - `Checkin`
  - `NinaChat` (usado para bots, fluxos de WhatsApp, flowscript, ninachat)
  - `APP Paciente`
  - `Portal` (portal do cliente ou web)
  - `Infraestrutura` (servidores, redes, bancos)
  - `Interno`
- **Mapeamento a partir de logs**:
  - `ninachat`, `flowscript`, `whatsapp`, `chatbot` ➔ `NinaChat`
  - `hub`, `agendamento`, `escala` ➔ `HUB`
  - `confirmationcall`, `gateway`, `infra` ➔ `Infraestrutura` ou `NinaChat`
  - `portal`, `admin` ➔ `Portal` ou `Plataforma`
- **Payload MCP / API**:
  ```json
  "customfield_10102": [{"value": "NinaChat"}]
  ```

### 3. Cliente (`customfield_10520`)
- **Tipo**: `labels` / array de strings
- **Regra**: Nome da clínica, hospital ou parceiro identificado no log ou ticket (ex: `MULTIMED`, `Unimed`, `Cliner`). Se for problema interno da plataforma ou não especificado, preencha com `Nina`.
- **Payload MCP / API**:
  ```json
  "customfield_10520": ["MULTIMED"]
  ```

### 4. Número do Chamado (`customfield_10521`)
- **Tipo**: `string` / `textfield`
- **Regra**: Número do ticket Movidesk, ID de protocolo de atendimento, hash do chamado (`#12345`) ou ID da conversa investigada (ex: `ABC123`). Se não houver, preencha com `-`.
- **Payload MCP / API**:
  ```json
  "customfield_10521": "ABC123"
  ```

---

## ⚡ Exemplo de `additional_fields` para Jira MCP (`jira_create_issue`)

```json
{
  "priority": {"name": "Alto"},
  "customfield_10102": [{"value": "NinaChat"}],
  "customfield_10388": {"accountId": "712020:cd611e98-f544-49d8-8b38-030098aa7bfd"},
  "customfield_10520": ["HospitalExemplo"],
  "customfield_10521": "12345",
  "labels": ["analisa-log", "incidente-producao"]
}
```
