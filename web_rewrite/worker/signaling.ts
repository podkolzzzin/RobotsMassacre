declare class WebSocketPair {
  0: WebSocket;
  1: WebSocket;
}

interface DurableObjectStorage {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  list<T>(): Promise<Map<string, T>>;
}

interface DurableObjectState {
  acceptWebSocket(socket: WebSocket): void;
  getWebSockets(): WebSocket[];
  storage: DurableObjectStorage;
}

interface DurableObjectNamespace<T> {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub<T>;
}

interface DurableObjectId {}

interface DurableObjectStub<T> {
  fetch(request: Request | string, init?: RequestInit): Promise<Response>;
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
  LOBBY: DurableObjectNamespace<LobbyObject>;
  KILLS: DurableObjectNamespace<KillsObject>;
}

interface SocketAttachment {
  id: string;
  room: string;
  mode: string;
  level: string;
}

export interface RoomEntry {
  room: string;
  players: number;
  mode: string;
  level: string;
  updatedAt: number;
}

const ROOM_TTL_MS = 10 * 60 * 1000;

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/rooms') {
      return env.LOBBY.get(env.LOBBY.idFromName('lobby')).fetch(request);
    }
    if (url.pathname === '/leaderboard' || url.pathname === '/kills') {
      return env.KILLS.get(env.KILLS.idFromName('kills')).fetch(request);
    }
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

  constructor(private readonly state: DurableObjectState, private readonly env: Env) {
    this.state.getWebSockets().forEach((socket) => {
      const attachment = readAttachment(socket);
      if (attachment) this.sockets.set(attachment.id, socket);
    });
  }

  fetch(request: Request): Response {
    const url = new URL(request.url);
    const id = url.searchParams.get('id') ?? crypto.randomUUID();
    const attachment: SocketAttachment = {
      id,
      room: url.pathname.slice('/room/'.length) || 'default',
      mode: url.searchParams.get('mode') ?? 'dm',
      level: url.searchParams.get('level') ?? '',
    };
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.state.acceptWebSocket(server);
    server.serializeAttachment(attachment);
    this.sockets.set(id, server);
    this.broadcast({ type: 'join', id }, id);
    void this.reportToLobby();
    return new Response(null, { status: 101, webSocket: client } as WebSocketResponseInit);
  }

  webSocketMessage(socket: WebSocket, message: string): void {
    const sender = readAttachment(socket)?.id;
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
    const attachment = readAttachment(socket);
    if (attachment) this.sockets.delete(attachment.id);
    void this.reportToLobby(attachment);
  }

  private async reportToLobby(dropped?: SocketAttachment): Promise<void> {
    const first = [...this.sockets.values()].map(readAttachment).find((attachment) => attachment) ?? dropped;
    if (!first) return;
    const entry: RoomEntry = {
      room: first.room,
      players: this.sockets.size,
      mode: first.mode,
      level: first.level,
      updatedAt: Date.now(),
    };
    await this.env.LOBBY.get(this.env.LOBBY.idFromName('lobby')).fetch('https://lobby/update', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }
}

export class LobbyObject {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method === 'POST') {
      const entry = (await request.json()) as RoomEntry;
      if (!entry.room) return new Response(null, { status: 400 });
      if (entry.players > 0) await this.state.storage.put(`room:${entry.room}`, entry);
      else await this.state.storage.delete(`room:${entry.room}`);
      return new Response(null, { status: 204 });
    }
    const entries = await this.state.storage.list<RoomEntry>();
    const now = Date.now();
    const rooms = [...entries.values()]
      .filter((entry) => entry.players > 0 && now - entry.updatedAt < ROOM_TTL_MS)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return new Response(JSON.stringify({ rooms }), { headers: { 'content-type': 'application/json' } });
  }
}

// Older sockets carried a plain string id; newer ones carry the full attachment.
function readAttachment(socket: WebSocket): SocketAttachment | undefined {
  const value = socket.deserializeAttachment();
  if (typeof value === 'string') return { id: value, room: '', mode: 'dm', level: '' };
  if (typeof value === 'object' && value !== null && 'id' in value) return value as SocketAttachment;
  return undefined;
}

export interface KillsEntry {
  name: string;
  kills: number;
}

export class KillsObject {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/kills') {
      const body = (await request.json()) as { name?: unknown; kills?: unknown };
      const rawName = typeof body.name === 'string' ? body.name.trim().slice(0, 32) : '';
      const name = /^[\x20-\x7E]+$/.test(rawName) ? rawName : '';
      const kills = typeof body.kills === 'number' && Number.isFinite(body.kills) ? Math.max(0, Math.floor(body.kills)) : 0;
      if (!name || kills === 0) return new Response(JSON.stringify({ error: 'Invalid name or kills value' }), { status: 400, headers: { 'content-type': 'application/json' } });
      const key = `kills:${name}`;
      const stored = await this.state.storage.get<KillsEntry>(key);
      const current = stored?.kills ?? 0;
      await this.state.storage.put(key, { name, kills: current + kills });
      return new Response(null, { status: 204 });
    }
    const entries = await this.state.storage.list<KillsEntry>();
    const leaderboard = [...entries.values()].sort((a, b) => b.kills - a.kills);
    return new Response(JSON.stringify({ leaderboard }), { headers: { 'content-type': 'application/json' } });
  }
}
