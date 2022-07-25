/**
 * The different defined modes of the screen reader. Can be extended later on
 * to define more modes.
 *
 * A "mode" is roughly a set of different behaviors for the screen reader to
 * act, each with its own custom defined set of keyboard controls for
 * interacting with various UI elements, like input boxes (EDIT mode) or
 * table elements (TABLE mode).
 */
export var ReaderModality;
(function (ReaderModality) {
    /**
     * The default mode for general-purpose screen reading. Will automatically
     * proceed through elements, as if the user is reading through the page
     * continuously.
     */
    ReaderModality[ReaderModality["NORMAL"] = 0] = "NORMAL";
    /**
     * The mode used for editing text in input boxes. Keybinds for this mode
     * should avoid using any common shortcuts (C-c, C-v) or letter keyboard
     * shortcuts (e.g. 'a', 'p', 'ArrowLeft', 'ArrowRight') that may be pressed
     * while entering text.
     */
    ReaderModality[ReaderModality["EDIT"] = 1] = "EDIT";
    /**
     * The mode for navigating table elements. Provides support for navigating
     * by cell (up, left, down, right), getting curent row/column info, etc.
     * and can drop down into edit mode if there is an input field within the cell
     */
    ReaderModality[ReaderModality["TABLE"] = 2] = "TABLE";
    /**
     * The mode in which the screen reader is paused. At the very least this
     * mode should contain a keybind to return to the previous mode.
     */
    ReaderModality[ReaderModality["PAUSED"] = 3] = "PAUSED";
})(ReaderModality || (ReaderModality = {}));
