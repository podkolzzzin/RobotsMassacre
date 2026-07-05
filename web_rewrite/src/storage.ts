const INDEX_KEY = 'rmm-maps';
const MAP_KEY_PREFIX = 'rmm-map:';
const LOCAL_PATH_PREFIX = 'local:';

export interface LocalMapInfo {
  mode: string;
  name: string;
}

export function listLocalMaps(mode?: string): LocalMapInfo[] {
  const maps = readIndex();
  return mode ? maps.filter((map) => map.mode === mode) : maps;
}

export function saveLocalMap(mode: string, name: string, buffer: ArrayBuffer): void {
  localStorage.setItem(mapKey(mode, name), toBase64(buffer));
  const maps = readIndex();
  if (!maps.some((map) => map.mode === mode && map.name === name)) {
    maps.push({ mode, name });
    localStorage.setItem(INDEX_KEY, JSON.stringify(maps));
  }
}

export function loadLocalMap(mode: string, name: string): ArrayBuffer | undefined {
  const encoded = localStorage.getItem(mapKey(mode, name));
  return encoded ? fromBase64(encoded) : undefined;
}

export function localMapPath(mode: string, name: string): string {
  return `${LOCAL_PATH_PREFIX}${mode}/${name}`;
}

export function isLocalMapPath(path: string): boolean {
  return path.startsWith(LOCAL_PATH_PREFIX);
}

export function loadLocalMapByPath(path: string): ArrayBuffer | undefined {
  if (!isLocalMapPath(path)) return undefined;
  const separator = path.indexOf('/', LOCAL_PATH_PREFIX.length);
  if (separator < 0) return undefined;
  return loadLocalMap(path.slice(LOCAL_PATH_PREFIX.length, separator), path.slice(separator + 1));
}

function readIndex(): LocalMapInfo[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((map): map is LocalMapInfo => typeof map?.mode === 'string' && typeof map?.name === 'string');
  } catch {
    return [];
  }
}

function mapKey(mode: string, name: string): string {
  return `${MAP_KEY_PREFIX}${mode}:${name}`;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(encoded: string): ArrayBuffer {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
