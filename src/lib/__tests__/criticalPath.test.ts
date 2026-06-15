import { describe, it, expect } from 'vitest';
import { computeCriticalPath } from '../criticalPath';

describe('computeCriticalPath', () => {
  it('calcula caminho crítico e folga em rede clássica', () => {
    // A(3)->B(2)->D(4) ; A(3)->C(5)->D(4). Crítico = A,C,D (12). B tem folga 3.
    const tasks = [
      { id: 'A', duration: 3 }, { id: 'B', duration: 2 },
      { id: 'C', duration: 5 }, { id: 'D', duration: 4 },
    ];
    const edges = [
      { predecessor_id: 'A', successor_id: 'B' },
      { predecessor_id: 'A', successor_id: 'C' },
      { predecessor_id: 'B', successor_id: 'D' },
      { predecessor_id: 'C', successor_id: 'D' },
    ];
    const r = computeCriticalPath(tasks, edges);
    expect(r.projectDuration).toBe(12);
    expect(r.criticalPath).toEqual(['A', 'C', 'D']);
    expect(r.results['B'].slack).toBe(3);
    expect(r.results['C'].critical).toBe(true);
    expect(r.hasCycle).toBe(false);
  });

  it('detecta ciclo', () => {
    const r = computeCriticalPath(
      [{ id: 'X', duration: 1 }, { id: 'Y', duration: 1 }],
      [{ predecessor_id: 'X', successor_id: 'Y' }, { predecessor_id: 'Y', successor_id: 'X' }],
    );
    expect(r.hasCycle).toBe(true);
  });

  it('trata projeto sem dependências (tudo crítico paralelo)', () => {
    const r = computeCriticalPath([{ id: 'A', duration: 5 }, { id: 'B', duration: 2 }], []);
    expect(r.projectDuration).toBe(5);
    expect(r.results['A'].critical).toBe(true);
  });
});
