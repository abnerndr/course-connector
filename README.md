# Course Connector Pace

MVP local de monitoramento SEO e marketing com Next.js, CLI e Ollama. O servidor MCP terá um repositório separado.

## Estrutura

- `course-connector-pace/`: painel Next.js.
- `packages/core/`: projetos, OAuth, métricas, auditoria, IA, tarefas e validação.
- `mcp/`: pasta local opcional, ignorada pelo Git; não faz parte deste repositório.
- `.pace/`: dados locais criados em runtime (ignorado pelo Git).

## Iniciar (WSL/Linux recomendado neste workspace)

Requer Node.js 22.14+ e pnpm 10.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Abra http://localhost:3000. Se pnpm no WSL apontar para o executável Windows, use o Node Linux e `npm exec --yes --package=pnpm@10.28.0 -- pnpm install` (e os demais comandos).

A aplicação escuta somente em 127.0.0.1. O MVP é para uso local de um operador, sem autenticação multiusuário. Não publique diretamente na internet.

## Google Search Console + Analytics

1. Crie um projeto no Google Cloud.
2. Habilite Search Console API, Google Analytics Data API e, se usar a descoberta de propriedades pelo núcleo, Google Analytics Admin API.
3. Configure a tela de consentimento OAuth. Em modo teste, adicione seu e-mail como usuário de teste.
4. Crie um cliente OAuth do tipo aplicação Web e registre exatamente `http://localhost:3000/api/google/callback` como URI de redirecionamento.
5. Preencha GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env da raiz e reinicie a aplicação.
6. Cadastre o site no painel. Search Console aceita `sc-domain:exemplo.com.br` ou a propriedade URL exata, como `https://exemplo.com.br/`. GA4 exige o ID numérico da propriedade, não o Measurement ID G-XXXX.
7. Clique em Conectar Google. A conta deve ter acesso às duas propriedades.
8. Selecione um período passado e sincronize.

As permissões solicitadas são somente leitura. OAuth usa state vinculado ao navegador e PKCE. Tokens ficam criptografados com AES-GCM; a chave local fica em .pace/secret.key, com permissões restritas no Linux. Isso não protege contra alguém que já tenha acesso completo à pasta ou ao usuário do sistema. Faça backup da pasta completa com cuidado.

As métricas GSC usam dados finais. GA4 e GSC têm definições e fusos próprios: sessões e cliques não são equivalentes. Páginas GSC são limitadas às primeiras 1.000 linhas nesta versão; os totais vêm de consulta separada sem dimensão. Snapshots preservam período, fonte e horário da coleta.

## IA local

Instale Ollama a partir do fornecedor e baixe um modelo compatível com saída JSON, por exemplo:

```bash
ollama pull qwen2.5:7b
ollama serve
```

Se o Ollama já estiver ativo, não execute uma segunda instância. Configure OLLAMA_MODEL conforme sua máquina. A qualidade e velocidade dependem do modelo e hardware. O serviço deve estar acessível por localhost a partir do ambiente que executa o painel/MCP (no WSL, prefira executá-lo no mesmo ambiente).

O diagnóstico usa as 5 auditorias e 2 snapshots mais recentes, com até 30 linhas de páginas por snapshot. A saída é validada e referências inexistentes são rejeitadas. Nenhuma credencial é enviada ao modelo. Não existe fallback silencioso para IA remota nem dados demonstrativos apresentados como reais.

## Fluxo

1. Cadastrar projeto e conectar Google.
2. Coletar métricas e auditar uma ou mais páginas públicas do mesmo domínio.
3. Gerar diagnóstico na aba Diagnósticos.
4. Revisar propostas no Plano de ação e aprovar.
5. Implementar a alteração no site/CMS e registrar “Já implementei”.
6. Reauditar quando houver uma auditoria vinculada à proposta.
7. Coletar outro período de igual duração e comparar em Resultados.

A validação automática compara códigos dos achados da auditoria antes/depois. Não valida semanticamente qualquer proposta de IA e não comprova impacto em tráfego. Tarefas baseadas apenas em métricas devem ser avaliadas pelos períodos. Não há escrita no site nem publicação automática.

## CLI

```bash
pnpm cli projects
pnpm cli create '{"name":"Meu site","url":"https://exemplo.com","searchConsoleSite":"sc-domain:exemplo.com","analyticsProperty":"123456"}'
pnpm cli audit PROJECT_ID
pnpm cli collect PROJECT_ID 2026-09-01 2026-09-28
pnpm cli diagnose PROJECT_ID
pnpm cli overview PROJECT_ID
pnpm cli approve TASK_ID
pnpm cli implemented TASK_ID
pnpm cli validate TASK_ID
pnpm cli compare PROJECT_ID BEFORE_SNAPSHOT_ID AFTER_SNAPSHOT_ID
```

OAuth é feito pelo painel. CLI e MCP usam os mesmos dados. Execuções são sob demanda; o processo deve permanecer ativo até concluir. Ainda não há fila durável ou agendador.

## MCP separado

O servidor MCP é mantido em https://github.com/abnerndr/course-connector-mcp. A pasta local `mcp/` está ignorada pelo Git e não integra o workspace publicado. Este projeto funciona sem ela.

O núcleo `@pace/core` permanece em `packages/core` porque é utilizado pelo Next.js e pela CLI. O repositório MCP referencia uma revisão deste projeto por submódulo Git e instala packages/core como dependência local desse submódulo, sem duplicar sua implementação. Para compartilhar projetos e tokens entre os processos, configure PACE_DATA_DIR com o mesmo caminho absoluto nos dois ambientes.

## Verificar

```bash
pnpm check
pnpm test
pnpm build
```

## Próximas etapas

Fila persistente, agendador, seleção automática de propriedades, integrações CMS/repositório, relatórios exportáveis, validações específicas por proposta e conectores Ads/Meta.

## Referências

- https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- https://developers.google.com/analytics/devguides/reporting/data/v1/basics
- https://github.com/ollama/ollama/blob/main/docs/api.md
- https://modelcontextprotocol.io/
