import { Game } from './game';
import { NetworkGameState } from './types';

type SignalMessage =
  | { type: 'join'; id: string }
  | { type: 'meta'; from: string; to: string; mode: string; level: string }
  | { type: 'offer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; from: string; to: string; candidate: RTCIceCandidateInit };

const DEFAULT_LEVEL = '/levels/dm/open.rmm';

function currentMeta(): { mode: string; level: string } {
  const params = new URLSearchParams(location.search);
  return { mode: params.get('mode') ?? 'dm', level: params.get('level') ?? DEFAULT_LEVEL };
}

interface SignalTransport {
  send(message: SignalMessage): void;
  close(): void;
}

export class Multiplayer {
  private readonly peers = new Map<string, RTCPeerConnection>();
  private readonly channels = new Map<string, RTCDataChannel>();
  private transport?: SignalTransport;

  constructor(private readonly game: Game) {}

  connect(room: string, mode: 'worker' | 'broadcast' = 'worker'): void {
    this.transport = mode === 'broadcast'
      ? new BroadcastSignal(room, this.game.localId, (message) => void this.handleSignal(message))
      : new WorkerSignal(room, this.game.localId, (message) => void this.handleSignal(message));
  }

  disconnect(): void {
    this.transport?.close();
    for (const channel of this.channels.values()) channel.close();
    for (const peer of this.peers.values()) peer.close();
    this.channels.clear();
    this.peers.clear();
  }

  connectedPeerCount(): number {
    return [...this.channels.values()].filter((channel) => channel.readyState === 'open').length;
  }

  broadcast(): void {
    const payload = JSON.stringify({ type: 'state', state: this.game.networkState() });
    for (const channel of this.channels.values()) {
      if (channel.readyState === 'open') channel.send(payload);
    }
  }

  private async handleSignal(message: SignalMessage): Promise<void> {
    if ('from' in message && message.from === this.game.localId) return;
    if ('to' in message && message.to !== this.game.localId) return;
    if (message.type === 'join' && message.id !== this.game.localId) {
      const meta = currentMeta();
      this.send({ type: 'meta', from: this.game.localId, to: message.id, mode: meta.mode, level: meta.level });
      await this.createOffer(message.id);
      return;
    }
    if (message.type === 'meta') {
      const meta = currentMeta();
      if (meta.mode !== message.mode || meta.level !== message.level) {
        const params = new URLSearchParams(location.search);
        params.set('mode', message.mode);
        params.set('level', message.level);
        params.set('play', '1');
        location.search = params.toString();
      }
      return;
    }
    if (message.type === 'offer') {
      const peer = this.ensurePeer(message.from, false);
      await peer.setRemoteDescription(message.sdp);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      this.send({ type: 'answer', from: this.game.localId, to: message.from, sdp: answer });
      return;
    }
    if (message.type === 'answer') {
      await this.peers.get(message.from)?.setRemoteDescription(message.sdp);
      return;
    }
    if (message.type === 'ice') {
      await this.peers.get(message.from)?.addIceCandidate(message.candidate);
    }
  }

  private async createOffer(remoteId: string): Promise<void> {
    const peer = this.ensurePeer(remoteId, true);
    const channel = peer.createDataChannel('state');
    this.bindChannel(remoteId, channel);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    this.send({ type: 'offer', from: this.game.localId, to: remoteId, sdp: offer });
  }

  private ensurePeer(remoteId: string, initiator: boolean): RTCPeerConnection {
    const existing = this.peers.get(remoteId);
    if (existing) return existing;
    const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    this.peers.set(remoteId, peer);
    peer.onicecandidate = (event) => {
      if (event.candidate) this.send({ type: 'ice', from: this.game.localId, to: remoteId, candidate: event.candidate.toJSON() });
    };
    if (!initiator) peer.ondatachannel = (event) => this.bindChannel(remoteId, event.channel);
    return peer;
  }

  private bindChannel(remoteId: string, channel: RTCDataChannel): void {
    this.channels.set(remoteId, channel);
    channel.onmessage = (event) => {
      const message = JSON.parse(event.data) as { type: 'state'; state: NetworkGameState };
      if (message.type === 'state') this.game.applyNetworkState(message.state);
    };
  }

  private send(message: SignalMessage): void {
    this.transport?.send(message);
  }
}

class WorkerSignal implements SignalTransport {
  private readonly socket: WebSocket;
  private readonly queue: SignalMessage[] = [];

  constructor(room: string, id: string, onMessage: (message: SignalMessage) => void) {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this.socket = new WebSocket(`${proto}://${location.host}/room/${encodeURIComponent(room)}?id=${encodeURIComponent(id)}`);
    this.socket.onopen = () => {
      for (const message of this.queue.splice(0)) this.socket.send(JSON.stringify(message));
    };
    this.socket.onmessage = (event) => onMessage(JSON.parse(event.data) as SignalMessage);
  }

  send(message: SignalMessage): void {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
    else this.queue.push(message);
  }

  close(): void {
    this.socket.close();
  }
}

class BroadcastSignal implements SignalTransport {
  private readonly channel: BroadcastChannel;

  constructor(room: string, private readonly id: string, onMessage: (message: SignalMessage) => void) {
    this.channel = new BroadcastChannel(`robots-massacre:${room}`);
    this.channel.onmessage = (event: MessageEvent<SignalMessage>) => onMessage(event.data);
    window.setTimeout(() => this.send({ type: 'join', id }), 0);
  }

  send(message: SignalMessage): void {
    this.channel.postMessage(message);
  }

  close(): void {
    this.channel.close();
  }
}
