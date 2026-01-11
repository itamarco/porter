import { getProcessUsingPort, killProcess } from "../port-utils";
import { spawn } from "child_process";

jest.mock("child_process");

describe("port-utils", () => {
  let mockProcess: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockProcess = {
      stdout: {
        on: jest.fn(),
      },
      stderr: {
        on: jest.fn(),
      },
      on: jest.fn(),
    };

    (spawn as jest.Mock).mockReturnValue(mockProcess);
  });

  describe("getProcessUsingPort", () => {
    describe("Unix/macOS", () => {
      beforeEach(() => {
        Object.defineProperty(process, "platform", {
          value: "darwin",
          writable: true,
        });
      });

      it("should return process info when port is occupied", async () => {
        const lsofProcess = {
          stdout: {
            on: jest.fn((event, callback) => {
              if (event === "data") {
                callback(Buffer.from("12345\n"));
              }
            }),
          },
          on: jest.fn((event, callback) => {
            if (event === "exit") {
              callback(0);
            }
          }),
        };

        const psProcess = {
          stdout: {
            on: jest.fn((event, callback) => {
              if (event === "data") {
                callback(Buffer.from("node /usr/bin/kubectl port-forward\n"));
              }
            }),
          },
          on: jest.fn((event, callback) => {
            if (event === "exit") {
              callback(0);
            }
          }),
        };

        (spawn as jest.Mock)
          .mockReturnValueOnce(lsofProcess)
          .mockReturnValueOnce(psProcess);

        const result = await getProcessUsingPort(8080);

        expect(result).toEqual({
          pid: 12345,
          port: 8080,
          processName: "node",
          commandLine: "/usr/bin/kubectl port-forward",
        });
        expect(spawn).toHaveBeenCalledWith("lsof", ["-ti", ":8080"]);
        expect(spawn).toHaveBeenCalledWith("ps", ["-p", "12345", "-o", "comm=,args="]);
      });

      it("should return null when port is not occupied", async () => {
        const lsofProcess = {
          stdout: {
            on: jest.fn(),
          },
          on: jest.fn((event, callback) => {
            if (event === "exit") {
              callback(1);
            }
          }),
        };

        (spawn as jest.Mock).mockReturnValueOnce(lsofProcess);

        const result = await getProcessUsingPort(8080);

        expect(result).toBeNull();
      });

      it("should handle lsof errors gracefully", async () => {
        const lsofProcess = {
          stdout: {
            on: jest.fn(),
          },
          on: jest.fn((event, callback) => {
            if (event === "error") {
              callback(new Error("Command not found"));
            }
          }),
        };

        (spawn as jest.Mock).mockReturnValueOnce(lsofProcess);

        const result = await getProcessUsingPort(8080);

        expect(result).toBeNull();
      });

      it("should return unknown when ps fails", async () => {
        const lsofProcess = {
          stdout: {
            on: jest.fn((event, callback) => {
              if (event === "data") {
                callback(Buffer.from("12345\n"));
              }
            }),
          },
          on: jest.fn((event, callback) => {
            if (event === "exit") {
              callback(0);
            }
          }),
        };

        const psProcess = {
          stdout: {
            on: jest.fn(),
          },
          on: jest.fn((event, callback) => {
            if (event === "exit") {
              callback(1);
            }
          }),
        };

        (spawn as jest.Mock)
          .mockReturnValueOnce(lsofProcess)
          .mockReturnValueOnce(psProcess);

        const result = await getProcessUsingPort(8080);

        expect(result).toEqual({
          pid: 12345,
          port: 8080,
          processName: "unknown",
          commandLine: "unknown",
        });
      });
    });

    describe("Windows", () => {
      beforeEach(() => {
        Object.defineProperty(process, "platform", {
          value: "win32",
          writable: true,
        });
      });

      it("should return process info when port is occupied", async () => {
        const netstatProcess = {
          stdout: {
            on: jest.fn((event, callback) => {
              if (event === "data") {
                callback(Buffer.from("  TCP    0.0.0.0:8080    0.0.0.0:0    LISTENING    12345\n"));
              }
            }),
          },
          on: jest.fn((event, callback) => {
            if (event === "exit") {
              callback(0);
            }
          }),
        };

        const tasklistProcess = {
          stdout: {
            on: jest.fn((event, callback) => {
              if (event === "data") {
                callback(Buffer.from('"node.exe","12345","Console","1","123,456 K"\n'));
              }
            }),
          },
          on: jest.fn((event, callback) => {
            if (event === "exit") {
              callback(0);
            }
          }),
        };

        (spawn as jest.Mock)
          .mockReturnValueOnce(netstatProcess)
          .mockReturnValueOnce(tasklistProcess);

        const result = await getProcessUsingPort(8080);

        expect(result).toEqual({
          pid: 12345,
          port: 8080,
          processName: "node.exe",
          commandLine: "node.exe",
        });
      });

      it("should return null when port is not occupied", async () => {
        const netstatProcess = {
          stdout: {
            on: jest.fn((event, callback) => {
              if (event === "data") {
                callback(Buffer.from("  TCP    0.0.0.0:9090    0.0.0.0:0    LISTENING    99999\n"));
              }
            }),
          },
          on: jest.fn((event, callback) => {
            if (event === "exit") {
              callback(0);
            }
          }),
        };

        (spawn as jest.Mock).mockReturnValueOnce(netstatProcess);

        const result = await getProcessUsingPort(8080);

        expect(result).toBeNull();
      });
    });
  });

  describe("killProcess", () => {
    describe("Unix/macOS", () => {
      beforeEach(() => {
        Object.defineProperty(process, "platform", {
          value: "darwin",
          writable: true,
        });
      });

      it("should successfully kill a process", async () => {
        const killProc = {
          stderr: {
            on: jest.fn(),
          },
          on: jest.fn((event, callback) => {
            if (event === "exit") {
              callback(0);
            }
          }),
        };

        (spawn as jest.Mock).mockReturnValueOnce(killProc);

        await expect(killProcess(12345)).resolves.toBeUndefined();
        expect(spawn).toHaveBeenCalledWith("kill", ["-9", "12345"]);
      });

      it("should throw error when kill fails", async () => {
        const killProc = {
          stderr: {
            on: jest.fn((event, callback) => {
              if (event === "data") {
                callback(Buffer.from("No such process\n"));
              }
            }),
          },
          on: jest.fn((event, callback) => {
            if (event === "exit") {
              callback(1);
            }
          }),
        };

        (spawn as jest.Mock).mockReturnValueOnce(killProc);

        await expect(killProcess(12345)).rejects.toThrow("Failed to kill process");
      });

      it("should handle spawn errors", async () => {
        const killProc = {
          stderr: {
            on: jest.fn(),
          },
          on: jest.fn((event, callback) => {
            if (event === "error") {
              callback(new Error("Command not found"));
            }
          }),
        };

        (spawn as jest.Mock).mockReturnValueOnce(killProc);

        await expect(killProcess(12345)).rejects.toThrow("Command not found");
      });
    });

    describe("Windows", () => {
      beforeEach(() => {
        Object.defineProperty(process, "platform", {
          value: "win32",
          writable: true,
        });
      });

      it("should successfully kill a process", async () => {
        const killProc = {
          stderr: {
            on: jest.fn(),
          },
          on: jest.fn((event, callback) => {
            if (event === "exit") {
              callback(0);
            }
          }),
        };

        (spawn as jest.Mock).mockReturnValueOnce(killProc);

        await expect(killProcess(12345)).resolves.toBeUndefined();
        expect(spawn).toHaveBeenCalledWith("taskkill", ["/PID", "12345", "/F"]);
      });
    });
  });
});
