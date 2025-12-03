import { K8sClient } from './client';

export interface ClusterInfo {
  name: string;
  context: string;
  server: string;
}

export async function getClusters(client: K8sClient): Promise<ClusterInfo[]> {
  const contexts = client.getContexts();
  
  return contexts.map((ctx) => ({
    name: ctx.name,
    context: ctx.name,
    server: ctx.cluster || '',
  }));
}

