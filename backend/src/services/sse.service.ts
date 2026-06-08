import { Response } from 'express';

// homeId -> set of SSE response objects for connected clients
const clients = new Map<string, Set<Response>>();

export function addSseClient(homeId: string, res: Response) {
  if (!clients.has(homeId)) clients.set(homeId, new Set());
  clients.get(homeId)!.add(res);
}

export function removeSseClient(homeId: string, res: Response) {
  clients.get(homeId)?.delete(res);
}

export function notifyHomeClients(homeId: string, event: string, data: string) {
  clients.get(homeId)?.forEach(res => {
    try { res.write(`event: ${event}\ndata: ${data}\n\n`); } catch {}
  });
}
