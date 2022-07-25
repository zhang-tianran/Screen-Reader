import { ReaderModality } from "./readermodality.js";

/**
 * We view the various screen reader modes not as just a single mode,
 * but rather a stack of modes that can be pushed and popped. This way of
 * thinking is useful for maintaining continuity; for example, the user can
 * start with NORMAL mode, then enter TABLE mode, then PAUSE, then pop back
 * out to TABLE mode, and then when done reading the table finally pop back
 * out to NORMAL mode.
 * 
 * The ModalityStack can never be empty; we always have a current mode.
 */
export class ModalityStack {

	// The internal stack, implemented as an array. This array should
	// never be empty or null
	private readonly stack: ReaderModality[]

	/**
	 * Construct a new instance of ModalityStack. We populate the stack by default
	 * two states, the base state is NORMAL, and then on top of that is PAUSED.
	 * In this way, the screen reader starts in PAUSED mode, but then the user
	 * can pop back up to NORMAL mode to begin reading.
	 */
	constructor() {
		this.stack = [ReaderModality.NORMAL, ReaderModality.PAUSED];
	}

	/**
	 * Attempts to pop back to the previous mode. Does nothing if there is only
	 * one mode left on the stack.
	 *
	 * @returns The mode that was just popped off of the stack; if the stack only
	 * had one element, just return that element without popping it off of the
	 * stack.
	 */
	popMode(): ReaderModality {
		if (this.stack.length === 1) return this.stack[0];
		else return this.stack.pop()!;
	}

	/**
	 * Add a new mode to the top of the stack, effectively "setting the current
	 * mode". This preserves all modes previously added.
	 * @param mode the new mode to be added to the stack.
	 */
	pushMode(mode: ReaderModality): void {
		this.stack.push(mode);
	}

	/**
	 * Peek at the current mode, but do not remove it (as popMode does).
	 * @returns The current mode.
	 */
	mode(): ReaderModality {
		return this.stack[this.stack.length - 1];
	}
}
