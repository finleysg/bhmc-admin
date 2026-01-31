import { Observable, Subject } from "rxjs"

import { Injectable, Logger } from "@nestjs/common"
import { BulkRefundProgressEvent, BulkRefundResponse } from "@repo/domain/types"

const PROGRESS_CLEANUP_MS = 5 * 60 * 1000 // 5 minutes

@Injectable()
export class BulkRefundProgressTracker {
	private readonly logger = new Logger(BulkRefundProgressTracker.name)

	private readonly activeOperations = new Map<number, Subject<BulkRefundProgressEvent>>()

	/**
	 * Start tracking a new bulk refund operation and return the progress subject
	 */
	startTracking(eventId: number): Subject<BulkRefundProgressEvent> {
		if (this.activeOperations.has(eventId)) {
			throw new Error(`Bulk refund operation already in progress for event ${eventId}`)
		}

		const subject = new Subject<BulkRefundProgressEvent>()
		this.activeOperations.set(eventId, subject)

		// Auto-cleanup after timeout
		setTimeout(() => {
			this.cleanupOperation(eventId)
		}, PROGRESS_CLEANUP_MS)

		return subject
	}

	/**
	 * Get the progress observable for an active operation
	 */
	getProgressObservable(eventId: number): Observable<BulkRefundProgressEvent> | null {
		return this.activeOperations.get(eventId)?.asObservable() ?? null
	}

	/**
	 * Emit progress update for a payment being processed
	 */
	emitProgress(eventId: number, current: number, total: number, playerName: string): void {
		const subject = this.activeOperations.get(eventId)
		if (subject) {
			subject.next({
				status: "processing",
				current,
				total,
				playerName,
			})
		}
	}

	/**
	 * Mark operation as complete with final results
	 */
	completeOperation(eventId: number, result: BulkRefundResponse): void {
		const subject = this.activeOperations.get(eventId)
		if (subject) {
			subject.next({
				status: "complete",
				current: result.refundedCount + result.failedCount,
				total: result.refundedCount + result.failedCount + result.skippedCount,
				result,
			})
		}

		// Cleanup after short delay to allow final event to be sent
		setTimeout(() => {
			this.cleanupOperation(eventId)
		}, 1000)
	}

	/**
	 * Mark operation as failed with error
	 */
	errorOperation(eventId: number, error: string): void {
		const subject = this.activeOperations.get(eventId)
		if (subject) {
			subject.next({
				status: "error",
				current: 0,
				total: 0,
				error,
			})
		}

		// Cleanup after short delay
		setTimeout(() => {
			this.cleanupOperation(eventId)
		}, 1000)
	}

	/**
	 * Check if an operation is currently active
	 */
	isOperationActive(eventId: number): boolean {
		return this.activeOperations.has(eventId)
	}

	/**
	 * Clean up resources for an operation
	 */
	private cleanupOperation(eventId: number): void {
		const subject = this.activeOperations.get(eventId)
		if (subject) {
			subject.complete()
			this.activeOperations.delete(eventId)
			this.logger.debug(`Cleaned up bulk refund operation for event ${eventId}`)
		}
	}

	/**
	 * Force cleanup of all operations (for testing/shutdown)
	 */
	cleanupAll(): void {
		for (const eventId of this.activeOperations.keys()) {
			this.cleanupOperation(eventId)
		}
	}
}
