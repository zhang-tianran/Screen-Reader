import { Keybinds } from "./keybinds.js";
import { ModalityStack } from "./modalitystack.js";
import { ReaderModality } from "./readermodality.js";
import { SpeechSynth } from "./speechsynth.js";

// TODO: Separate out different mode-specific functionality into separate
// classes, wrap screenreader itself in its own class.

/// The keybinds associated with the screen reader.
let keybinds: Keybinds;

/// The SpeechSynth instance used by the screen reader.
let synth: SpeechSynth;

/// The "mode stack" storing the current and previous states of the screen
/// reader.
let modeStack: ModalityStack;

/**
 * On window load, we want to
 * - initialize our keybinds, speech synthesis, and modality stack instances
 * - register all keybinds for our different modes
 * - append the on-screen controls into the page's HTML.
 */
window.onload = () => {
	
	// initialize everything
	keybinds = new Keybinds();
	synth = SpeechSynth.getSynth();
	modeStack = new ModalityStack();

	// register all keybinds used for each of the different modes
	registerPausedKeybinds();
	registerEditKeybinds();
	registerNormalKeybinds();
	registerTableKeybinds();

	// add on-screen controls (+ useful css) to HTML, and render controls
	// for starting mode (PAUSED)

	// TODO: __current_sr_elt is unlikely to be a class name in most pages, but
	// still not impossible - can we dynamically generate a unique class name
	// that guarantee avoiding clashes?
	document.body.innerHTML = `
		<style>
			.__current_sr_elt {
				background-color: yellow;
			}
		</style>
		<div id="screenReader"></div>
    ` + document.body.innerHTML;
	renderControls();

	// listen for future inputs
	document.addEventListener("keydown", globalKeystrokes);
}

/**
 * Function (mostly for organization purposes) that registers all keybinds for
 * EDIT mode.
 */
function registerEditKeybinds() {
	// TODO this mode is still unused. Need to add functionality in order to
	// edit text boxes.
	keybinds.registerKeybind(ReaderModality.EDIT, "Escape",
		"Exit edit mode", () => {
			popMode();
			// TODO anything else to do here?
	});
}

/**
 * Function (mostly for organization purposes) that registers all keybinds for
 * PAUSED mode.
 */
function registerPausedKeybinds() {

	// press p to unpause
	keybinds.registerKeybind(ReaderModality.PAUSED, "p", "Unpause", () => {
		synth.resume();
		popMode();
		// if prev mode was NORMAL but nothing to speak, get it started
		if (modeStack.mode() === ReaderModality.NORMAL
			&& !synth.voiceSynth.speaking) {
			normalRead();
		}
	});

}

/**
 * Function (mostly for organization purposes) that registers all keybinds for
 * NORMAL mode.
 */
function registerNormalKeybinds() {
	
	// press p to pause
	keybinds.registerKeybind(ReaderModality.NORMAL, "p", "Pause", () => {
		synth.pause();
		pushMode(ReaderModality.PAUSED);
	});
	
	// arrowdown to skip to next element
	keybinds.registerKeybind(ReaderModality.NORMAL, "ArrowDown",
		"Read the next element", normalRead);

	// arrowup to go back to previous element
	keybinds.registerKeybind(ReaderModality.NORMAL, "ArrowUp",
		"Go back to the previous element", () => {

			let all = document.getElementsByTagName("*");
			let prevIdx = 0;
			for (; prevIdx < all.length; prevIdx++) {
				// TODO still some error if we are already at the topmost element,
				// but it doesn't seem to break functionality, so fix it later
				if (all[prevIdx].classList.contains("__current_sr_elt")) break;
			}

			if (prevIdx === all.length || prevIdx === 0) {
				all[0].classList.remove("__current_sr_elt");
				normalRead();
			}
			else {
				all[prevIdx].classList.remove("__current_sr_elt");
				(all[prevIdx] as HTMLElement).blur();
				let i = 0;
				// Some elements are not text elements, so we want to skip back over
				// them.
				let prevString = undefined;
				do {
					i++;
					if (all[prevIdx - i].id.startsWith("__sr")) continue;
					prevString = elementToString(all[prevIdx - i] as HTMLElement);
				} while (!prevString);
				// focus next element and speak out the element string
				all[prevIdx - i].classList.add("__current_sr_elt");
				(all[prevIdx - i] as HTMLElement).focus();
				let stringified = elementToString(all[prevIdx - i] as HTMLElement);
				synth.speak(stringified!);
			}
		});

		// arrowleft to slow down.
		// It is necessary to have this seemingly trivial anonymous function
		// (i.e. passing in just synth.decreaseVoiceRate doesn't work)
		keybinds.registerKeybind(ReaderModality.NORMAL, "ArrowLeft",
			"Slow down", () => synth.decreaseVoiceRate());

		// arrowright to speed up
		keybinds.registerKeybind(ReaderModality.NORMAL, "ArrowRight",
			"Speed up", () => synth.increaseVoiceRate());

		// t to enter table mode. We may refuse to enter if the current highlighted
		// element is not a <table>.
		keybinds.registerKeybind(ReaderModality.NORMAL, "t",
			"Enter table mode", () => {
			let all = document.getElementsByTagName("*");
			let prevIdx = 0;
			for (; prevIdx < all.length; prevIdx++) {
				if (all[prevIdx].classList.contains("__current_sr_elt")) break;
			}

			if (prevIdx === all.length || all[prevIdx].tagName !== "TABLE") {
				synth.speak("You are currently not hovering over a table element.");
				return;
			} else {
				synth.stop();
				let allRows = all[prevIdx].getElementsByTagName("tr");
				if (allRows.length === 0) {
					synth.speak("This table has no rows.");
					return;
				}

				let allCols = allRows[0].querySelectorAll("th,td");
				if (allCols.length === 0) {
					// TODO need to check all rows for emptiness technically not
					// just first row
					synth.speak("This table has no columns.");
					return;
				}

				all[prevIdx].classList.remove("__current_sr_elt");
				(all[prevIdx] as HTMLElement).blur();
				allCols[0].classList.add("__current_sr_elt");
				pushMode(ReaderModality.TABLE);
				readCell();
			}
		});

		// Space to click (on links, buttons, etc)
		keybinds.registerKeybind(ReaderModality.NORMAL, " ",
			`Click the hovered element`, () => {
			(document.activeElement as HTMLElement).click();
		});

}

/**
 * Function (mostly for organization purposes) that registers all keybinds for
 * TABLE mode.
 */
function registerTableKeybinds() {
	
	// p to pause, just like in NORMAL mode for consistency purposes
	keybinds.registerKeybind(ReaderModality.TABLE, "p", "Pause", () => {
		synth.pause();
		pushMode(ReaderModality.PAUSED);
	});

	// arrowright to move to the right cell. If no cell on the right, read out
	// an error message instead
	keybinds.registerKeybind(ReaderModality.TABLE, "ArrowRight",
		"Move right", () => {
			let all = document.getElementsByTagName("*");
			let prevIdx = 0;
			for (; prevIdx < all.length; prevIdx++) {
				if (all[prevIdx].classList.contains("__current_sr_elt")) break;
			}
			if (prevIdx === all.length) return;

			let prevNode = (all[prevIdx] as HTMLElement);
			let siblings = Array.from(prevNode.parentElement!
				.querySelectorAll("th,td"));
			let prevNodeIdx = siblings.indexOf(prevNode);
			if (prevNodeIdx < siblings.length - 1) {
				prevNode.blur();
				prevNode.classList.remove("__current_sr_elt");
				(siblings[prevNodeIdx + 1] as HTMLElement).focus();
				(siblings[prevNodeIdx + 1] as HTMLElement)
					.classList.add("__current_sr_elt");
				readCell();
			} else {
				synth.speak("There are no more cells to the right.");
			}
		});

		// arrowleft to move to the left cell. If no cell on the left, read out an
		// error message instead
		keybinds.registerKeybind(ReaderModality.TABLE, "ArrowLeft",
			"Move left", () => {
				let all = document.getElementsByTagName("*");
				let prevIdx = 0;
				for (; prevIdx < all.length; prevIdx++) {
					if (all[prevIdx].classList.contains("__current_sr_elt")) break;
				}
				if (prevIdx === all.length) return;

				let prevNode = (all[prevIdx] as HTMLElement);
				let siblings = Array.from(prevNode.parentElement!
					.querySelectorAll("th,td"));
				let prevNodeIdx = siblings.indexOf(prevNode);
				if (prevNodeIdx > 0) {
					prevNode.blur();
					prevNode.classList.remove("__current_sr_elt");
					(siblings[prevNodeIdx - 1] as HTMLElement).focus();
					(siblings[prevNodeIdx - 1] as HTMLElement)
						.classList.add("__current_sr_elt");
					readCell();
				} else {
					synth.speak("There are no more cells to the left.");
				}
			});

		// arrowdown to move to the row below. In case the row below is shorter than
		// the current row, move to the last element of the below row
		keybinds.registerKeybind(ReaderModality.TABLE, "ArrowDown",
			"Move down", () => {
				let all = document.getElementsByTagName("*");
				let prevIdx = 0;
				for (; prevIdx < all.length; prevIdx++) {
					if (all[prevIdx].classList.contains("__current_sr_elt")) break;
				}
				if (prevIdx === all.length) return;

				let prevNode = (all[prevIdx] as HTMLElement);
				let siblings = Array.from(prevNode.parentElement!
					.querySelectorAll("th,td"));
				let prevNodeIdx = siblings.indexOf(prevNode);

				let tableElt = prevNode;
				while (tableElt.tagName !== "TABLE") tableElt = tableElt.parentElement!;
				
				let rows = Array.from(tableElt.getElementsByTagName("tr"));
				let rowIdx = rows.indexOf(prevNode.parentElement! as HTMLTableRowElement);
				console.log(rowIdx);
				console.log(rows);
				if (rowIdx === rows.length - 1) {
					synth.speak("There are no more rows below this one.");
				} else {
					let belowCells = rows[rowIdx + 1].querySelectorAll("th,td");
					let nextNode = belowCells[Math.min(prevNodeIdx, belowCells.length - 1)];
					
					prevNode.blur();
					prevNode.classList.remove("__current_sr_elt");
					(nextNode as HTMLElement).focus();
					(nextNode as HTMLElement).classList.add("__current_sr_elt");
					readCell();
				}
			});

		// arrowdown to move to the row below. In case the row above is shorter than
		// the current row, move to the last element of the above row
		keybinds.registerKeybind(ReaderModality.TABLE, "ArrowUp",
			"Move up", () => {
				let all = document.getElementsByTagName("*");
				let prevIdx = 0;
				for (; prevIdx < all.length; prevIdx++) {
					if (all[prevIdx].classList.contains("__current_sr_elt")) break;
				}
				if (prevIdx === all.length) return;

				let prevNode = (all[prevIdx] as HTMLElement);
				let siblings = Array.from(prevNode.parentElement!
					.querySelectorAll("th,td"));
				let prevNodeIdx = siblings.indexOf(prevNode);

				let tableElt = prevNode;
				while (tableElt.tagName !== "TABLE") tableElt = tableElt.parentElement!;
				
				let rows = Array.from(tableElt.getElementsByTagName("tr"));
				let rowIdx = rows.indexOf(prevNode.parentElement! as HTMLTableRowElement);
				console.log(rowIdx);
				console.log(rows);
				if (rowIdx === 0) {
					synth.speak("There are no more rows above this one.");
				} else {
					let belowCells = rows[rowIdx - 1].querySelectorAll("th,td");
					let nextNode = belowCells[Math.min(prevNodeIdx, belowCells.length - 1)];
					
					prevNode.blur();
					prevNode.classList.remove("__current_sr_elt");
					(nextNode as HTMLElement).focus();
					(nextNode as HTMLElement).classList.add("__current_sr_elt");
					readCell();
				}
			});

		// q to exit the table. Maybe use a different keymapping, this one just
		// felt natural ("less"-command-like keybind)
		keybinds.registerKeybind(ReaderModality.TABLE, "q", "Exit the table",
			() => {
				popMode();
				normalRead();
			})
}

/**
 * Read out the current hovered cell.
 * TODO this is not a good solution. We are not supporting nested elements.
 * In future sprint, change this function to act more like normal mode
 * (I don't believe we can just straight up use normal mode itself?)
 */
function readCell(): void {
	let all = document.getElementsByTagName("*");
	let prevIdx = 0;
	for (; prevIdx < all.length; prevIdx++) {
		if (all[prevIdx].classList.contains("__current_sr_elt")) break;
	}

	if (prevIdx === all.length) return;
	else {
		let toSpeak = "";
		if (all[prevIdx].tagName === "TH") toSpeak += "Column header: ";
		else if (all[prevIdx].tagName === "TD") toSpeak += "Table cell: ";
		toSpeak += innerText((all[prevIdx] as HTMLElement));
		synth.speak(toSpeak);
		return;
	}
}

/**
 * Find the next readable element, and read it out.
 * This is a major change from old screen reader - we no longer assume the
 * HTML content of the page remains constant. Instead, every time we just
 * find the adjacent element to the previously read one.
 */
function normalRead(): void {
	let all = document.getElementsByTagName("*");
	let prevIdx = 0;
	for (; prevIdx < all.length; prevIdx++) {
		if (all[prevIdx].classList.contains("__current_sr_elt")) break;
	}

	if (prevIdx === all.length - 1) return;
	else if (prevIdx === all.length) prevIdx = -1;
	else {
		(all[prevIdx] as HTMLElement).blur();
		all[prevIdx].classList.remove("__current_sr_elt");
	}
	all[prevIdx + 1].classList.add("__current_sr_elt");
	(all[prevIdx + 1] as HTMLElement).focus();
	if (all[prevIdx + 1].id.startsWith("__sr")) {
		normalRead();
		return;
	}
	let stringified = elementToString(all[prevIdx + 1] as HTMLElement);
	if (stringified) synth.speak(stringified);
	else {
		normalRead();
	}
}

/**
 * Convert an element to a readable string. Very similar to the original 
 * screen reader's tagMap.
 * 
 * @param elt the element to attempt to convert to a readable string
 * @returns either the string text to be read out, or undefined if this element
 * cannot be read.
 */
function elementToString(elt: HTMLElement): string | undefined {
	switch (elt.tagName.toLocaleLowerCase()) {
		case "title": return "Title: " + innerText(elt);
		case "h1": return "Header 1: " + innerText(elt);
		case "h2": return "Header 2: " + innerText(elt);
		case "h3": return "Header 3: " + innerText(elt);
		case "h4": return "Header 4: " + innerText(elt);
		case "h5": return "Header 5: " + innerText(elt);
		case "h6": return "Header 6: " + innerText(elt);
		case "p": return "Paragraph: " + innerText(elt);
		case "img":
			let img = <HTMLImageElement> elt;
			return "Here is an image " + (img.hasAttribute("alt")) ?
				"with description " + img.alt : "without any description"; 
		case "a": return `This is a link to ${elt.innerText}. Press enter to click
			this link.`;
		case "button": return `This is a button with text ${innerText(elt)}. Press
			enter to press this button.`;
		case "table":
			let text = "This is a table ";	
			if (elt.getElementsByTagName("caption").length > 0) {
				text += "with caption " +
					Array.from(elt.getElementsByTagName("caption"))
					     .map(x => x.innerHTML)
							 .join(" ");
			}
			text += ". Press T to explore this table.";
			return text;
		default: return undefined;
	}
}

/**
 * Get the innerText of an element, but also strip out all \r and \n so it
 * does not confuse the speech synthesis.
 * 
 * @param elt the element to get innerText of
 * @returns the innerText of the element, with all \n and \r stripped away
 */
function innerText(elt: HTMLElement): string {
	return elt.innerText.replace(/\r?\n|\r/g, " ");
}

/**
 * The callback triggered whenever any key is pressed on the page
 * @param e the event received from the listener
 */
function globalKeystrokes(e: KeyboardEvent): void {
	// We'll set F1 to be the global "help me" keyboard shortcut in any mode.
	// Kind of an odd key to use, but other keys might be used in e.g. edit mode
	// or table mode so we want to choose one that is relatively out of the way
	if (e.key === "F1") {
		synth.stop();
		speakHelp();
	} else {
		keybinds.triggerEvent(modeStack.mode(), e);
	}
}

/**
 * A small wrapper around ModalityStack.popMode to also rerender onscreen
 * controls for the new mode.
 */
function popMode(): void {
	modeStack.popMode();
	renderControls();
}

/**
 * A small wrapper around ModalityStack.pushMode to also rerender onscreen
 * controls for the new mode.
 */
function pushMode(mode: ReaderModality): void {
	modeStack.pushMode(mode);
	renderControls();
}

/**
 * Read out all of the keybinds for the current mode, triggered on F1.
 */
function speakHelp() {
	let helpText = `You are currently in 
		${ReaderModality[modeStack.mode()]} mode. Press F one for help. 
		${keybinds.getHelpString(modeStack.mode())}`;
	synth.speak(helpText);
}

/**
 * Rerender onscreen controls. Most of the work here is linking up the same
 * callbacks from the keybinds to the buttons themselves. We don't need to
 * worry about removing the event listeners as replacing the innerHTML will
 * clean up old event listeners automatically
 */
function renderControls(): void {
	let mode = modeStack.mode();
	let innerHTML = `<span>${ReaderModality[mode]} </span>`;
	let modeKeys = keybinds.getAllKeybinds(mode);
	innerHTML += `<button id="__sr_help">Help [F1]</button>`
	let i = 0;
	let cb: (() => void)[] = [];
	for (const [keyName, info] of Object.entries(modeKeys)) {
		cb.push(info.callback);
		innerHTML +=
			`<button id="__sr_controls_${i}">
				${info.description} [${keyName}]
			</button>`;
		i++;
	}
	document.getElementById("screenReader")!.innerHTML = innerHTML;

	document.getElementById("__sr_help")?.addEventListener("click", speakHelp);
	for (i = 0; i < cb.length; i++) {
		// It's necessary to save cb[i] into a separate copy f - I think the 
		// garbage collector is buggy or maybe I don't understand JS closures well
		let f = cb[i];
		document.getElementById(`__sr_controls_${i}`)?.addEventListener("click", f);
	}
}
