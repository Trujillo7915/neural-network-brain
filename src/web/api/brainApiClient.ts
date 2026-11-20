import type { BrainSnapshot } from '../../domain/entities/BrainSnapshot.js';
import type { MemorySourceCode } from '../../domain/entities/NeuronNode.js';
import type { BrainLobeCode } from '../../domain/value-objects/BrainLobe.js';
import type { NeuronDetailDto, SearchBrainResultDto } from '../../application/dto/BrainDtos.js';

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string; title?: string };
      detail = body.detail || body.title || detail;
    } catch {
      // ignore non-json error body
    }
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

export function fetchBrainSnapshot(simulateCount?: number): Promise<BrainSnapshot> {
  const query = simulateCount !== undefined ? `?simulateCount=${simulateCount}` : '';
  return fetchJson<BrainSnapshot>(`/api/v1/brain${query}`);
}

export function fetchBrainVersion(): Promise<{ revisionToken: string; checkedAt: string }> {
  return fetchJson<{ revisionToken: string; checkedAt: string }>('/api/v1/brain/version');
}

export function refreshBrainSnapshot(): Promise<BrainSnapshot> {
  return fetchJson<BrainSnapshot>('/api/v1/brain/refresh', { method: 'POST' });
}

export function fetchNeuronDetail(id: string, simulateCount?: number): Promise<NeuronDetailDto> {
  const query = simulateCount !== undefined ? `?simulateCount=${simulateCount}` : '';
  return fetchJson<NeuronDetailDto>(`/api/v1/brain/nodes/${encodeURIComponent(id)}${query}`);
}

export function searchBrainNodes(params: {
  q?: string;
  source?: MemorySourceCode;
  lobe?: BrainLobeCode;
  minConfidence?: number;
  simulateCount?: number;
}): Promise<SearchBrainResultDto> {
  const sp = new URLSearchParams();
  if (params.q && params.q.trim()) sp.set('q', params.q.trim());
  if (params.source) sp.set('source', params.source);
  if (params.lobe) sp.set('lobe', params.lobe);
  if (params.minConfidence !== undefined && params.minConfidence > 0) {
    sp.set('minConfidence', String(params.minConfidence));
  }
  if (params.simulateCount !== undefined) {
    sp.set('simulateCount', String(params.simulateCount));
  }
  const qs = sp.toString();
  return fetchJson<SearchBrainResultDto>(`/api/v1/brain/search${qs ? `?${qs}` : ''}`);
}

export interface CreateMemoryPayload {
  readonly title: string;
  readonly content: string;
  readonly kind: string;
  readonly tags: readonly string[];
  readonly confidence: number;
  readonly links: readonly { targetId: string; relationType: string }[];
}

export interface CreateEdgePayload {
  readonly sourceId: string;
  readonly targetId: string;
  readonly relationType: string;
  readonly weight?: number;
}

export function createMemoryNode(payload: CreateMemoryPayload): Promise<BrainSnapshot> {
  return fetchJson<BrainSnapshot>('/api/v1/brain/memories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function createMemoryEdge(payload: CreateEdgePayload): Promise<BrainSnapshot> {
  return fetchJson<BrainSnapshot>('/api/v1/brain/edges', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function deleteMemoryNode(id: string): Promise<BrainSnapshot> {
  return fetchJson<BrainSnapshot>(`/api/v1/brain/memories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
