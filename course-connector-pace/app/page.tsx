"use client";
import { useEffect, useState } from "react";
import type {
  Project,
  Audit,
  Metric,
  Diagnosis,
  Task,
  Validation,
} from "@pace/core";
type Delta = {
  before: number;
  after: number;
  change: number;
  percent: number | null;
};
type ProjectView = Project & { connected: boolean };
type Overview = {
  project: Project;
  connected: boolean;
  audits: Audit[];
  metrics: Metric[];
  diagnoses: Diagnosis[];
  tasks: Task[];
  validations: Validation[];
};
const date = (days: number) =>
  new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
export default function Home() {
  const [projects, setProjects] = useState<ProjectView[]>([]),
    [selected, setSelected] = useState(""),
    [data, setData] = useState<Overview>(),
    [section, setSection] = useState("Visão geral"),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [start, setStart] = useState(date(31)),
    [end, setEnd] = useState(date(4)),
    [target, setTarget] = useState(""),
    [comparison, setComparison] = useState<{
      clicks: Delta;
      impressions: Delta;
      sessions: Delta;
      keyEvents: Delta;
      note: string;
    }>();
  async function api(action: string, args: Record<string, unknown> = {}) {
    const r = await fetch("/api/pace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...args }),
    });
    const result = await r.json();
    if (!r.ok) throw new Error(result.error || "Falha na operação");
    return result;
  }
  async function refresh(id = selected) {
    setProjects(await api("projects"));
    if (id) setData(await api("overview", { projectId: id }));
  }
  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha inesperada");
    } finally {
      setBusy("");
    }
  }
  useEffect(() => {
    void run("Carregando", () => refresh(""));
    const params = new URLSearchParams(location.search);
    if (params.get("connected"))
      setMessage("Google conectado. Selecione o projeto para coletar dados.");
    if (params.get("error")) setError(params.get("error")!);
  }, []);
  useEffect(() => {
    if (selected) void run("Carregando projeto", () => refresh(selected));
  }, [selected]);
  async function action(name: string, args: Record<string, unknown> = {}) {
    await api(name, { projectId: selected, ...args });
    await refresh();
    setMessage("Operação concluída.");
  }
  const metric = data?.metrics[0],
    audit = data?.audits[0];
  return (
    <div className="shell">
      <aside>
        <a className="brand" href="/">
          pace<span>®</span>
        </a>
        <p className="eyebrow">INTELIGÊNCIA DE CRESCIMENTO</p>
        <nav>
          {[
            "Visão geral",
            "SEO & evidências",
            "Diagnósticos",
            "Plano de ação",
            "Resultados",
            "Conexões",
          ].map((s) => (
            <button
              className={section === s ? "active" : ""}
              key={s}
              onClick={() => setSection(s)}
            >
              {s}
            </button>
          ))}
        </nav>
        <div className="local">
          <i /> Ambiente local <small>Seus dados. Sua operação.</small>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <span className="eyebrow">WORKSPACE / MARKETING</span>
            <h1>{section}</h1>
          </div>
          <select
            aria-label="Projeto ativo"
            value={selected}
            disabled={!!busy}
            onChange={(e) => {
              setData(undefined);
              setComparison(undefined);
              setSelected(e.target.value);
            }}
          >
            <option value="">Selecione um projeto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </header>
        {error && (
          <div role="alert" className="notice error">
            {error}
          </div>
        )}
        {message && (
          <div role="status" className="notice">
            {message}
          </div>
        )}
        {busy && (
          <div role="status" className="notice">
            ◌ {busy}…
          </div>
        )}
        {(!selected || section === "Conexões") && (
          <section className="panel">
            <span className="eyebrow">COMECE POR AQUI</span>
            <h2>Conecte os dados ao próximo passo.</h2>
            <p>
              Cadastre o site, informe as propriedades e autorize a leitura no
              Google.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void run("Criando projeto", async () => {
                  const p = await api("create", {
                    name: f.get("name"),
                    url: f.get("url"),
                    searchConsoleSite: f.get("gsc"),
                    analyticsProperty: f.get("ga"),
                  });
                  await refresh("");
                  setSelected(p.id);
                  setSection("Visão geral");
                });
              }}
              className="formgrid"
            >
              <label>
                Nome do projeto
                <input required name="name" placeholder="Minha marca" />
              </label>
              <label>
                Site
                <input
                  required
                  type="url"
                  name="url"
                  placeholder="https://exemplo.com.br"
                />
              </label>
              <label>
                Propriedade Search Console
                <input
                  required
                  name="gsc"
                  placeholder="sc-domain:exemplo.com.br"
                />
              </label>
              <label>
                ID numérico da propriedade GA4
                <input
                  required
                  name="ga"
                  pattern="[0-9]+"
                  placeholder="123456789"
                />
              </label>
              <button disabled={!!busy} className="primary">
                Cadastrar projeto ↗
              </button>
            </form>
            {selected && (
              <div className="connection">
                <p>Google: {data?.connected ? "conectado" : "não conectado"}</p>
                <a
                  className="button"
                  href={"/api/google/connect?projectId=" + selected}
                >
                  Conectar / renovar Google ↗
                </a>
              </div>
            )}
          </section>
        )}
        {selected && data && (
          <>
            {(section === "Visão geral" || section === "Resultados") && (
              <>
                <div className="hero">
                  <div>
                    <span className="eyebrow">DO DADO À DECISÃO</span>
                    <h2>
                      Crescimento com
                      <br />
                      <em>evidência.</em>
                    </h2>
                    <p>
                      {data.project.name} · {new URL(data.project.url).hostname}
                    </p>
                  </div>
                  <div className="hero-note">
                    01 — Observar
                    <br />
                    02 — Diagnosticar
                    <br />
                    03 — Validar
                  </div>
                </div>
                <div className="stats">
                  {[
                    ["Cliques orgânicos", metric?.gsc.clicks],
                    ["Impressões", metric?.gsc.impressions],
                    ["Sessões GA4", metric?.ga.sessions],
                    ["Eventos principais", metric?.ga.keyEvents],
                  ].map(([label, value]) => (
                    <article key={label}>
                      <span>{label}</span>
                      <strong>
                        {value === undefined
                          ? "—"
                          : Number(value).toLocaleString("pt-BR")}
                      </strong>
                      <small>
                        {metric
                          ? metric.startDate + " → " + metric.endDate
                          : "Aguardando coleta real"}
                      </small>
                    </article>
                  ))}
                </div>
                <section className="panel">
                  <h2>Coletar métricas</h2>
                  <p>
                    Search Console e GA4 · dados históricos. Use períodos
                    encerrados; pode haver atraso na disponibilização.
                  </p>
                  <div className="row">
                    <label>
                      Início
                      <input
                        type="date"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                      />
                    </label>
                    <label>
                      Fim
                      <input
                        type="date"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                      />
                    </label>
                    <button
                      disabled={!!busy || !data.connected}
                      onClick={() =>
                        void run("Coletando métricas", () =>
                          action("collect", { startDate: start, endDate: end }),
                        )
                      }
                    >
                      Sincronizar
                    </button>
                    {!data.connected && (
                      <a href={"/api/google/connect?projectId=" + selected}>
                        Conectar Google primeiro ↗
                      </a>
                    )}
                  </div>
                </section>
              </>
            )}
            {(section === "Visão geral" || section === "SEO & evidências") && (
              <section className="panel">
                <div className="sectionhead">
                  <div>
                    <span className="eyebrow">SAÚDE DO SITE</span>
                    <h2>Auditoria de páginas</h2>
                  </div>
                  <span className="badge">
                    {audit
                      ? audit.findings.length + " achados"
                      : "Sem auditoria"}
                  </span>
                </div>
                <div className="row">
                  <input
                    aria-label="URL para auditar"
                    type="url"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder={data.project.url}
                  />
                  <button
                    disabled={!!busy}
                    onClick={() =>
                      void run("Auditando página", () =>
                        action("audit", { url: target || undefined }),
                      )
                    }
                  >
                    Auditar página ↗
                  </button>
                </div>
                <p className="muted">
                  Inspeção do HTML recebido: status HTTP, title, description,
                  h1, canonical, noindex e alt. Não executa JavaScript nem mede
                  Core Web Vitals.
                </p>
                {data.audits.map((a) => (
                  <details key={a.id}>
                    <summary>
                      {a.url} · {a.findings.length} achados ·{" "}
                      {new Date(a.at).toLocaleString("pt-BR")}
                    </summary>
                    <code>Evidência: {a.id}</code>
                    {a.findings.length ? (
                      a.findings.map((f) => (
                        <div className="finding" key={f.code}>
                          <span className={"severity " + f.severity}>
                            {f.severity}
                          </span>
                          <div>
                            <b>{f.message}</b>
                            <p>{f.evidence}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p>Nenhum problema nos checks implementados.</p>
                    )}
                  </details>
                ))}
              </section>
            )}
            {section === "Diagnósticos" && (
              <section className="panel">
                <span className="eyebrow">IA LOCAL / OLLAMA</span>
                <h2>Transforme evidências em propostas.</h2>
                <p>
                  O diagnóstico usa auditorias e snapshots reais. As propostas
                  não alteram seu site automaticamente.
                </p>
                <button
                  disabled={
                    !!busy || (!data.audits.length && !data.metrics.length)
                  }
                  className="primary"
                  onClick={() =>
                    void run(
                      "Gerando diagnóstico local (pode levar alguns minutos)",
                      () => action("diagnose"),
                    )
                  }
                >
                  Gerar diagnóstico ↗
                </button>
                {data.diagnoses.map((d) => (
                  <article className="diagnosis" key={d.id}>
                    <small>
                      {d.model} · {new Date(d.at).toLocaleString("pt-BR")}
                    </small>
                    <p className="pre">{d.summary}</p>
                    <details>
                      <summary>Evidências utilizadas</summary>
                      {d.evidenceIds.map((id) => (
                        <code key={id}>
                          {id}
                          <br />
                        </code>
                      ))}
                    </details>
                  </article>
                ))}
              </section>
            )}
            {section === "Plano de ação" && (
              <section className="panel">
                <h2>Propostas com rastreabilidade</h2>
                <p>
                  Aprove a proposta, aplique a mudança no seu site e marque como
                  implementada para revalidar.
                </p>
                {!data.tasks.length && (
                  <p className="empty">
                    Gere um diagnóstico para criar tarefas com evidências.
                  </p>
                )}
                {data.tasks.map((t) => (
                  <article className="task" key={t.id}>
                    <div className="sectionhead">
                      <h3>{t.title}</h3>
                      <span className="badge">
                        {
                          {
                            proposed: "Proposta",
                            approved: "Aprovada",
                            implemented: "Implementada",
                          }[t.status]
                        }
                      </span>
                    </div>
                    <p className="pre">{t.proposal}</p>
                    <details>
                      <summary>Evidências</summary>
                      {t.evidenceIds.map((id) => (
                        <code key={id}>
                          {id}
                          <br />
                        </code>
                      ))}
                    </details>
                    <div className="row">
                      {t.status === "proposed" && (
                        <button
                          disabled={!!busy}
                          onClick={() =>
                            void run("Aprovando proposta", () =>
                              action("task", {
                                taskId: t.id,
                                status: "approved",
                              }),
                            )
                          }
                        >
                          Aprovar proposta
                        </button>
                      )}
                      {t.status === "approved" && (
                        <button
                          disabled={!!busy}
                          onClick={() =>
                            void run("Registrando implementação", () =>
                              action("task", {
                                taskId: t.id,
                                status: "implemented",
                              }),
                            )
                          }
                        >
                          Já implementei no site
                        </button>
                      )}
                      {t.status === "implemented" && t.baselineAuditId && (
                        <button
                          disabled={!!busy}
                          onClick={() =>
                            void run("Validando alteração", () =>
                              action("validate", { taskId: t.id }),
                            )
                          }
                        >
                          Reauditar e comparar
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </section>
            )}
            {section === "Resultados" && (
              <>
                <section className="panel">
                  <h2>Comparar períodos</h2>
                  <p>
                    Selecione snapshots com a mesma duração e sem sobreposição.
                    A comparação não comprova causalidade.
                  </p>
                  <form
                    className="row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void run("Comparando períodos", async () =>
                        setComparison(
                          await api("compare", {
                            projectId: selected,
                            beforeId: f.get("before"),
                            afterId: f.get("after"),
                          }),
                        ),
                      );
                    }}
                  >
                    {["before", "after"].map((n) => (
                      <label key={n}>
                        {n === "before" ? "Antes" : "Depois"}
                        <select name={n} required>
                          <option value="">Escolher período</option>
                          {data.metrics.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.startDate} → {m.endDate} (
                              {new Date(m.at).toLocaleString("pt-BR")})
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                    <button disabled={!!busy}>Comparar</button>
                  </form>
                  {comparison !== undefined && (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Métrica</th>
                            <th>Antes</th>
                            <th>Depois</th>
                            <th>Variação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(
                            [
                              ["clicks", "Cliques"],
                              ["impressions", "Impressões"],
                              ["sessions", "Sessões"],
                              ["keyEvents", "Eventos principais"],
                            ] as const
                          ).map(([key, label]) => {
                            const v = comparison[key];
                            return (
                              <tr key={key}>
                                <td>{label}</td>
                                <td>{v.before.toLocaleString("pt-BR")}</td>
                                <td>{v.after.toLocaleString("pt-BR")}</td>
                                <td>
                                  {v.percent === null
                                    ? "Sem base anterior"
                                    : v.percent.toFixed(1) + "%"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <p className="muted">{comparison.note}</p>
                    </div>
                  )}
                </section>
                <section className="panel">
                  <h2>Validações técnicas</h2>
                  <p>
                    Resultado dos checks automatizados da página; não confirma,
                    sozinho, que o objetivo da proposta foi alcançado.
                  </p>
                  {data.validations.map((v) => (
                    <article className="task" key={v.id}>
                      <b>
                        {v.passed
                          ? "Checks da página sem pendências"
                          : "Revisão necessária"}
                      </b>
                      <p>
                        Resolvidos: {v.resolved.join(", ") || "nenhum"} ·
                        Persistentes: {v.remaining.join(", ") || "nenhum"} ·
                        Novos: {v.introduced.join(", ") || "nenhum"}
                      </p>
                      <small>
                        {new Date(v.at).toLocaleString("pt-BR")} · {v.taskId}
                      </small>
                    </article>
                  ))}
                </section>
              </>
            )}
          </>
        )}
        <footer>
          PACE / LOCAL FIRST <span>Monitorar. Entender. Melhorar.</span>
        </footer>
      </main>
    </div>
  );
}
