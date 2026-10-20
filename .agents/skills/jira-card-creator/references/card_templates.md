# 📝 Templates Oficiais de Cards Jira (Padrão Nina Tecnologia)

Este documento contém os esqueletos canônicos de descrição exigidos pelo padrão de engenharia da Nina Tecnologia.

---

## 🐛 1. Padrão Oficial: Bug / Hotfix (Incidente em Produção)

Utilizado obrigatoriamente para registrar bugs, timeouts de integração, interrupções de conversa e anomalias de agendamento detectadas pelo `nina-log-analysis`.

### Formato do Título
```text
[<Produto>] - <Resumo claro, técnico e objetivo do problema>
```
*Exemplo: `[NinaChat] - Timeout de 30s na integração Tasy ao confirmar agendamento no bloco api_agendamento`*

### Corpo da Descrição (Markdown)

```markdown
🤖 Produto & Área do produto
Nina, <Produto>: <Módulo ou Bloco afetado>.

🖥️ Ambiente - Cliente(s) afetado(s)
Produção: <Nome do Cliente / Conta / Unidade afetada>.

📜 História & Contexto
<Explique o cenário do bug, o objetivo da ação do usuário/paciente e o impacto gerado. Por exemplo: paciente tentava agendar consulta cardiológica, realizou toda a triagem com sucesso, porém o agendamento foi cancelado abruptamente no último passo>.

🪲 Reprodução do bug
1. Iniciar conversa pelo WhatsApp / Bot na conta <Cliente>.
2. Realizar triagem até o bloco `<nome_do_bloco>` selecionando <opção>.
3. Executar o envio da confirmação de agendamento.
4. Observar que a conversa trava / é encerrada sem confirmação.

❌ Comportamento Atual
<Descrição exata do que acontece de errado, códigos de status recebidos, timeout ou queda de fluxo>.

✅ Comportamento Esperado
<Descrição do comportamento que deveria acontecer se o sistema estivesse íntegro>.

📸 Evidências & Logs
- **Timestamp do Erro:** `<YYYY-MM-DD HH:MM:SS>`
- **ID da Conversa / Sessão:** `<ID_DA_CONVERSA>`
- **Bloco da Falha:** `<bloco_x>`
- **Arquivo / Origem:** `<servico / arquivo.log:linha>`
- **Registro do Log:**
```log
<Linha exata extraída do log contendo o erro ou stacktrace>
```

👨🏽‍💻 Análise Técnica
- **Causa Raiz Identificada:** <Explicação fundamentada do porquê o erro ocorreu (ex: estouro de timeout de 30s na chamada HTTP para o ERP Tasy)>.
- **Componentes Envolvidos:** <Endpoints chamados, payloads, banco de dados ou variáveis de contexto>.
- **Ações / Próximas Verificações:**
  1. Validar disponibilidade do endpoint do ERP externo.
  2. Verificar tempo de resposta do servidor e volumetria de concorrência.
  3. Ajustar timeout ou implementar retry/tratamento de erro amigável no fluxo.
```

---

## ✨ 2. Padrão Oficial: Solicitação de Feature / Melhoria

Utilizado para melhorias solicitadas a partir de diagnósticos ou novas necessidades de negócio.

### Formato do Título
```text
[<Produto>] - <Resumo claro e objetivo da funcionalidade>
```

### Corpo da Descrição (Markdown)

```markdown
🎯 Objetivo / Motivação
<Explicação clara do porquê da funcionalidade e do valor gerado para o cliente ou operação>.

📋 Especificação da Feature
<Detalhamento do fluxo, regras de negócio e como a solução deve se comportar>.

✅ Critérios de Aceite
- [ ] O sistema deve validar X antes de disparar Y.
- [ ] Caso ocorra timeout, deve encaminhar para o transbordo humano informando o protocolo.
- [ ] Notificar a equipe de suporte se houver mais de 3 falhas consecutivas.

📸 Evidências & Referências Visuais
<Prints de telas, diagramas de fluxo ou protótipos de referência>.

🧑‍💻 Observações Técnicas
<Impactos em APIs existentes, modelos de banco de dados ou migrações de dados necessárias>.
```

---

## ⚡ 3. Padrão Oficial: Tarefa Técnica / Investigação

Utilizado para spikes técnicos, refatorações ou tarefas de manutenção preventiva.

### Formato do Título
```text
[<Produto>] - <Ação técnica a ser realizada>
```

### Corpo da Descrição (Markdown)

```markdown
🎯 Escopo da Tarefa
<O que precisa ser implementado, investigado ou refatorado>.

🔍 Contexto Técnico & Motivação
<Por que esta tarefa é necessária e quais problemas ela previne>.

📋 Plano de Execução
1. <Etapa 1>
2. <Etapa 2>
3. <Etapa 3>

✅ Critérios de Conclusão (DoD)
- [ ] Alterações validadas em ambiente de homologação.
- [ ] Testes unitários e de integração adicionados.
- [ ] Documentação técnica atualizada.
```
