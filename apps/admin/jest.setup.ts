import "@testing-library/jest-dom"

// jsdom has no ResizeObserver; Radix form controls with a `name` use it to size their hidden input.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
}
