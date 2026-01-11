# Port Kill Feature Implementation

## Overview

Added functionality to detect when a port is occupied by another process, show the user detailed information about that process, and allow them to kill it directly from the application.

## Implementation Details

### 1. Backend - Port Detection and Process Management

**Created `electron/k8s/port-utils.ts`**
- `getProcessUsingPort(port: number)`: Platform-specific logic to identify the process using a port
  - macOS/Linux: Uses `lsof` and `ps` commands
  - Windows: Uses `netstat` and `tasklist` commands
- `killProcess(pid: number)`: Kills a process by PID
  - macOS/Linux: Uses `kill -9`
  - Windows: Uses `taskkill /F`

### 2. Port Forward Flow Integration

**Updated `electron/k8s/portforward.ts`**
- Modified `PortForwardInstance.start()` to detect occupied ports
- When port is occupied, calls `getProcessUsingPort()` to get process details
- Emits `port-occupied` event with process information
- Waits for user decision (60 second timeout)
- If user confirms kill: executes `killProcess()`, waits 500ms, retries port check
- If user cancels: throws error and aborts port forward
- Added `respondToPortOccupied()` method to handle user response
- Updated `PortForwardManager` to forward port-occupied events

### 3. IPC Communication

**Updated `electron/k8s/handlers.ts`**
- Added `get-port-process` handler: Returns process info for a given port
- Added `kill-port-process` handler: Kills process and returns success/failure
- Added `respond-port-occupied` handler: Receives user decision from dialog
- Forward `port-occupied` events from manager to frontend

### 4. Frontend - Type Definitions

**Updated `src/types/electron.ts`**
- Added `ProcessInfo` interface with fields: pid, port, processName, commandLine, forwardId
- Extended `ElectronAPI` interface with new methods:
  - `getPortProcess(port: number)`
  - `killPortProcess(port: number)`
  - `onPortOccupied(callback)`
  - `removePortOccupiedListener()`
  - `respondPortOccupied(forwardId, shouldKill)`

### 5. Frontend - Preload Bridge

**Updated `electron/preload.ts`**
- Exposed all new IPC methods to the renderer process
- Added event listeners for `port-occupied` events

### 6. Frontend - User Interface

**Created `src/components/PortOccupiedDialog.tsx`**
- Modal dialog with backdrop overlay
- Displays process information: port, PID, process name, command line
- Shows warning about potential data loss
- Two action buttons:
  - "Kill Process & Retry" (red, destructive action)
  - "Cancel" (default action)
- Closes on Escape key or backdrop click
- Styled with Tailwind CSS matching existing UI patterns

**Updated `src/App.tsx`**
- Added state management for `portOccupiedInfo`
- Listens for `port-occupied` events on mount
- Renders `PortOccupiedDialog` when process info is received
- Handles kill/cancel actions with error handling

### 7. Testing

**Created `electron/k8s/__tests__/port-utils.test.ts`**
- Tests for Unix/macOS platform:
  - Process detection success
  - Port not occupied
  - Error handling
  - Unknown process fallback
  - Process killing (success/failure)
- Tests for Windows platform:
  - Process detection
  - Process killing

**Created `src/components/__tests__/PortOccupiedDialog.test.tsx`**
- Renders with process information
- Shows warning message
- Kill button triggers callback
- Cancel button triggers callback
- Backdrop click triggers cancel
- Escape key triggers cancel
- Cleanup on unmount

**Updated `src/__tests__/mocks/electronAPI.ts`**
- Added mocks for new API methods

## User Flow

1. User attempts to start port forward on occupied port
2. System detects port is occupied
3. System identifies the process using the port
4. Dialog appears showing:
   - Port number
   - Process ID (PID)
   - Process name
   - Full command line
   - Warning about killing the process
5. User chooses:
   - **Kill Process & Retry**: Process is killed, port forward retries
   - **Cancel**: Port forward is aborted

## Security Considerations

- Process information shown to user before killing
- All kill operations are logged
- OS enforces user permission (can only kill own processes)
- Uses force kill (SIGKILL/-9) to ensure termination
- 60-second timeout for user decision to prevent hanging

## Error Handling

- Falls back to original behavior if process detection fails
- Shows error toast if kill operation fails
- Shows error if port still occupied after kill
- Timeout after 5 seconds for process info retrieval (in port-utils)
- Timeout after 60 seconds for user decision (in port forward instance)

## Platform Support

- ✅ macOS: Uses `lsof` and `ps`
- ✅ Linux: Uses `lsof` and `ps`
- ✅ Windows: Uses `netstat` and `tasklist`

## Test Coverage

- ✅ All 238 tests passing
- ✅ New tests for port-utils (Unix/macOS and Windows)
- ✅ New tests for PortOccupiedDialog component
- ✅ Updated mock electronAPI for compatibility
