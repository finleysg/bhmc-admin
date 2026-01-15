import { useEffect, useRef, useState } from "react"

export type TransitionStage = "pending" | "entering" | "leaving"
export type TransitionAction = "enter" | "exit"

type AnimationRequest = {
	id?: number
}

function setAnimationFrameTimeout(callback: () => void, timeout: number = 0) {
	const start = window.performance.now()
	const request: AnimationRequest = {}

	function makeRequest() {
		// https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
		request.id = window.requestAnimationFrame((now) => {
			if (now - start > timeout) {
				callback()
			} else {
				makeRequest()
			}
		})
	}

	makeRequest()
	return request
}

function clearAnimationFrameTimeout(request: AnimationRequest) {
	if (request.id) cancelAnimationFrame(request.id)
}

export function useTransition(action: TransitionAction, timeout: number) {
	const [stage, setStage] = useState<TransitionStage>(action === "enter" ? "entering" : "pending")
	const timer = useRef<AnimationRequest>({})
	const [shouldMount, setShouldMount] = useState(action === "enter")

	useEffect(
		function handleStateChange() {
			clearAnimationFrameTimeout(timer.current)

			if (action === "enter") {
				setStage("pending")
				setShouldMount(true)
				timer.current = setAnimationFrameTimeout(() => {
					setStage("entering")
				})
			} else if (action === "exit") {
				setStage("leaving")
				timer.current = setAnimationFrameTimeout(() => {
					setShouldMount(false)
				}, timeout)
			}

			return () => {
				clearAnimationFrameTimeout(timer.current)
			}
		},
		[action, timeout],
	)

	return {
		stage,
		shouldMount,
	}
}
