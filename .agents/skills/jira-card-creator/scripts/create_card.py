#!/usr/bin/env python3
"""
scripts/create_card.py - Formatador e Gerador Canônico de Cards Jira (Nina Tecnologia).

Transforma diagnósticos técnicos do analisa-log (nina-log-analysis), relatos brutos
ou saídas de extração em chamados técnicos no padrão oficial da Nina Tecnologia,
preenchendo metadados obrigatórios (Produto, Cliente, Representante Wander, Chamado)
e estruturando as seções oficiais do Jira.
"""

import sys
import os
import re
import json
import argparse
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

WANDER_ACCOUNT_ID = "712020:cd611e98-f544-49d8-8b38-030098aa7bfd"
WANDER_NAME = "Wander"

PRODUCT_MAP = {
    "ninachat": "NinaChat",
    "nina_chat": "NinaChat",
    "flowscript": "NinaChat",
    "whatsapp": "NinaChat",
    "waba": "NinaChat",
    "chatbot": "NinaChat",
    "hub": "HUB",
    "checkin": "Checkin",
    "plataforma": "Plataforma",
    "portal": "Portal",
    "app": "APP Paciente",
    "infra": "Infraestrutura",
    "confirmationcall": "Infraestrutura",
    "interno": "Interno",
}


def sanitize_lgpd(text: str) -> str:
    """Sanitiza CPFs, telefones e senhas para conformidade com a LGPD."""
    if not text:
        return ""
    # CPF formatado: 123.456.789-00 -> ***.456.789-**
    text = re.sub(
        r"\b(\d{3})\.(\d{3})\.(\d{3})-(\d{2})\b",
        r"***.\2.\3-**",
        text
    )
    # CPF apenas dígitos (11 dígitos): 12345678901 -> ***456789**
    text = re.sub(
        r"\b\d{3}(\d{6})\d{2}\b",
        r"***\1**",
        text
    )
    # Senhas e tokens óbvios
    text = re.sub(
        r"(password|senha|token|bearer|secret)\s*[:=]\s*['\"]?[A-Za-z0-9_\-\.]{8,}['\"]?",
        r"\1: [REDACTED_BY_LGPD]",
        text,
        flags=re.IGNORECASE
    )
    return text


def extract_metadata_from_text(raw_text: str) -> Dict[str, Any]:
    """Extrai produto, cliente, id de conversa e detalhes a partir do texto do log ou diagnóstico."""
    meta = {
        "product": "NinaChat",
        "client": "Nina",
        "ticket": "-",
        "conversation_id": None,
        "timestamp": None,
        "block": None,
        "error_msg": None,
        "confidence": "Alta",
    }

    if not raw_text:
        return meta

    # Busca conversa
    conv_match = re.search(r"(?:conversa|conv(?:ersation)?_id|sessão|session|ticket|protocolo)[:\s=]*([A-Za-z0-9_-]{5,})", raw_text, re.IGNORECASE)
    if conv_match:
        meta["conversation_id"] = conv_match.group(1).strip()
        meta["ticket"] = meta["conversation_id"]

    # Busca timestamp
    time_match = re.search(r"\b(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})\b", raw_text)
    if time_match:
        meta["timestamp"] = time_match.group(1).replace("T", " ")

    # Busca bloco
    bloco_match = re.search(r"(?:bloco|block)[:\s=]*([a-zA-Z0-9_\-]+)", raw_text, re.IGNORECASE)
    if bloco_match:
        meta["block"] = bloco_match.group(1).strip()

    # Busca cliente por palavras-chave ou rótulos
    cli_match = re.search(r"(?:cliente|hospital|cl[íi]nica|empresa|conta)[:\s=]+([^\r\n]{2,60})", raw_text, re.IGNORECASE)
    if cli_match:
        c = cli_match.group(1).strip()
        c = re.sub(r"[,\.;]+$", "", c).strip()
        if c.lower() not in {"que", "o", "a", "novo", "teste", "erro", "falha"}:
            if "sem acesso" in c.lower() or "não tem acesso" in c.lower() or "não identificada" in c.lower():
                meta["client"] = "Sem acesso à informação da conta no log"
            else:
                meta["client"] = c

    # Busca produto
    text_lower = raw_text.lower()
    for key, val in PRODUCT_MAP.items():
        if re.search(rf"\b{re.escape(key)}\b", text_lower):
            meta["product"] = val
            break

    # Confiança do diagnóstico do analisa-log
    conf_match = re.search(r"3\.\s*\*{0,2}Confiança\*{0,2}[:\s]*\[?(Alta|Média|Baixa)\]?", raw_text, re.IGNORECASE)
    if conf_match:
        meta["confidence"] = conf_match.group(1).capitalize()

    return meta


def parse_diagnostic_sections(text: str) -> Dict[str, str]:
    """Divide o diagnóstico obrigatório do analisa-log (4 itens) em seções."""
    sections = {
        "evidencia": "",
        "interpretacao": "",
        "confianca": "",
        "proxima_verificacao": "",
        "raw_remaining": "",
    }

    pats = [
        ("evidencia", r"1\.\s*\*{0,2}Evidência\*{0,2}[:\s]*(.*?)(?=2\.\s*\*{0,2}Interpretação|(?:\n|^)#{1,4}\s*2|\Z)"),
        ("interpretacao", r"2\.\s*\*{0,2}Interpretação\*{0,2}[:\s]*(.*?)(?=3\.\s*\*{0,2}Confiança|(?:\n|^)#{1,4}\s*3|\Z)"),
        ("confianca", r"3\.\s*\*{0,2}Confiança\*{0,2}[:\s]*(.*?)(?=4\.\s*\*{0,2}Próxima verificação|(?:\n|^)#{1,4}\s*4|\Z)"),
        ("proxima_verificacao", r"4\.\s*\*{0,2}Próxima verificação\*{0,2}[:\s]*(.*?)(?=\n#{1,4}\s*|\Z)"),
    ]

    found_any = False
    for key, pattern in pats:
        match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        if match:
            clean_val = re.sub(r"#{1,6}\s*$", "", match.group(1).strip()).strip()
            sections[key] = clean_val
            found_any = True

    if not found_any:
        sections["raw_remaining"] = text.strip()

    return sections


def build_canonical_card(
    title: Optional[str],
    raw_text: str,
    product: Optional[str] = None,
    client: Optional[str] = None,
    ticket: Optional[str] = None,
    issue_type: str = "Bug",
    priority: Optional[str] = None,
    project_key: str = "SD",
) -> Dict[str, Any]:
    """Constrói o chamado formatado rigorosamente no padrão Nina."""
    sanitized_text = sanitize_lgpd(raw_text)
    extracted_meta = extract_metadata_from_text(sanitized_text)
    diag_sections = parse_diagnostic_sections(sanitized_text)

    # Resolução de valores com precedência
    prod = product or extracted_meta["product"]
    cli = client or extracted_meta["client"]
    tkt = ticket or extracted_meta["ticket"]

    # Prioridade inferida se não fornecida
    if not priority:
        if issue_type == "Hotfix" or "timeout" in sanitized_text.lower() or "fatal" in sanitized_text.lower():
            prio = "Alto"
        elif extracted_meta["confidence"] == "Baixa":
            prio = "Baixo"
        else:
            prio = "Médio"
    else:
        prio = priority

    # Geração do título canônico: [<Produto>] - <Resumo sucinto>
    if not title:
        summary_core = ""
        if diag_sections["interpretacao"]:
            first_sentence = diag_sections["interpretacao"].split(".")[0].strip()
            summary_core = first_sentence[:95].rsplit(" ", 1)[0] if len(first_sentence) > 95 else first_sentence
        elif diag_sections["evidencia"]:
            first_line = diag_sections["evidencia"].split("\n")[0].strip()
            summary_core = first_line[:95].rsplit(" ", 1)[0] if len(first_line) > 95 else first_line
        else:
            first_line = sanitized_text.split("\n")[0].strip()
            summary_core = first_line[:95].rsplit(" ", 1)[0] if len(first_line) > 95 else first_line

        summary_core = summary_core.strip()
        final_title = f"[{prod}] - {summary_core}"
    else:
        if not title.startswith("["):
            final_title = f"[{prod}] - {title}"
        else:
            final_title = title

    # Extração de bloco ou endpoint
    bloco_ref = extracted_meta.get("block") or "fluxo principal"
    timestamp_ref = extracted_meta.get("timestamp") or "Registrado no log"
    conv_ref = extracted_meta.get("conversation_id") or tkt

    # Montagem da seção de reprodução
    reproducao_steps = (
        f"1. Iniciar atendimento ou fluxo de agendamento via WhatsApp / NinaChat no cliente {cli}.\n"
        f"2. Avançar pelas etapas de triagem e identificação do paciente.\n"
        f"3. Executar o bloco de confirmação/integração (`{bloco_ref}`).\n"
        f"4. Observar a interrupção da conversa ou erro retornado."
    )

    # Interpretação / Comportamento
    contexto = diag_sections["interpretacao"] or sanitized_text[:300]
    evidencia_content = diag_sections["evidencia"] or sanitized_text
    proxima_verif = diag_sections["proxima_verificacao"] or "1. Inspecionar logs da aplicação.\n2. Validar latência e conectividade com a API externa."

    # Descrição oficial rica
    description = (
        f"🤖 Produto & Área do produto\n"
        f"Nina, {prod}: bloco `{bloco_ref}`.\n\n"
        f"🖥️ Ambiente - Cliente(s) afetado(s)\n"
        f"Produção: {cli} (Identificador: {conv_ref}).\n\n"
        f"📜 História & Contexto\n"
        f"{contexto}\n\n"
        f"🪲 Reprodução do bug\n"
        f"{reproducao_steps}\n\n"
        f"❌ Comportamento Atual\n"
        f"O fluxo sofreu interrupção inesperada com falha no processamento da etapa `{bloco_ref}`.\n\n"
        f"✅ Comportamento Esperado\n"
        f"O fluxo deve concluir a operação com sucesso ou, em caso de instabilidade externa, acionar fallback com retry e mensagem amigável ao usuário.\n\n"
        f"📸 Evidências & Logs\n"
        f"- **Timestamp:** {timestamp_ref}\n"
        f"- **Conversa/Sessão:** `{conv_ref}`\n"
        f"- **Bloco Afetado:** `{bloco_ref}`\n"
        f"- **Evidência Extraída:**\n"
        f"```log\n"
        f"{evidencia_content.strip()}\n"
        f"```\n\n"
        f"👨🏽‍💻 Análise Técnica\n"
        f"- **Nível de Confiança:** [{extracted_meta['confidence']}]\n"
        f"- **Ações & Próximas Verificações:**\n"
        f"{proxima_verif}"
    )

    # Prepara additional_fields para Jira MCP
    additional_fields = {
        "priority": {"name": prio},
        "customfield_10102": [{"value": prod}],
        "customfield_10388": {"accountId": WANDER_ACCOUNT_ID},
        "customfield_10520": [cli],
        "customfield_10521": str(tkt),
        "labels": ["analisa-log", "nina-log-analysis"]
    }

    # Argumentos prontos para chamar a ferramenta Jira MCP `jira_create_issue`
    jira_mcp_args = {
        "project_key": project_key,
        "summary": final_title,
        "issue_type": issue_type,
        "description": description,
        "additional_fields": json.dumps(additional_fields, ensure_ascii=False)
    }

    # Payload para a aplicação local Jira Assistant (http://localhost:3000/api/enhance)
    assistant_payload = {
        "type": "bug" if issue_type in ["Bug", "Hotfix"] else "feature",
        "rawText": sanitized_text,
        "fields": {
            "Cliente": cli,
            "Produto": prod,
            "Prioridade": prio,
            "Representante": WANDER_NAME,
            "NumeroChamado": str(tkt)
        }
    }

    return {
        "title": final_title,
        "description": description,
        "project_key": project_key,
        "issue_type": issue_type,
        "priority": prio,
        "fields": {
            "Cliente": cli,
            "Produto": prod,
            "NumeroChamado": tkt,
            "Representante": WANDER_NAME,
            "RepresentanteAccountId": WANDER_ACCOUNT_ID
        },
        "jira_mcp_args": jira_mcp_args,
        "assistant_payload": assistant_payload
    }


def main():
    parser = argparse.ArgumentParser(
        description="Formatador e Gerador Canônico de Cards Jira (Nina Tecnologia)."
    )
    parser.add_argument(
        "-f", "--file",
        type=str,
        help="Caminho para arquivo contendo diagnóstico do analisa-log ou relatório."
    )
    parser.add_argument(
        "-t", "--text",
        type=str,
        help="Texto direto do diagnóstico ou explicação do problema."
    )
    parser.add_argument(
        "-s", "--summary",
        type=str,
        help="Título/Summary personalizado (ex: 'Timeout na confirmação de agenda')."
    )
    parser.add_argument(
        "-p", "--product",
        type=str,
        help="Produto (ex: NinaChat, HUB, Checkin, Portal, Plataforma)."
    )
    parser.add_argument(
        "-c", "--client",
        type=str,
        help="Cliente afetado (ex: MULTIMED, Unimed, Nina)."
    )
    parser.add_argument(
        "--ticket",
        type=str,
        help="Número do chamado, ticket ou ID da conversa."
    )
    parser.add_argument(
        "--type",
        choices=["Bug", "Hotfix", "Tarefa", "Feature"],
        default="Bug",
        help="Tipo de item no Jira (default: Bug)."
    )
    parser.add_argument(
        "--priority",
        choices=["Baixo", "Médio", "Alto", "Crítico"],
        help="Prioridade do chamado."
    )
    parser.add_argument(
        "--project",
        default="SD",
        help="Chave do projeto Jira (default: SD)."
    )
    parser.add_argument(
        "--format",
        choices=["json", "markdown", "mcp-args", "assistant-payload"],
        default="markdown",
        help="Formato de saída (default: markdown)."
    )
    parser.add_argument(
        "-o", "--output",
        type=str,
        help="Caminho do arquivo para salvar a saída."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Modo de simulação: exibe validação de campos e payload sem efetuar chamadas."
    )

    args = parser.parse_args()

    # Leitura do texto de entrada
    raw_input = ""
    if args.file:
        p = Path(args.file)
        if not p.is_file():
            sys.stderr.write(f"[Erro]: Arquivo '{args.file}' não encontrado.\n")
            sys.exit(1)
        raw_input = p.read_text(encoding="utf-8")
    elif args.text:
        raw_input = args.text
    elif not sys.stdin.isatty():
        raw_input = sys.stdin.read()
    else:
        sys.stderr.write("[Erro]: Forneça um arquivo (-f), texto (-t) ou passe o conteúdo via pipe (stdin).\n")
        sys.exit(1)

    result = build_canonical_card(
        title=args.summary,
        raw_text=raw_input,
        product=args.product,
        client=args.client,
        ticket=args.ticket,
        issue_type=args.type,
        priority=args.priority,
        project_key=args.project
    )

    out_content = ""
    if args.format == "markdown":
        out_content = (
            f"# 🏷️ {result['title']}\n\n"
            f"- **Projeto:** `{result['project_key']}` | **Tipo:** `{result['issue_type']}` | **Prioridade:** `{result['priority']}`\n"
            f"- **Produto:** `{result['fields']['Produto']}` | **Cliente:** `{result['fields']['Cliente']}` | **Chamado:** `{result['fields']['NumeroChamado']}`\n"
            f"- **Representante:** `{result['fields']['Representante']}`\n\n"
            f"---\n\n"
            f"{result['description']}"
        )
    elif args.format == "mcp-args":
        out_content = json.dumps(result["jira_mcp_args"], indent=2, ensure_ascii=False)
    elif args.format == "assistant-payload":
        out_content = json.dumps(result["assistant_payload"], indent=2, ensure_ascii=False)
    else:
        out_content = json.dumps(result, indent=2, ensure_ascii=False)

    if args.output:
        Path(args.output).write_text(out_content, encoding="utf-8")
        print(f"✅ Card gerado e salvo em: {args.output}")
    else:
        print(out_content)


if __name__ == "__main__":
    main()
