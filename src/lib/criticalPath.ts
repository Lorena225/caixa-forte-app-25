/**
 * Critical Path Method (CPM) para o cronograma de projetos.
 *
 * Calcula, para cada tarefa: early start/finish, late start/finish, folga (slack)
 * e se está no caminho crítico (slack == 0). Dependências do tipo finish-start.
 *
 * Entrada: tarefas com duração (em dias) e arestas predecessor->successor.
 * Saída: mapa por taskId com os campos calculados.
 */

export interface CpmTask {
  id: string;
  duration: number; // dias (>= 0)
}

export interface CpmEdge {
  predecessor_id: string;
  successor_id: string;
}

export interface CpmResult {
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  slack: number;
  critical: boolean;
}

export interface CpmOutput {
  results: Record<string, CpmResult>;
  projectDuration: number;
  hasCycle: boolean;
  criticalPath: string[]; // ids ordenados ao longo do caminho crítico
}

export function computeCriticalPath(tasks: CpmTask[], edges: CpmEdge[]): CpmOutput {
  const ids = tasks.map((t) => t.id);
  const idSet = new Set(ids);
  const dur: Record<string, number> = {};
  tasks.forEach((t) => { dur[t.id] = Math.max(0, t.duration || 0); });

  // só arestas entre tarefas válidas
  const validEdges = edges.filter((e) => idSet.has(e.predecessor_id) && idSet.has(e.successor_id));

  const successors: Record<string, string[]> = {};
  const predecessors: Record<string, string[]> = {};
  ids.forEach((id) => { successors[id] = []; predecessors[id] = []; });
  validEdges.forEach((e) => {
    successors[e.predecessor_id].push(e.successor_id);
    predecessors[e.successor_id].push(e.predecessor_id);
  });

  // ordenação topológica (Kahn) — detecta ciclo
  const indeg: Record<string, number> = {};
  ids.forEach((id) => { indeg[id] = predecessors[id].length; });
  const queue = ids.filter((id) => indeg[id] === 0);
  const topo: string[] = [];
  while (queue.length) {
    const n = queue.shift()!;
    topo.push(n);
    successors[n].forEach((s) => {
      indeg[s] -= 1;
      if (indeg[s] === 0) queue.push(s);
    });
  }
  const hasCycle = topo.length !== ids.length;

  const empty: CpmOutput = {
    results: Object.fromEntries(ids.map((id) => [id, {
      earlyStart: 0, earlyFinish: dur[id], lateStart: 0, lateFinish: dur[id], slack: 0, critical: false,
    }])),
    projectDuration: 0,
    hasCycle,
    criticalPath: [],
  };
  if (hasCycle) return empty;

  // forward pass: early start/finish
  const es: Record<string, number> = {};
  const ef: Record<string, number> = {};
  topo.forEach((id) => {
    es[id] = predecessors[id].length === 0 ? 0 : Math.max(...predecessors[id].map((p) => ef[p]));
    ef[id] = es[id] + dur[id];
  });

  const projectDuration = ids.length ? Math.max(...ids.map((id) => ef[id])) : 0;

  // backward pass: late start/finish
  const ls: Record<string, number> = {};
  const lf: Record<string, number> = {};
  [...topo].reverse().forEach((id) => {
    lf[id] = successors[id].length === 0 ? projectDuration : Math.min(...successors[id].map((s) => ls[s]));
    ls[id] = lf[id] - dur[id];
  });

  const results: Record<string, CpmResult> = {};
  ids.forEach((id) => {
    const slack = ls[id] - es[id];
    results[id] = {
      earlyStart: es[id], earlyFinish: ef[id],
      lateStart: ls[id], lateFinish: lf[id],
      slack, critical: slack === 0,
    };
  });

  // reconstrói o caminho crítico ordenado (encadeia tarefas críticas por ef)
  const criticalPath = ids
    .filter((id) => results[id].critical)
    .sort((a, b) => results[a].earlyStart - results[b].earlyStart);

  return { results, projectDuration, hasCycle, criticalPath };
}
