/**
 * A proxy-pattern-esque singleton class wrapping around the Web Speech API's
 * window.speechSynthesis. Provides methods for modifying speech rate,
 * pausing, canceling, and resuming.
 */
export class SpeechSynth {
    /**
     * Construct the only instance of this class. Sets default values for
     * speech rate, cancels the synth if any speaking from previous pages is
     * going on.
     *
     * TODO if user wants to choose between different voices, maybe add a
     * parameter here.
     */
    constructor() {
        this.voiceSynth = window.speechSynthesis;
        this.voiceSynth.cancel();
        this.speechRate = 1.0;
        this.isPause = false;
    }
    /**
     * Get the SpeechSynth singleton instance.
     * @returns the SpeechSynth instance
     */
    static getSynth() {
        if (!SpeechSynth._instance) {
            SpeechSynth._instance = new SpeechSynth();
        }
        return SpeechSynth._instance;
    }
    /**
     * Changes the speaking rate of the screen reader.
     * @param factor multiplier on the speaking rate
     */
    changeVoiceRate(factor) {
        this.speechRate *= factor;
        if (this.speechRate > 4) {
            this.speechRate = 4;
        }
        else if (this.speechRate < 0.25) {
            this.speechRate = 0.25;
        }
    }
    /**
     * Convenience function for increasing the voice speaking rate,
     * equivalent to SpeechSynth.getSynth().changeVoiceRate(1.1)
     */
    increaseVoiceRate() {
        this.changeVoiceRate(1.1);
    }
    /**
     * Convenience function for decreasing the voice speaking rate,
     * equivalent to SpeechSynth.getSynth().changeVoiceRate(0.9)
     */
    decreaseVoiceRate() {
        this.changeVoiceRate(0.9);
    }
    /**
     * Stops whatever the voice synth is speaking right now. This should be
     * contrasted with pause(), which stops speaking but does not delete the task
     * entirely (i.e. after pause(), can still resume to continue speaking)
     */
    stop() {
        this.voiceSynth.cancel();
    }
    /**
     * Pauses whatever the voice synth is speaking right now.
     */
    pause() {
        if (!this.isPause) {
            this.voiceSynth.pause();
            this.isPause = true;
        }
    }
    /**
     * Resume speaking.
     */
    resume() {
        if (this.isPause) {
            this.voiceSynth.resume();
            this.isPause = false;
        }
    }
    /**
     * This function handles the switch between pause and resume.
     */
    stopNGo() {
        if (this.isPause) {
            this.resume();
        }
        else {
            this.pause();
        }
        this.isPause = (!this.isPause);
    }
    /**
     * Read out the given string of text. This WILL cancel whatever utterance
     * is being read out at the time of the call, so use it carefully.
     * TODO in the future, it might be good to split this method into
     * canceling and non-canceling methods, e.g. speakNext() vs speakNow()
     *
     * @param onStart a function that will be called immediately before the
     * voice synthesis begins reading the text.
     * @param text the text to be read.
     * @param onEnd a function that will be called immediately after the voice
     * synthesis finishes reading the text.
     */
    speak(text, onStart = () => { }, onEnd = () => { }) {
        this.stop();
        let utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = this.speechRate;
        utterance.onstart = onStart;
        this.voiceSynth.speak(utterance);
        utterance.onend = onEnd;
    }
}
