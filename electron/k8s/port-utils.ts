import { spawn } from "child_process";
import { logger } from "../logger";

export interface ProcessInfo {
  pid: number;
  port: number;
  processName: string;
  commandLine: string;
}

export async function getProcessUsingPort(port: number): Promise<ProcessInfo | null> {
  const platform = process.platform;
  
  try {
    if (platform === "win32") {
      return await getProcessUsingPortWindows(port);
    } else {
      return await getProcessUsingPortUnix(port);
    }
  } catch (error) {
    logger.error(`[PortUtils] Error getting process for port ${port}:`, error);
    return null;
  }
}

async function getProcessUsingPortUnix(port: number): Promise<ProcessInfo | null> {
  const pid = await new Promise<number | null>((resolve) => {
    const lsof = spawn("lsof", ["-ti", `:${port}`]);
    
    let output = "";
    lsof.stdout?.on("data", (data: Buffer) => {
      output += data.toString();
    });
    
    lsof.on("exit", (code) => {
      if (code === 0 && output.trim()) {
        const pidStr = output.trim().split("\n")[0];
        resolve(parseInt(pidStr, 10));
      } else {
        resolve(null);
      }
    });
    
    lsof.on("error", (error) => {
      logger.error(`[PortUtils] Error running lsof:`, error);
      resolve(null);
    });
  });
  
  if (!pid) {
    return null;
  }
  
  const processDetails = await new Promise<{ name: string; command: string } | null>((resolve) => {
    const ps = spawn("ps", ["-p", pid.toString(), "-o", "comm=,args="]);
    
    let output = "";
    ps.stdout?.on("data", (data: Buffer) => {
      output += data.toString();
    });
    
    ps.on("exit", (code) => {
      if (code === 0 && output.trim()) {
        const parts = output.trim().split(/\s+/);
        const name = parts[0] || "unknown";
        const command = parts.slice(1).join(" ") || parts[0] || "unknown";
        resolve({ name, command });
      } else {
        resolve(null);
      }
    });
    
    ps.on("error", (error) => {
      logger.error(`[PortUtils] Error running ps:`, error);
      resolve(null);
    });
  });
  
  if (!processDetails) {
    return {
      pid,
      port,
      processName: "unknown",
      commandLine: "unknown",
    };
  }
  
  return {
    pid,
    port,
    processName: processDetails.name,
    commandLine: processDetails.command,
  };
}

async function getProcessUsingPortWindows(port: number): Promise<ProcessInfo | null> {
  const pid = await new Promise<number | null>((resolve) => {
    const netstat = spawn("netstat", ["-ano"]);
    
    let output = "";
    netstat.stdout?.on("data", (data: Buffer) => {
      output += data.toString();
    });
    
    netstat.on("exit", (code) => {
      if (code === 0) {
        const lines = output.split("\n");
        for (const line of lines) {
          if (line.includes(`:${port} `) || line.includes(`:${port}\t`)) {
            const parts = line.trim().split(/\s+/);
            const pidStr = parts[parts.length - 1];
            const pidNum = parseInt(pidStr, 10);
            if (!isNaN(pidNum)) {
              resolve(pidNum);
              return;
            }
          }
        }
      }
      resolve(null);
    });
    
    netstat.on("error", (error) => {
      logger.error(`[PortUtils] Error running netstat:`, error);
      resolve(null);
    });
  });
  
  if (!pid) {
    return null;
  }
  
  const processDetails = await new Promise<{ name: string; command: string } | null>((resolve) => {
    const tasklist = spawn("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"]);
    
    let output = "";
    tasklist.stdout?.on("data", (data: Buffer) => {
      output += data.toString();
    });
    
    tasklist.on("exit", (code) => {
      if (code === 0 && output.trim()) {
        const parts = output.trim().split(",");
        if (parts.length > 0) {
          const name = parts[0].replace(/"/g, "");
          resolve({ name, command: name });
        } else {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
    
    tasklist.on("error", (error) => {
      logger.error(`[PortUtils] Error running tasklist:`, error);
      resolve(null);
    });
  });
  
  if (!processDetails) {
    return {
      pid,
      port,
      processName: "unknown",
      commandLine: "unknown",
    };
  }
  
  return {
    pid,
    port,
    processName: processDetails.name,
    commandLine: processDetails.command,
  };
}

export async function killProcess(pid: number): Promise<void> {
  const platform = process.platform;
  
  logger.info(`[PortUtils] Attempting to kill process ${pid}`);
  
  return new Promise((resolve, reject) => {
    let killCmd: string;
    let killArgs: string[];
    
    if (platform === "win32") {
      killCmd = "taskkill";
      killArgs = ["/PID", pid.toString(), "/F"];
    } else {
      killCmd = "kill";
      killArgs = ["-9", pid.toString()];
    }
    
    const killProc = spawn(killCmd, killArgs);
    
    let stderr = "";
    killProc.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });
    
    killProc.on("exit", (code) => {
      if (code === 0) {
        logger.info(`[PortUtils] Successfully killed process ${pid}`);
        resolve();
      } else {
        const error = `Failed to kill process ${pid}: ${stderr || "Unknown error"}`;
        logger.error(`[PortUtils] ${error}`);
        reject(new Error(error));
      }
    });
    
    killProc.on("error", (error) => {
      logger.error(`[PortUtils] Error spawning kill command:`, error);
      reject(error);
    });
  });
}
