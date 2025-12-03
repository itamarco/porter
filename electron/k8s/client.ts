import * as k8s from '@kubernetes/client-node';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class K8sClient {
  private kc: k8s.KubeConfig;

  constructor() {
    this.kc = new k8s.KubeConfig();
    this.loadConfig();
  }

  loadConfig() {
    const kubeconfigPath = process.env.KUBECONFIG || path.join(os.homedir(), '.kube', 'config');
    
    if (fs.existsSync(kubeconfigPath)) {
      this.kc.loadFromFile(kubeconfigPath);
    } else {
      this.kc.loadFromDefault();
    }
  }

  getContexts(): k8s.Context[] {
    return this.kc.getContexts();
  }

  getCurrentContext(): string {
    return this.kc.getCurrentContext();
  }

  setContext(contextName: string) {
    this.kc.setCurrentContext(contextName);
  }

  getCoreV1Api(): k8s.CoreV1Api {
    return this.kc.makeApiClient(k8s.CoreV1Api);
  }

  getKubeConfig(): k8s.KubeConfig {
    return this.kc;
  }
}

