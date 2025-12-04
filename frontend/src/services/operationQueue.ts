import { nanoid } from 'nanoid';
import { PendingOperation, ConflictError } from '@sync/shared';

const STORAGE_KEY = 'sync-pending-operations';
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY_MS = 2000;

type OperationType = 'create' | 'update' | 'delete' | 'reorder';

interface QueuedOperation extends PendingOperation {
  resolve?: (value: boolean) => void;
  reject?: (reason: unknown) => void;
}

class OperationQueue {
  private queue: QueuedOperation[] = [];
  private processing = false;
  private isOnline = true;
  private pendingAcks = new Map<string, QueuedOperation>();

  // Callbacks
  public onOperationExecute:
    | ((op: PendingOperation) => Promise<void>)
    | null = null;
  public onConflict:
    | ((conflict: ConflictError, op: PendingOperation) => void)
    | null = null;
  public onQueueChange: ((queue: PendingOperation[]) => void) | null = null;

  constructor() {
    // Load pending operations from localStorage
    this.loadFromStorage();

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
      this.isOnline = navigator.onLine;
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        this.notifyQueueChange();
      }
    } catch (error) {
      console.error('Failed to load operation queue from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      // Only save essential fields (not callbacks)
      const toSave = this.queue.map(
        ({ resolve, reject, ...rest }) => rest
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
      console.error('Failed to save operation queue to storage:', error);
    }
  }

  private notifyQueueChange(): void {
    this.onQueueChange?.(this.queue);
  }

  private handleOnline(): void {
    console.log('📶 Back online - processing queue');
    this.isOnline = true;
    this.processQueue();
  }

  private handleOffline(): void {
    console.log('📴 Went offline');
    this.isOnline = false;
  }

  public setOnline(online: boolean): void {
    const wasOffline = !this.isOnline;
    this.isOnline = online;
    if (wasOffline && online) {
      this.processQueue();
    }
  }

  public enqueue(
    type: OperationType,
    listId: string,
    payload: unknown,
    todoId?: string,
    version?: number
  ): string {
    const operation: QueuedOperation = {
      id: nanoid(),
      type,
      listId,
      payload,
      todoId,
      version,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(operation);
    this.saveToStorage();
    this.notifyQueueChange();

    // Try to process immediately if online
    if (this.isOnline && !this.processing) {
      this.processQueue();
    }

    return operation.id;
  }

  public acknowledgeOperation(operationId: string, success: boolean): void {
    const pendingOp = this.pendingAcks.get(operationId);
    if (pendingOp) {
      this.pendingAcks.delete(operationId);

      if (success) {
        // Remove from queue
        this.queue = this.queue.filter((op) => op.id !== operationId);
        this.saveToStorage();
        this.notifyQueueChange();
        pendingOp.resolve?.(true);
      } else {
        // Will be retried
        pendingOp.reject?.(new Error('Operation failed'));
      }
    }
  }

  public handleConflict(conflict: ConflictError): void {
    // Find the operation that caused the conflict
    const operation = this.queue.find((op) => op.todoId === conflict.todoId);
    if (operation) {
      // Remove the conflicting operation
      this.queue = this.queue.filter((op) => op.id !== operation.id);
      this.saveToStorage();
      this.notifyQueueChange();

      // Notify about the conflict
      this.onConflict?.(conflict, operation);
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.isOnline) {
      const operation = this.queue[0];

      try {
        // Track pending ack
        this.pendingAcks.set(operation.id, operation);

        // Execute the operation
        if (this.onOperationExecute) {
          await this.onOperationExecute(operation);
        }

        // Wait for acknowledgment with timeout
        const acknowledged = await this.waitForAck(operation.id, 10000);

        if (!acknowledged) {
          // Timeout or failure - retry logic
          operation.retryCount++;

          if (operation.retryCount >= MAX_RETRY_COUNT) {
            console.error(`Operation ${operation.id} failed after ${MAX_RETRY_COUNT} retries`);
            // Remove from queue after max retries
            this.queue = this.queue.filter((op) => op.id !== operation.id);
            this.saveToStorage();
            this.notifyQueueChange();
          } else {
            // Wait before retry
            await this.delay(RETRY_DELAY_MS * operation.retryCount);
          }
        }
      } catch (error) {
        console.error('Error processing operation:', error);
        operation.retryCount++;

        if (operation.retryCount >= MAX_RETRY_COUNT) {
          this.queue = this.queue.filter((op) => op.id !== operation.id);
          this.saveToStorage();
          this.notifyQueueChange();
        } else {
          await this.delay(RETRY_DELAY_MS);
        }
      }
    }

    this.processing = false;
  }

  private waitForAck(operationId: string, timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingAcks.delete(operationId);
        resolve(false);
      }, timeoutMs);

      const existingOp = this.pendingAcks.get(operationId);
      if (existingOp) {
        existingOp.resolve = (success: boolean) => {
          clearTimeout(timeout);
          resolve(success);
        };
      }
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public getQueue(): PendingOperation[] {
    return [...this.queue];
  }

  public getQueueSize(): number {
    return this.queue.length;
  }

  public clearQueue(): void {
    this.queue = [];
    this.saveToStorage();
    this.notifyQueueChange();
  }

  public retryFailed(): void {
    // Reset retry counts and process again
    this.queue.forEach((op) => {
      op.retryCount = 0;
    });
    this.saveToStorage();
    this.processQueue();
  }
}

// Export singleton instance
export const operationQueue = new OperationQueue();
