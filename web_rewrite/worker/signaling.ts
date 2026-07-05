declare class WebSocketPair {
  0: WebSocket;
  1: WebSocket;
}

interface DurableObjectState {
  acceptWebSocket(socket: WebSocket): void;
  getWebSockets(): WebSocket[];
}

interface DurableObjectNamespace<T> {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub<T>;
}

interface DurableObjectId {}

interface DurableObjectStub<T> {
  fetch(request: Request): Promise<Response>;
}

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface WebSocketResponseInit {
  status: number;
  webSocket?: WebSocket;
}

interface WebSocket {
  send(data: string): void;
  serializeAttachment(value: unknown): void;
  deserializeAttachment(): unknown;
}

export interface Env {
  ASSETS: Fetcher;
  ROOMS: DurableObjectNamespace<RoomObject>;
}

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/room/')) {
      const roomName = url.pathname.slice('/room/'.length) || 'default';
      const id = env.ROOMS.idFromName(roomName);
      return env.ROOMS.get(id).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};

export class RoomObject {
  private readonly sockets = new Map<string, WebSocket>();

  constructor(private readonly state: DurableObjectState) {
    this.state.getWebSockets().forEach((socket) => {
      const id = socket.deserializeAttachment() as string | undefined;
      if (id) this.sockets.set(id, socket);
    });
  }

  fetch(request: Request): Response {
    const url = new URL(request.url);
    const id = url.searchParams.get('id') ?? crypto.randomUUID();
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.state.acceptWebSocket(server);
    server.serializeAttachment(id);
    this.sockets.set(id, server);
    this.broadcast({ type: 'join', id }, id);
    return new Response(null, { status: 101, webSocket: client } as WebSocketResponseInit);
  }

  webSocketMessage(socket: WebSocket, message: string): void {
    const sender = socket.deserializeAttachment() as string | undefined;
    if (!sender) return;
    const parsed = JSON.parse(message) as { to?: string };
    if (parsed.to && this.sockets.has(parsed.to)) {
      this.sockets.get(parsed.to)?.send(message);
      return;
    }
    this.broadcast(JSON.parse(message), sender);
  }

  webSocketClose(socket: WebSocket): void {
    this.drop(socket);
  }

  webSocketError(socket: WebSocket): void {
    this.drop(socket);
  }

  private broadcast(message: unknown, except?: string): void {
    const payload = JSON.stringify(message);
    for (const [id, socket] of this.sockets) {
      if (id !== except) socket.send(payload);
    }
  }

  private drop(socket: WebSocket): void {
    const id = socket.deserializeAttachment() as string | undefined;
    if (id) this.sockets.delete(id);
  }
}
