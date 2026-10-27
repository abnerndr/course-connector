# PACE — plano do MVP local

1. Workspace pnpm: Next.js course-connector-pace, MCP e núcleo TypeScript compartilhado.
2. Projetos locais e OAuth Google (Search Console e GA4, somente leitura).
3. Snapshots de métricas e auditorias HTML com evidências persistidas.
4. Diagnóstico via Ollama local, validação estrutural e referência às evidências.
5. Propostas, aprovação humana, registro de implementação e reauditoria.
6. Comparação de períodos e acesso por CLI/MCP.
7. Verificação de tipos, testes, build e smoke test.

## Limites deliberados desta primeira versão

- Execução sob demanda; agendamento e fila durável ficam para a próxima etapa.
- Alterações no site são implementadas pelo operador; não há CMS/repositório conectado.
- Auditoria do HTML, sem renderização JavaScript ou Core Web Vitals.
- OAuth e inferência reais exigem credenciais e Ollama configurados pelo operador.
- Google Ads, Meta Ads e publicação social estão fora deste MVP.

## Organização para publicação

Next.js, CLI e packages/core são versionados neste repositório. A pasta mcp/ permanece local e ignorada, destinada a outro repositório. O workspace publicado não depende dela.
