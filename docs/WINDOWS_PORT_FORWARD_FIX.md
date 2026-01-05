# Windows Port Forward Fix

## Problem

On Windows, when stopping and restarting port-forwards, Porter would fail to start them with the error:

```
Unable to listen on port XXXX: Listeners failed to create with the following errors: 
[unable to create listener: Error listen tcp4 127.0.0.1:XXXX: bind: Only one usage of each socket address 
(protocol/network address/port) is normally permitted.]
```

This happened because the `kubectl` process wasn't being properly terminated on Windows, leaving the port still bound.

## Root Cause

1. **SIGTERM doesn't work properly on Windows**: The original code used `process.kill("SIGTERM")` which doesn't reliably terminate processes on Windows.
2. **No port release verification**: There was no check to ensure the port was actually released before attempting to start a new port-forward.
3. **Race conditions**: The stop/start cycle could happen too quickly for the OS to release the port.

## Solution

### 1. Windows-Specific Process Termination

Updated `killProcess()` method to use Windows `taskkill` command with `/F` (force) and `/T` (terminate child processes) flags:

```typescript
private killProcess() {
  if (this.process && !this.process.killed) {
    const pid = this.process.pid;
    
    if (process.platform === "win32" && pid) {
      try {
        spawn("taskkill", ["/pid", pid.toString(), "/T", "/F"], {
          stdio: "ignore",
        });
        logger.info(`[PortForward] Forcefully killed kubectl process ${pid} on Windows`);
      } catch (error) {
        logger.error(`[PortForward] Failed to kill process ${pid} on Windows:`, error);
        this.process.kill("SIGKILL");
      }
    } else {
      // For Unix-like systems, use SIGTERM with fallback to SIGKILL
      this.process.kill("SIGTERM");
      
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          logger.warn(`[PortForward] Process ${pid} did not terminate, sending SIGKILL`);
          this.process.kill("SIGKILL");
        }
      }, 1000);
    }
    
    this.process = null;
  }
}
```

### 2. Port Availability Checking

Added two helper methods to check if a port is available before starting a port-forward:

- `checkPortAvailability()`: Attempts to bind to the port to verify it's free
- `waitForPortRelease()`: Retries port availability check up to 10 times with 500ms delays

### 3. Port Release Wait on Windows

Updated `stop()` method to add a 500ms delay on Windows to allow the OS to release the port:

```typescript
async stop() {
  this.state = PortForwardState.STOPPED;
  this.clearConnectionTimeout();
  this.clearReconnectTimeout();

  if (this.healthCheckInterval) {
    clearInterval(this.healthCheckInterval);
    this.healthCheckInterval = null;
  }

  this.killProcess();
  
  if (process.platform === "win32") {
    await new Promise(resolve => setTimeout(resolve, 500));
    logger.info(`[PortForward] Waiting for port to be released on Windows`);
  }
  
  this.emit("status-change", this.getStatus());
}
```

### 4. Graceful App Shutdown

Added a `before-quit` handler in `main.ts` to properly stop all port-forwards when the app is closing:

```typescript
let isQuitting = false;

app.on("before-quit", async (event) => {
  if (!isQuitting) {
    event.preventDefault();
    isQuitting = true;
    logger.info("App is quitting, stopping all port forwards...");
    try {
      await portForwardManager.stopAll();
      logger.info("All port forwards stopped");
    } catch (error) {
      logger.error("Error stopping port forwards:", error);
    }
    app.quit();
  }
});
```

## Changes Made

### Modified Files

1. **electron/k8s/portforward.ts**
   - Made `stop()` method async
   - Updated `killProcess()` to use `taskkill` on Windows
   - Added `checkPortAvailability()` method
   - Added `waitForPortRelease()` method
   - Updated `start()` to check port availability before spawning process
   - Made `stopPortForward()` and `stopAll()` async in PortForwardManager

2. **electron/main.ts**
   - Added `before-quit` handler to properly cleanup port-forwards on app close

3. **electron/k8s/__tests__/portforward.test.ts**
   - Updated tests to handle async `stop()` method
   - Updated tests to handle async `stopPortForward()` and `stopAll()` methods

4. **electron/k8s/__tests__/handlers.test.ts**
   - Updated mock to return Promise for `stopPortForward()`

### API Changes

The following methods are now async and return Promises:

- `PortForwardInstance.stop()` → `async stop()`
- `PortForwardManager.stopPortForward(id)` → `async stopPortForward(id)`
- `PortForwardManager.stopAll()` → `async stopAll()`

## Testing

To test the fix on Windows:

1. Start a port-forward
2. Stop the port-forward
3. Immediately start the same port-forward again
4. Verify it starts successfully without "address already in use" errors

## Additional Benefits

- More reliable process termination on all platforms
- Better error handling and logging
- Graceful shutdown when closing the app
- Prevention of orphaned kubectl processes

