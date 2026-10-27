# Verificação da entrega

Executado em 27/10/2026 no WSL Ubuntu 24.04, Node 22.23.3 e pnpm 10.28.0.

- TypeScript: todos os pacotes passaram.
- Build Next.js de produção: passou sem warnings na verificação final.
- Testes automatizados: 6 passaram (auditoria, endereços privados, datas, evidências, comparação de métricas e fluxo OAuth/coleta/diagnóstico/tarefas com respostas simuladas).
- MCP: handshake real, listagem de 8 ferramentas, cadastro, leitura e erro de ferramenta verificados.
- HTTP local: cadastro, auditoria real do HOP, persistência e rejeição de origem/entrada inválida verificados.
- Auditoria real: https://houseofpace.com.br/conectar retornou HTTP 200 e título esperado. Zero achados nos checks implementados não significa auditoria SEO completa.
- Interface: estado inicial inspecionado no navegador, sem erros visíveis.
- Registros dos testes: removidos; não foram deixados projetos demonstrativos.

Não verificados com contas/modelos reais: consentimento OAuth Google, acesso às propriedades do usuário e inferência Ollama. Exigem configuração local. Os testes dessas integrações usaram respostas simuladas, explicitamente identificadas no código.

Comandos adicionais (além de pnpm check/test/build):

```bash
pnpm --filter @pace/mcp exec tsx src/smoke.ts
pnpm --filter @pace/core exec tsx src/live-smoke.ts
# Com o painel ativo em 127.0.0.1:3000:
pnpm --filter @pace/core exec tsx src/http-smoke.ts
```

## Separação dos repositórios

Este repositório publica Next.js, CLI e packages/core. O MCP permanece na pasta local ignorada mcp/, aguardando repositório próprio. Os testes MCP registrados acima pertencem à implementação local anterior à separação; o comando correspondente não está disponível em um clone deste repositório.
