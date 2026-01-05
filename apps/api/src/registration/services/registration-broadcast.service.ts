import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common"
import { Subject, Observable, Subscription, interval } from "rxjs"
import { debounceTime, share, startWith, switchMap, finalize } from "rxjs/operators"
import { ClubEvent, RegistrationSlotWithPlayerAndWave } from "@repo/domain/types"

import { EventsService } from "../../events"
import { RegistrationDataService } from "./registration-data.service"
import { getRegistrationWindow, getCurrentWave } from "../wave-calculator"

export interface RegistrationUpdateEvent {
	eventId: number
	slots: RegistrationSlotWithPlayerAndWave[]
	currentWave: number
	timestamp: string
}

interface EventStreamState {
	trigger$: Subject<void>
	stream$: Observable<RegistrationUpdateEvent>
	waveTimerSub?: Subscription
	subscriberCount: number
	lastWave: number
	cachedEvent?: ClubEvent
}

const DEBOUNCE_MS = 2000
const WAVE_CHECK_INTERVAL_MS = 30000
const IDLE_CLEANUP_MS = 5 * 60 * 1000

@Injectable()
export class RegistrationBroadcastService implements OnModuleDestroy {
	private readonly logger = new Logger(RegistrationBroadcastService.name)
	private readonly eventStreams = new Map<number, EventStreamState>()

	constructor(
		private readonly dataService: RegistrationDataService,
		private readonly events: EventsService,
	) {}

	/**
	 * Notify that an event's registration state has changed.
	 * Called by registration services after any slot mutation.
	 */
	notifyChange(eventId: number): void {
		const state = this.eventStreams.get(eventId)
		if (state) {
			state.trigger$.next()
		}
	}

	/**
	 * Subscribe to live updates for an event.
	 * Returns observable that emits debounced updates.
	 */
	subscribe(eventId: number): Observable<RegistrationUpdateEvent> {
		let state = this.eventStreams.get(eventId)

		if (!state) {
			state = this.createEventStream(eventId)
			this.eventStreams.set(eventId, state)
			this.logger.log(`Created stream for event ${eventId}`)
		}

		state.subscriberCount++
		this.logger.debug(`Subscriber added for event ${eventId}, count: ${state.subscriberCount}`)

		return state.stream$.pipe(finalize(() => this.onUnsubscribe(eventId)))
	}

	private createEventStream(eventId: number): EventStreamState {
		const trigger$ = new Subject<void>()

		const state: EventStreamState = {
			trigger$,
			stream$: null!, // Set after state is created
			subscriberCount: 0,
			lastWave: 0,
		}

		state.stream$ = trigger$.pipe(
			startWith(undefined),
			debounceTime(DEBOUNCE_MS),
			switchMap(() => this.buildUpdateEvent(eventId, state)),
			share(),
		)

		// Start wave timer for priority window detection
		state.waveTimerSub = this.startWaveTimer(eventId, state)

		return state
	}

	private async buildUpdateEvent(
		eventId: number,
		state: EventStreamState,
	): Promise<RegistrationUpdateEvent> {
		if (!state.cachedEvent) {
			state.cachedEvent = await this.events.getEventById(eventId)
		}
		const slots = await this.dataService.getSlotsWithWaveInfo(eventId, state.cachedEvent)
		const currentWave = getCurrentWave(state.cachedEvent)

		return {
			eventId,
			slots,
			currentWave,
			timestamp: new Date().toISOString(),
		}
	}

	/**
	 * Timer that checks for wave changes during priority signup.
	 * Triggers an update when the current wave changes.
	 */
	private startWaveTimer(eventId: number, state: EventStreamState): Subscription {
		return interval(WAVE_CHECK_INTERVAL_MS).subscribe(() => {
			this.checkWaveChange(eventId, state)
		})
	}

	private checkWaveChange(eventId: number, state: EventStreamState): void {
		if (!state.cachedEvent) return

		const window = getRegistrationWindow(state.cachedEvent)

		if (window === "priority") {
			const currentWave = getCurrentWave(state.cachedEvent)
			if (currentWave !== state.lastWave) {
				state.lastWave = currentWave
				this.logger.debug(`Wave changed to ${currentWave} for event ${eventId}`)
				state.trigger$.next()
			}
		}
	}

	private onUnsubscribe(eventId: number): void {
		const state = this.eventStreams.get(eventId)
		if (!state) return

		state.subscriberCount--
		this.logger.debug(`Subscriber removed for event ${eventId}, count: ${state.subscriberCount}`)

		if (state.subscriberCount <= 0) {
			setTimeout(() => {
				const current = this.eventStreams.get(eventId)
				if (current && current.subscriberCount <= 0) {
					this.cleanupStream(eventId, current)
				}
			}, IDLE_CLEANUP_MS)
		}
	}

	private cleanupStream(eventId: number, state: EventStreamState): void {
		state.waveTimerSub?.unsubscribe()
		state.trigger$.complete()
		this.eventStreams.delete(eventId)
		this.logger.log(`Cleaned up stream for event ${eventId}`)
	}

	onModuleDestroy(): void {
		for (const [eventId, state] of this.eventStreams) {
			this.cleanupStream(eventId, state)
		}
		this.eventStreams.clear()
	}
}
