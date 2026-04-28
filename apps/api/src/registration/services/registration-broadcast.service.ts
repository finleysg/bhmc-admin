import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common"
import { Subject, Observable, Subscription, interval, asyncScheduler, from, EMPTY } from "rxjs"
import { catchError, throttleTime, share, startWith, switchMap, finalize } from "rxjs/operators"
import { ClubEvent, RegistrationSlotWithPlayerAndWave } from "@repo/domain/types"

import { EventsService } from "../../events"
import { RegistrationDataService } from "./registration-data.service"
import { getCurrentWave } from "../wave-calculator"

export interface RegistrationUpdateEvent {
	eventId: number
	slots: RegistrationSlotWithPlayerAndWave[]
	currentWave: number
	timestamp: string
	version: number
}

interface EventStreamState {
	trigger$: Subject<void>
	stream$: Observable<RegistrationUpdateEvent>
	waveTimerSub?: Subscription
	cleanupTimeout?: ReturnType<typeof setTimeout>
	subscriberCount: number
	lastWave: number
	cachedEvent?: ClubEvent
	version: number
}

const THROTTLE_MS = 500
const WAVE_CHECK_INTERVAL_MS = 5000
const IDLE_CLEANUP_MS = 5 * 60 * 1000

@Injectable()
export class RegistrationBroadcastService implements OnModuleDestroy {
	private readonly logger = new Logger(RegistrationBroadcastService.name)
	private readonly eventStreams = new Map<number, EventStreamState>()

	constructor(
		@Inject(RegistrationDataService) private readonly dataService: RegistrationDataService,
		@Inject(EventsService) private readonly events: EventsService,
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

		// Cancel pending cleanup if a new subscriber joins
		if (state.cleanupTimeout) {
			clearTimeout(state.cleanupTimeout)
			state.cleanupTimeout = undefined
		}

		state.subscriberCount++

		// Start wave timer when first subscriber joins
		if (state.subscriberCount === 1 && !state.waveTimerSub) {
			state.waveTimerSub = this.startWaveTimer(eventId, state)
		}

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
			version: 0,
		}

		// leading: false / trailing: true so each emission reflects the post-commit
		// snapshot. A leading-edge emission can fire after one of several near-simultaneous
		// commits (e.g. cleanup-then-reserve) and capture an intermediate "AVAILABLE" state
		// that observers see as a flicker before the trailing edge corrects it.
		state.stream$ = trigger$.pipe(
			startWith(undefined),
			throttleTime(THROTTLE_MS, asyncScheduler, { leading: false, trailing: true }),
			switchMap(() =>
				from(this.buildUpdateEvent(eventId, state)).pipe(
					catchError((error: unknown) => {
						this.logger.error(`Failed to build update event for ${eventId}`, error)
						// Skip this emission rather than ending the stream or shipping stale
						// data labeled as fresh. The next notify or wave timer tick will
						// retry; clients retain their last cached snapshot in the meantime.
						return EMPTY
					}),
				),
			),
			share(),
		)

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
		state.lastWave = currentWave
		state.version += 1

		return {
			eventId,
			slots,
			currentWave,
			timestamp: new Date().toISOString(),
			version: state.version,
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

		const currentWave = getCurrentWave(state.cachedEvent)
		if (currentWave !== state.lastWave) {
			state.lastWave = currentWave
			this.logger.debug(`Wave changed to ${currentWave} for event ${eventId}`)
			state.trigger$.next()
		}
	}

	private onUnsubscribe(eventId: number): void {
		const state = this.eventStreams.get(eventId)
		if (!state) return

		state.subscriberCount--
		if (state.subscriberCount < 0) {
			this.logger.warn(
				`Subscriber count went negative for event ${eventId} — possible double-unsubscribe`,
			)
		}
		this.logger.debug(`Subscriber removed for event ${eventId}, count: ${state.subscriberCount}`)

		if (state.subscriberCount <= 0) {
			// Stop wave timer when no subscribers remain
			state.waveTimerSub?.unsubscribe()
			state.waveTimerSub = undefined

			// Schedule cleanup, replacing any existing timeout
			if (state.cleanupTimeout) {
				clearTimeout(state.cleanupTimeout)
			}
			state.cleanupTimeout = setTimeout(() => {
				const current = this.eventStreams.get(eventId)
				if (current && current.subscriberCount <= 0) {
					this.cleanupStream(eventId, current)
				}
			}, IDLE_CLEANUP_MS)
		}
	}

	private cleanupStream(eventId: number, state: EventStreamState): void {
		state.waveTimerSub?.unsubscribe()
		if (state.cleanupTimeout) {
			clearTimeout(state.cleanupTimeout)
		}
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
