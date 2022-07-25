import { ReaderModality } from "./readermodality.js";

/**
 * a set of key names and their associated description and callback for a
 * particular input mode.
 */
type Binds = {
	[key: string]: {
		description: string,
		callback: () => void
	}
}

/**
 * This class can be used to register keybinds for each of the different screen
 * reader modes, and to trigger corresponding callbacks based on the key pressed
 * and the current mode of the screen reader.
 * 
 * It also contains utilities for getting help for all of the controls and to
 * ensure key names are properly enunciated by the screen reader.
 */
export class Keybinds {

	// The internal map of keybinds for various modes. Stores the key names
	// themselves, a short description of what the keybind is supposed to do in
	// the current mode, and the callback to be triggered on keydown.
	readonly keybinds: Binds[]

	// construct a new instance of the Keybinds class, initializing keybinds array
	constructor() {
		this.keybinds = []

		// I believe typescript turns enums into a 2-way dict, so need to filter out
		// numeric keys only to serve as array indices
		Object.keys(ReaderModality).forEach((key) => {
			let asIdx = Number(key);
			if (!isNaN(asIdx)) this.keybinds[asIdx] = {};
		});
	}

	/**
	 * Register a new keybind for the given mode, along with a short description
	 * of what the key does and the callback that is triggered on keydown.
	 *
	 * @param forMode the mode for which this keybind should be listened for
	 * @param keyName the exact name of the key, i.e. KeyboardEvent.key
	 * @param description a short (1-5 word) description of what pressing the key
	 * does, to be read out to the user if requested and to be displayed in the
	 * on-screen controls
	 * @param callback the callback to be triggered when the key is pressed.
	 * @returns this keybind instance, for fluent-API-style chaining.
	 */
	registerKeybind(
		forMode: ReaderModality,
		keyName: string,
		description: string,
		callback: () => void): this {
			this.keybinds[forMode][keyName] = {
				description: description,
				callback: callback
			}
			return this;
	}

	/**
	 * Trigger a predefined action on keydown, if there is one. This method should
	 * be pretty much directly bound to document.addEventListener, with slight
	 * modification to pass in the current mode as well.
	 *
	 * @param mode the mode that the screenreader is currently in
	 * @param event the KeyboardEvent received from the event listener
	 */
	triggerEvent(mode: ReaderModality, event: KeyboardEvent): void {
		if (this.keybinds[mode][event.key]) {
			event.preventDefault();
			this.keybinds[mode][event.key].callback();
		}
	}

	/**
	 * Converts a key name into a string that SpeechSynthesis will more properly
	 * enunciate. For example, key names like "a" are interpreted by default by
	 * the synthesizer to be the article "a", whereas we want it to say the
	 * literal letter "A"; this function will convert that key name to "A.",
	 * which works better when read out. 
	 * 
	 * @param keyName The string name of the key event to enunciate
	 * @returns a properly-enunciated string if there is one; if not, just the
	 * key name itself
	 */
	static enunciateKey(keyName: string): string {
		return {
			"a": "A.",
			"ArrowRight": "the right arrow",
			"ArrowLeft": "the left arrow",
			"ArrowUp": "the up arrow",
			"ArrowDown": "the down arrow",
			" ": "space",
			"F1": "F 1"
		}[keyName] || keyName;
	}

	/**
	 * Returns a string that reads out all of the keybinds and their descriptions
	 * to the user based on the given mode.
	 *
	 * It is probably a good idea to bind this to a universal help key, e.g. F1,
	 * that the user can press in any mode to get guidance on what their available
	 * controls are.
	 *
	 * @param mode the current mode of the screen reader, e.g. NORMAL, TABLE, etc.
	 */
	getHelpString(mode: ReaderModality): string {
		let helpString = "";
		for (const [keyName, info] of Object.entries(this.keybinds[mode])) {
			helpString += " Press " + Keybinds.enunciateKey(keyName)
				+ " to " + info.description + ". ";
		}
		return helpString;
	}

	/**
	 * Get all of the defined keybinds in the current screen reader mode.
	 * This is used to generate the set of on-screen controls dynamically based
	 * on defined keybinds and current mode.
	 *
	 * @param mode the mode for which to get keybinds
	 * @returns the raw map from key names to description + callback
	 */
	getAllKeybinds(mode: ReaderModality): Binds {
		return this.keybinds[mode];
	}
}
