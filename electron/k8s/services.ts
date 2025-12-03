import { K8sClient } from './client';
import { V1Service, V1ServicePort, V1Namespace } from '@kubernetes/client-node';

export interface ServiceInfo {
  name: string;
  namespace: string;
  ports: ServicePortInfo[];
}

export interface ServicePortInfo {
  name: string;
  port: number;
  targetPort: string | number;
  protocol: string;
}

export async function getNamespaces(client: K8sClient, cluster: string): Promise<string[]> {
  const originalContext = client.getCurrentContext();
  
  try {
    client.setContext(cluster);
    const api = client.getCoreV1Api();
    const response = await api.listNamespace();
    const items = (response as any).body?.items || (response as any).items || [];
    return items.map((ns: V1Namespace) => ns.metadata?.name || '').filter((name: string) => Boolean(name));
  } finally {
    client.setContext(originalContext);
  }
}

export async function getServices(
  client: K8sClient,
  cluster: string,
  namespace: string
): Promise<ServiceInfo[]> {
  const originalContext = client.getCurrentContext();
  
  try {
    client.setContext(cluster);
    const api = client.getCoreV1Api();
    const response = await api.listNamespacedService({ namespace } as any);
    const items = (response as any).body?.items || (response as any).items || [];
    
    return items.map((service: V1Service) => ({
      name: service.metadata?.name || '',
      namespace: service.metadata?.namespace || namespace,
      ports: (service.spec?.ports || []).map((port: V1ServicePort) => ({
        name: port.name || 'default',
        port: port.port,
        targetPort: port.targetPort || port.port,
        protocol: port.protocol || 'TCP',
      })),
    }));
  } finally {
    client.setContext(originalContext);
  }
}

