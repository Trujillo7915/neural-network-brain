export type EdgeOrigin =
  | 'local-brain'
  | 'agentic-memory'
  | 'semantic-inferred'
  | 'ecc-link'
  | 'simulation';

export interface RawEdgeRecord {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly relationType: string;
  readonly origin: EdgeOrigin;
  readonly weight: number;
  readonly createdAt: string;
}

export interface SynapticEdge {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly relationType: string;
  readonly origin: EdgeOrigin;
  readonly weight: number;
  readonly createdAt: string;
}
