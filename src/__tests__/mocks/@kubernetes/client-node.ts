export class KubeConfig {
  loadFromFile = jest.fn();
  loadFromDefault = jest.fn();
  getContexts = jest.fn().mockReturnValue([]);
  getCurrentContext = jest.fn().mockReturnValue("default-context");
  setCurrentContext = jest.fn();
  makeApiClient = jest.fn();
}

export class CoreV1Api {
  listNamespacedPod = jest.fn();
  listNamespacedService = jest.fn();
  readNamespacedEndpoints = jest.fn();
}

export class AppsV1Api {
  listNamespacedDeployment = jest.fn();
}
