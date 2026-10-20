# 💡 Exemplo: Do Diagnóstico do analisa-log ao Card no Jira

Este exemplo demonstra o fluxo ponta a ponta: desde a emissão do diagnóstico estruturado pelo `nina-log-analysis` até a geração e criação do card canônico no Jira através do `jira-card-creator`.

---

## 1. Entrada: Diagnóstico Estruturado do `nina-log-analysis`

Após analisar os logs de um agendamento interrompido, o agente de análise emite o diagnóstico oficial de 4 itens:

```markdown
### 1. Evidência
Às `10:03:05` a conversa `ABC123` efetuou uma requisição `POST /api/v1/agenda/confirmar` no bloco `api_agendamento` (`export_ninachat.json:45`). Exatos 30 segundos depois, às `10:03:35`, o log registrou um erro de timeout: `Timeout after 30000ms esperando resposta do ERP Tasy` (`export_ninachat.json:60`), sem mensagens subsequentes.

### 2. Interpretação
O fluxo de agendamento foi abortado devido ao estouro do tempo limite (timeout de 30 segundos) na comunicação HTTP com a API do ERP Tasy. A Nina enviou a requisição de confirmação, porém o servidor do hospital não respondeu a tempo, impedindo a gravação da consulta e a geração da confirmação ao paciente.

### 3. Confiança
**[Alta]** - A correlação temporal é direta e o registro de erro explicita com clareza o componente que falhou, o tempo de espera (30.000 ms) e o endpoint envolvido.

### 4. Próxima verificação
1. Testar a conectividade e latência do endpoint `/api/v1/agenda/confirmar` do ERP Tasy diretamente do servidor de integração.
2. Inspecionar os logs do servidor Tasy às 10:03 para verificar se houve lock de transação no banco ou lentidão geral no momento do agendamento.
3. Avaliar a necessidade de ajustar o timeout do bloco ou implementar uma mensagem de retorno amigável com retry ao usuário.
```

---

## 2. Ação de Conversão Automática

O agente (ou usuário via terminal) executa o gerador da skill:

```bash
python3 ~/.gemini/config/skills/jira-card-creator/scripts/create_card.py \
  -t "$(cat relatorio_diagnostico.md)" \
  --project "SD" \
  --type "Bug" \
  --product "NinaChat" \
  --client "Unimed"
```

---

## 3. Saída Formatada no Padrão Nina

```markdown
# 🏷️ [NinaChat] - O fluxo de agendamento foi abortado devido ao estouro do tempo limite (timeout de 30 segundos)

- **Projeto:** `SD` | **Tipo:** `Bug` | **Prioridade:** `Alto`
- **Produto:** `NinaChat` | **Cliente:** `Unimed` | **Chamado:** `ABC123`
- **Representante:** `Wander`

---

🤖 Produto & Área do produto
Nina, NinaChat: bloco `api_agendamento`.

🖥️ Ambiente - Cliente(s) afetado(s)
Produção: Unimed (Identificador: ABC123).

📜 História & Contexto
O fluxo de agendamento foi abortado devido ao estouro do tempo limite (timeout de 30 segundos) na comunicação HTTP com a API do ERP Tasy. A Nina enviou a requisição de confirmação, porém o servidor do hospital não respondeu a tempo, impedindo a gravação da consulta e a geração da confirmação ao paciente.

🪲 Reprodução do bug
1. Iniciar atendimento ou fluxo de agendamento via WhatsApp / NinaChat no cliente Unimed.
2. Avançar pelas etapas de triagem e identificação do paciente.
3. Executar o bloco de confirmação/integração (`api_agendamento`).
4. Observar a interrupção da conversa ou erro retornado.

❌ Comportamento Atual
O fluxo sofreu interrupção inesperada com falha no processamento da etapa `api_agendamento`.

✅ Comportamento Esperado
O fluxo deve concluir a operação com sucesso ou, em caso de instabilidade externa, acionar fallback com retry e mensagem amigável ao usuário.

📸 Evidências & Logs
- **Timestamp:** 2026-10-18 10:03:35
- **Conversa/Sessão:** `ABC123`
- **Bloco Afetado:** `api_agendamento`
- **Evidência Extraída:**
```log
Às `10:03:05` a conversa `ABC123` efetuou uma requisição `POST /api/v1/agenda/confirmar` no bloco `api_agendamento` (`export_ninachat.json:45`). Exatos 30 segundos depois, às `10:03:35`, o log registrou um erro de timeout: `Timeout after 30000ms esperando resposta do ERP Tasy` (`export_ninachat.json:60`), sem mensagens subsequentes.
```

👨🏽‍💻 Análise Técnica
- **Nível de Confiança:** [Alta]
- **Ações & Próximas Verificações:**
1. Testar a conectividade e latência do endpoint `/api/v1/agenda/confirmar` do ERP Tasy diretamente do servidor de integração.
2. Inspecionar os logs do servidor Tasy às 10:03 para verificar se houve lock de transação no banco ou lentidão geral no momento do agendamento.
3. Avaliar a necessidade de ajustar o timeout do bloco ou implementar uma mensagem de retorno amigável com retry ao usuário.
```

---

## 4. Chamada Direta via Jira MCP (`jira_create_issue`)

Quando confirmado pelo usuário ou solicitado diretamente ("crie o card"), a IA chama a ferramenta Jira MCP:

```json
{
  "project_key": "SD",
  "issue_type": "Bug",
  "summary": "[NinaChat] - O fluxo de agendamento foi abortado devido ao estouro do tempo limite (timeout de 30 segundos)",
  "description": "...",
  "additional_fields": "{\"priority\": {\"name\": \"Alto\"}, \"customfield_10102\": [{\"value\": \"NinaChat\"}], \"customfield_10388\": {\"accountId\": \"712020:cd611e98-f544-49d8-8b38-030098aa7bfd\"}, \"customfield_10520\": [\"Unimed\"], \"customfield_10521\": \"ABC123\", \"labels\": [\"analisa-log\", \"nina-log-analysis\"]}"
}
```
Retorno:
```json
{
  "key": "SD-1391",
  "browse_url": "https://ninatecnologia.atlassian.net/browse/SD-1391"
}
```
