import { type WebSocket } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { DocManager } from "./doc-manager";
import { verifyAccessToken } from "../auth/token";
import { loadConfig } from "../config";

const messageSync = 0;
const messageAwareness = 1;

interface ConnectionState {
  userId: string;
  username: string;
  docName: string | null;
  ws: WebSocket;
}

const docManager = new DocManager();
const allConnections = new Map<string, Set<WebSocket>>();

export function getDocManager(): DocManager {
  return docManager;
}

export async function handleConnection(ws: WebSocket, request: { url?: string }): Promise<void> {
  const config = loadConfig();

  const url = new URL(request.url ?? "/", "http://localhost");
  const token = url.searchParams.get("token");

  if (!token) {
    ws.close(4001, "Missing token");
    return;
  }

  let payload: { userId: string; username: string };
  try {
    payload = verifyAccessToken(token, config.jwtSecret);
  } catch {
    ws.close(4001, "Invalid token");
    return;
  }

  const state: ConnectionState = {
    userId: payload.userId,
    username: payload.username,
    docName: null,
    ws,
  };

  ws.on("message", (data: Buffer | ArrayBuffer | Buffer[]) => {
    try {
      const buf =
        data instanceof ArrayBuffer
          ? new Uint8Array(data)
          : Buffer.isBuffer(data)
            ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
            : new Uint8Array((data as Buffer[])[0]);
      handleMessage(state, buf);
    } catch (err) {
      console.error("Error handling WS message:", err);
    }
  });

  ws.on("close", () => {
    if (state.docName) {
      const subs = allConnections.get(state.docName);
      if (subs) {
        subs.delete(ws);
        if (subs.size === 0) allConnections.delete(state.docName);
      }
      docManager.removeConnection(state.docName);
    }
  });
}

async function handleMessage(state: ConnectionState, message: Uint8Array): Promise<void> {
  const decoder = decoding.createDecoder(message);
  const messageType = decoding.readVarUint(decoder);

  switch (messageType) {
    case messageSync: {
      const syncType = decoding.readVarUint(decoder);

      if (syncType === syncProtocol.messageYjsSyncStep1) {
        await handleSyncStep1(state, decoder);
      } else if (syncType === syncProtocol.messageYjsSyncStep2) {
        await handleSyncStep2(state, decoder);
      } else if (syncType === syncProtocol.messageYjsUpdate) {
        await handleUpdate(state, decoder);
      }
      break;
    }
    case messageAwareness: {
      if (state.docName) {
        broadcastToOthers(state, message);
      }
      break;
    }
  }
}

async function handleSyncStep1(state: ConnectionState, decoder: decoding.Decoder): Promise<void> {
  const docName = decoding.readVarString(decoder);
  state.docName = docName;

  const doc = await docManager.getDoc(docName);
  docManager.addConnection(docName);

  if (!allConnections.has(docName)) {
    allConnections.set(docName, new Set());
  }
  allConnections.get(docName)!.add(state.ws);

  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  encoding.writeVarUint(encoder, syncProtocol.messageYjsSyncStep2);

  const sv = decoding.readVarUint8Array(decoder);
  const update = Y.encodeStateAsUpdate(doc, sv);
  encoding.writeVarUint8Array(encoder, update);

  state.ws.send(encoding.toUint8Array(encoder));
}

async function handleSyncStep2(state: ConnectionState, decoder: decoding.Decoder): Promise<void> {
  if (!state.docName) return;

  const update = decoding.readVarUint8Array(decoder);
  await docManager.applyUpdate(state.docName, update, state.userId);
  broadcastToOthers(state, createUpdateMessage(update));
}

async function handleUpdate(state: ConnectionState, decoder: decoding.Decoder): Promise<void> {
  if (!state.docName) return;

  const update = decoding.readVarUint8Array(decoder);
  await docManager.applyUpdate(state.docName, update, state.userId);
  broadcastToOthers(state, createUpdateMessage(update));
}

function createUpdateMessage(update: Uint8Array): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  encoding.writeVarUint(encoder, syncProtocol.messageYjsUpdate);
  encoding.writeVarUint8Array(encoder, update);
  return encoding.toUint8Array(encoder);
}

function broadcastToOthers(sender: ConnectionState, message: Uint8Array): void {
  if (!sender.docName) return;
  const subs = allConnections.get(sender.docName);
  if (!subs) return;

  for (const ws of subs) {
    if (ws !== sender.ws && ws.readyState === 1) {
      ws.send(message);
    }
  }
}
