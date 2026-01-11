import React, { useEffect } from 'react';
import { ProcessInfo } from '../types/electron';

interface PortOccupiedDialogProps {
  processInfo: ProcessInfo;
  onKill: () => void;
  onCancel: () => void;
}

export function PortOccupiedDialog({ processInfo, onKill, onCancel }: PortOccupiedDialogProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="skeuo-card max-w-md w-full mx-4 p-6 animate-fade-in">
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-lg font-bold text-gray-100 tracking-tight">
              Port {processInfo.port} is Already in Use
            </h3>
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <p className="text-sm text-gray-300 leading-relaxed">
            The port you're trying to use is occupied by another process. You can kill the process
            to free up the port, but this may interrupt other applications.
          </p>

          <div className="skeuo-input p-3 space-y-2 text-sm">
            <div className="flex">
              <span className="font-medium text-gray-400 w-28">Port:</span>
              <span className="text-gray-200">{processInfo.port}</span>
            </div>
            <div className="flex">
              <span className="font-medium text-gray-400 w-28">PID:</span>
              <span className="text-gray-200">{processInfo.pid}</span>
            </div>
            <div className="flex">
              <span className="font-medium text-gray-400 w-28">Process:</span>
              <span className="text-gray-200 font-mono text-xs break-all">
                {processInfo.processName}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-gray-400 mb-1">Command:</span>
              <span className="text-gray-300 font-mono text-xs break-all bg-[#252830] p-2 rounded">
                {processInfo.commandLine}
              </span>
            </div>
          </div>

          <div className="border border-yellow-600/30 rounded-xl p-3 bg-yellow-500/5">
            <p className="text-xs text-yellow-300">
              <strong className="font-semibold">Warning:</strong> Killing this process may cause data loss or unexpected
              behavior in the application using it.
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="skeuo-btn px-5 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onKill}
            className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Kill Process & Retry
          </button>
        </div>
      </div>
    </div>
  );
}
