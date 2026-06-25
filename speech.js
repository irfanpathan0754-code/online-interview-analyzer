// Web Speech API Wrappers for Text-to-Speech and Speech-to-Text

// Text-to-Speech (TTS)
export function speak(text, onStart, onEnd) {
  if (!('speechSynthesis' in window)) {
    console.warn("Speech Synthesis not supported in this browser.");
    if (onStart) onStart();
    if (onEnd) setTimeout(onEnd, 2000); // Simulate timing
    return null;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Try to find a premium/natural English voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => 
    (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Microsoft")) && 
    (v.lang.startsWith("en-") || v.lang.startsWith("en_"))
  ) || voices.find(v => v.lang.startsWith("en"));

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  if (onStart) utterance.onstart = onStart;
  if (onEnd) utterance.onend = onEnd;
  utterance.onerror = (e) => {
    console.error("Speech Synthesis Error:", e);
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Speech-to-Text (STT) Transcriber
export class SpeechTranscriber {
  constructor(onResultCallback, onStateChangeCallback) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = SpeechRecognition ? new SpeechRecognition() : null;
    this.onResult = onResultCallback; // Receives: (text, isFinal)
    this.onStateChange = onStateChangeCallback; // Receives: ('idle', 'listening', 'error')
    
    this.isListening = false;
    this.finalTranscript = "";
    this.interimTranscript = "";

    if (this.recognition) {
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.onStateChange) this.onStateChange("listening");
      };

      this.recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            this.finalTranscript += transcriptPiece + " ";
          } else {
            interim += transcriptPiece;
          }
        }
        this.interimTranscript = interim;
        
        const fullCurrentTranscript = (this.finalTranscript + this.interimTranscript).trim();
        if (this.onResult) {
          this.onResult(fullCurrentTranscript, this.interimTranscript === "");
        }
      };

      this.recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error !== "no-speech") {
          if (this.onStateChange) this.onStateChange("error", event.error);
        }
      };

      this.recognition.onend = () => {
        // Restart if we are supposed to be active (prevents auto-timeout cutoff)
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch (e) {
            console.error("Failed to restart speech recognition:", e);
          }
        } else {
          if (this.onStateChange) this.onStateChange("idle");
        }
      };
    } else {
      console.warn("Speech Recognition not supported in this browser.");
    }
  }

  isSupported() {
    return this.recognition !== null;
  }

  start() {
    if (!this.recognition) return;
    this.finalTranscript = "";
    this.interimTranscript = "";
    this.isListening = true;
    try {
      this.recognition.start();
    } catch (e) {
      console.error("Failed to start Speech Recognition:", e);
    }
  }

  stop() {
    if (!this.recognition) return;
    this.isListening = false;
    try {
      this.recognition.stop();
    } catch (e) {
      console.error("Failed to stop Speech Recognition:", e);
    }
    if (this.onStateChange) this.onStateChange("idle");
  }

  clear() {
    this.finalTranscript = "";
    this.interimTranscript = "";
  }
}
export default { speak, stopSpeaking, SpeechTranscriber };
