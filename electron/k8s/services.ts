import { K8sClient } from "./client";
import { V1Service, V1ServicePort, V1Namespace } from "@kubernetes/client-node";
import { logger } from "../logger";

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

export async function getNamespaces(
  client: K8sClient,
  cluster: string
): Promise<string[]> {
  const originalContext = client.getCurrentContext();

  logger.info(
    `[getNamespaces] Starting namespace fetch for cluster: ${cluster}`
  );

  try {
    client.setContext(cluster);
    logger.info(`[getNamespaces] Switched context to: ${cluster}`);

    const api = client.getCoreV1Api();
    logger.info(`[getNamespaces] Calling Kubernetes API to list namespaces...`);

    const response = await api.listNamespace();
    const items =
      (response as any).body?.items || (response as any).items || [];
    const namespaces = items
      .map((ns: V1Namespace) => ns.metadata?.name || "")
      .filter((name: string) => Boolean(name));

    logger.info(
      `[getNamespaces] Successfully fetched ${namespaces.length} namespaces for cluster ${cluster}:`,
      namespaces
    );
    return namespaces;
  } catch (error) {
    logger.error(
      `[getNamespaces] Error fetching namespaces for cluster ${cluster}:`,
      error
    );
    if (error instanceof Error) {
      logger.error(`[getNamespaces] Error message: ${error.message}`);
      logger.error(`[getNamespaces] Error stack: ${error.stack}`);
    }
    throw error;
  } finally {
    client.setContext(originalContext);
    logger.info(`[getNamespaces] Restored context to: ${originalContext}`);
  }
}

export async function getServices(
  client: K8sClient,
  cluster: string,
  namespace: string
): Promise<ServiceInfo[]> {
  const originalContext = client.getCurrentContext();

  logger.info(
    `[getServices] Starting service fetch for cluster: ${cluster}, namespace: ${namespace}`
  );

  try {
    client.setContext(cluster);
    logger.info(`[getServices] Switched context to: ${cluster}`);

    const api = client.getCoreV1Api();
    logger.info(
      `[getServices] Calling Kubernetes API to list services in namespace ${namespace}...`
    );

    const response = await api.listNamespacedService({ namespace } as any);
    const items =
      (response as any).body?.items || (response as any).items || [];

    logger.info(`[getServices] Received ${items.length} services from API`);

    const services = items.map((service: V1Service) => ({
      name: service.metadata?.name || "",
      namespace: service.metadata?.namespace || namespace,
      ports: (service.spec?.ports || []).map((port: V1ServicePort) => ({
        name: port.name || "default",
        port: port.port,
        targetPort: port.targetPort || port.port,
        protocol: port.protocol || "TCP",
      })),
    }));

    logger.info(
      `[getServices] Successfully processed ${services.length} services for cluster ${cluster}, namespace ${namespace}`
    );
    services.forEach((service: ServiceInfo) => {
      logger.info(
        `[getServices]   - Service: ${service.name}, Ports: ${service.ports.length}`
      );
    });

    return services;
  } catch (error) {
    logger.error(
      `[getServices] Error fetching services for cluster ${cluster}, namespace ${namespace}:`,
      error
    );
    if (error instanceof Error) {
      logger.error(`[getServices] Error message: ${error.message}`);
      logger.error(`[getServices] Error stack: ${error.stack}`);
    }
    throw error;
  } finally {
    client.setContext(originalContext);
    logger.info(`[getServices] Restored context to: ${originalContext}`);
  }
}
