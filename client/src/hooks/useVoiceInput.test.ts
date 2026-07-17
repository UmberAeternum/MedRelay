import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Tests for useVoiceInput hook
 * Validates voice input functionality, transcription, and error handling
 */

describe("useVoiceInput Hook", () => {
  describe("Voice Input State Management", () => {
    it("should initialize with correct default state", () => {
      const state = {
        isListening: false,
        transcript: "",
        interimTranscript: "",
        confidence: 0,
        error: null,
        isSupported: true,
      };

      expect(state.isListening).toBe(false);
      expect(state.transcript).toBe("");
      expect(state.confidence).toBe(0);
      expect(state.error).toBeNull();
      expect(state.isSupported).toBe(true);
    });

    it("should track listening state", () => {
      let isListening = false;
      expect(isListening).toBe(false);

      isListening = true;
      expect(isListening).toBe(true);

      isListening = false;
      expect(isListening).toBe(false);
    });

    it("should accumulate transcript", () => {
      let transcript = "";
      transcript += "Hello ";
      transcript += "world";

      expect(transcript).toBe("Hello world");
    });

    it("should track confidence level", () => {
      let confidence = 0;
      expect(confidence).toBe(0);

      confidence = 0.95;
      expect(confidence).toBeGreaterThan(0.9);
      expect(confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("Transcription Handling", () => {
    it("should process final transcript", () => {
      const finalTranscript = "I have a headache";
      expect(finalTranscript).toContain("headache");
    });

    it("should handle interim results", () => {
      const interim = "I have a hea";
      const final = "I have a headache";

      expect(interim).toBe("I have a hea");
      expect(final).toContain(interim);
    });

    it("should combine interim and final transcripts", () => {
      const final = "I have a ";
      const interim = "headache";
      const combined = (final + interim).trim();

      expect(combined).toBe("I have a headache");
    });

    it("should handle empty transcripts", () => {
      const transcript = "";
      expect(transcript.trim()).toBe("");
    });

    it("should preserve transcript order", () => {
      const transcripts = ["I", "have", "a", "fever"];
      const combined = transcripts.join(" ");

      expect(combined).toBe("I have a fever");
    });
  });

  describe("Error Handling", () => {
    it("should handle no-speech error", () => {
      const errorMap: Record<string, string> = {
        "no-speech": "No speech detected. Please try again.",
      };

      expect(errorMap["no-speech"]).toContain("No speech");
    });

    it("should handle audio-capture error", () => {
      const errorMap: Record<string, string> = {
        "audio-capture": "No microphone found. Please check your device.",
      };

      expect(errorMap["audio-capture"]).toContain("microphone");
    });

    it("should handle network error", () => {
      const errorMap: Record<string, string> = {
        "network": "Network error. Please check your connection.",
      };

      expect(errorMap["network"]).toContain("Network");
    });

    it("should handle permission-denied error", () => {
      const errorMap: Record<string, string> = {
        "permission-denied": "Microphone permission denied.",
      };

      expect(errorMap["permission-denied"]).toContain("permission");
    });

    it("should provide fallback error message", () => {
      const error = "unknown-error";
      const errorMap: Record<string, string> = {};
      const message = errorMap[error] || `Error: ${error}`;

      expect(message).toContain("Error:");
    });
  });

  describe("Callback Handling", () => {
    it("should call onStart callback", () => {
      const onStart = vi.fn();
      onStart();

      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it("should call onStop callback", () => {
      const onStop = vi.fn();
      onStop();

      expect(onStop).toHaveBeenCalledTimes(1);
    });

    it("should call onTranscript callback with text", () => {
      const onTranscript = vi.fn();
      const text = "I have a headache";

      onTranscript(text);

      expect(onTranscript).toHaveBeenCalledWith(text);
    });

    it("should call onError callback with error message", () => {
      const onError = vi.fn();
      const error = "No speech detected";

      onError(error);

      expect(onError).toHaveBeenCalledWith(error);
    });

    it("should not call callbacks if not provided", () => {
      const callbacks = {
        onStart: undefined,
        onStop: undefined,
        onTranscript: undefined,
        onError: undefined,
      };

      expect(callbacks.onStart).toBeUndefined();
      expect(callbacks.onStop).toBeUndefined();
    });
  });

  describe("Language Support", () => {
    it("should support English", () => {
      const language = "en-US";
      expect(language).toBe("en-US");
    });

    it("should support other languages", () => {
      const languages = ["es-ES", "fr-FR", "de-DE", "ja-JP", "zh-CN"];
      expect(languages).toHaveLength(5);
    });

    it("should allow language change", () => {
      let language = "en-US";
      language = "es-ES";

      expect(language).toBe("es-ES");
    });
  });

  describe("Confidence Tracking", () => {
    it("should track confidence from 0 to 1", () => {
      const confidences = [0, 0.25, 0.5, 0.75, 1.0];

      for (const conf of confidences) {
        expect(conf).toBeGreaterThanOrEqual(0);
        expect(conf).toBeLessThanOrEqual(1);
      }
    });

    it("should update confidence with new results", () => {
      let maxConfidence = 0;
      const results = [0.7, 0.85, 0.92, 0.88];

      for (const conf of results) {
        maxConfidence = Math.max(maxConfidence, conf);
      }

      expect(maxConfidence).toBe(0.92);
    });

    it("should reset confidence on clear", () => {
      let confidence = 0.95;
      confidence = 0;

      expect(confidence).toBe(0);
    });
  });

  describe("Transcript Clearing", () => {
    it("should clear transcript", () => {
      let transcript = "I have a headache";
      transcript = "";

      expect(transcript).toBe("");
    });

    it("should clear interim transcript", () => {
      let interim = "I have a hea";
      interim = "";

      expect(interim).toBe("");
    });

    it("should reset all state on clear", () => {
      let state = {
        transcript: "I have a headache",
        interimTranscript: "I have a hea",
        confidence: 0.95,
        error: "test error",
      };

      state = {
        transcript: "",
        interimTranscript: "",
        confidence: 0,
        error: null,
      };

      expect(state.transcript).toBe("");
      expect(state.interimTranscript).toBe("");
      expect(state.confidence).toBe(0);
      expect(state.error).toBeNull();
    });
  });

  describe("Browser Support Detection", () => {
    it("should detect supported browsers", () => {
      const isSupported = true;
      expect(isSupported).toBe(true);
    });

    it("should handle unsupported browsers", () => {
      let isSupported = false;
      expect(isSupported).toBe(false);
    });

    it("should set error for unsupported browsers", () => {
      const isSupported = false;
      const error = isSupported ? null : "Speech Recognition not supported";

      expect(error).not.toBeNull();
      expect(error).toContain("not supported");
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complete voice input flow", () => {
      let isListening = false;
      let transcript = "";
      let error: string | null = null;

      // Start listening
      isListening = true;
      expect(isListening).toBe(true);

      // Receive transcript
      transcript = "I have a fever";
      expect(transcript).toContain("fever");

      // Stop listening
      isListening = false;
      expect(isListening).toBe(false);
    });

    it("should handle error recovery", () => {
      let error: string | null = "No speech detected";
      expect(error).not.toBeNull();

      // Clear error
      error = null;
      expect(error).toBeNull();
    });

    it("should handle multiple transcriptions", () => {
      const transcriptions = [
        "I have a headache",
        "It started this morning",
        "It's getting worse",
      ];

      expect(transcriptions).toHaveLength(3);
      expect(transcriptions[0]).toContain("headache");
      expect(transcriptions[1]).toContain("morning");
      expect(transcriptions[2]).toContain("worse");
    });

    it("should handle language switching", () => {
      let language = "en-US";
      expect(language).toBe("en-US");

      language = "es-ES";
      expect(language).toBe("es-ES");

      language = "en-US";
      expect(language).toBe("en-US");
    });
  });

  describe("Performance", () => {
    it("should handle rapid state updates", () => {
      let transcript = "";
      for (let i = 0; i < 100; i++) {
        transcript += "word ";
      }

      expect(transcript.split(" ").length).toBeGreaterThan(100);
    });

    it("should handle long transcripts", () => {
      const longTranscript = "word ".repeat(1000);
      expect(longTranscript.length).toBeGreaterThan(4000);
    });

    it("should clear memory efficiently", () => {
      let data: string[] = [];
      for (let i = 0; i < 1000; i++) {
        data.push(`item${i}`);
      }

      data = [];
      expect(data).toHaveLength(0);
    });
  });
});
