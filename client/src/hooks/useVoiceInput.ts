import { useState, useCallback, useRef, useEffect } from "react";

interface UseVoiceInputOptions {
  language?: string;
  onTranscript?: (text: string) => void;
  onStart?: () => void;
  onStop?: () => void;
  onError?: (error: string) => void;
}

interface VoiceInputState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  confidence: number;
  error: string | null;
  isSupported: boolean;
}

/**
 * Custom hook for managing voice input functionality
 * Handles Web Speech API initialization, transcription, and error handling
 */
export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const {
    language = "en-US",
    onTranscript,
    onStart,
    onStop,
    onError,
  } = options;

  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    transcript: "",
    interimTranscript: "",
    confidence: 0,
    error: null,
    isSupported: true,
  });

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setState((prev) => ({
        ...prev,
        isSupported: false,
        error: "Speech Recognition not supported in this browser",
      }));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    // Handle results
    recognition.onresult = (event: any) => {
      let interim = "";
      let maxConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          finalTranscriptRef.current += transcript + " ";
          maxConfidence = Math.max(maxConfidence, confidence);
        } else {
          interim += transcript;
        }
      }

      setState((prev) => ({
        ...prev,
        interimTranscript: interim,
        transcript: finalTranscriptRef.current,
        confidence: maxConfidence,
      }));
    };

    // Handle errors
    recognition.onerror = (event: any) => {
      const errorMessage = getErrorMessage(event.error);
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isListening: false,
      }));
      onError?.(errorMessage);
    };

    // Handle end
    recognition.onend = () => {
      setState((prev) => ({
        ...prev,
        isListening: false,
      }));
      onStop?.();
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, onStart, onStop, onError]);

  const getErrorMessage = (error: string): string => {
    const errorMap: Record<string, string> = {
      "no-speech": "No speech detected. Please try again.",
      "audio-capture": "No microphone found. Please check your device.",
      "network": "Network error. Please check your connection.",
      "aborted": "Speech recognition was aborted.",
      "service-not-allowed": "Speech recognition service not allowed.",
      "bad-grammar": "Grammar error in speech recognition.",
      "permission-denied": "Microphone permission denied.",
    };
    return errorMap[error] || `Error: ${error}`;
  };

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !state.isSupported) return;

    setState((prev) => ({
      ...prev,
      error: null,
      transcript: "",
      interimTranscript: "",
      confidence: 0,
      isListening: true,
    }));

    finalTranscriptRef.current = "";
    onStart?.();

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error("Error starting speech recognition:", err);
    }
  }, [state.isSupported, onStart]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    recognitionRef.current.stop();
    setState((prev) => ({
      ...prev,
      isListening: false,
    }));

    // Send final transcript
    const finalText = (finalTranscriptRef.current + state.interimTranscript).trim();
    if (finalText) {
      onTranscript?.(finalText);
    }

    onStop?.();
  }, [state.interimTranscript, onTranscript, onStop]);

  const clearTranscript = useCallback(() => {
    setState((prev) => ({
      ...prev,
      transcript: "",
      interimTranscript: "",
      confidence: 0,
      error: null,
    }));
    finalTranscriptRef.current = "";
  }, []);

  const setLanguage = useCallback((newLanguage: string) => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = newLanguage;
    }
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    clearTranscript,
    setLanguage,
  };
}
