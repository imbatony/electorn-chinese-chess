export interface EngineQueryRequest {
  id: number;
  fen: string;
  revision: number;
}

export interface PositionIdentity {
  key: string;
  revision: number;
}

export function isSamePosition(source: PositionIdentity, current: PositionIdentity): boolean {
  return source.key === current.key && source.revision === current.revision;
}

export class EngineQueryTracker {
  private nextId = 0;
  private pending?: EngineQueryRequest;

  start(fen: string, revision: number): EngineQueryRequest | undefined {
    if (this.pending?.fen === fen && this.pending.revision === revision) {
      return undefined;
    }

    const request = { id: ++this.nextId, fen, revision };
    this.pending = request;
    return request;
  }

  isFresh(request: EngineQueryRequest, fen: string, revision: number): boolean {
    return this.pending?.id === request.id && request.fen === fen && request.revision === revision;
  }

  finish(request: EngineQueryRequest): void {
    if (this.pending?.id === request.id) {
      this.pending = undefined;
    }
  }
}
