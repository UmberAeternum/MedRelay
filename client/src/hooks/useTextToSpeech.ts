import { useState, useCallback, useRef, useEffect } from "react";

interface UseTextToSpeechOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onError?: (error: string) => void;
}

interface TextToSpeechState {
  isSupported: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  isLoading: boolean;
  error: string | null;
  currentVoice: SpeechSynthesisVoice | null;
  voices: SpeechSynthesisVoice[];
  rate: number;
  pitch: number;
  volume: number;
}

/**
 * Custom hook for text-to-speech functionality
 * Uses Web Speech API (SpeechSynthesis) to read text aloud
 */
export function useTextToSpeech(options: UseTextToSpeechOptions = {}) {
  const { onStart, onEnd, onPause, onResume, onError } = options;

  const [state, setState] = useState<TextToSpeechState>({
    isSupported: typeof window !== "undefined" && "speechSynthesis" in window,
    isSpeaking: false,
    isPaused: false,
    isLoading: false,
    error: null,
    currentVoice: null,
    voices: [],
    rate: 1,
    pitch: 1,
    volume: 1,
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

  // Initialize voices
  useEffect(() => {
    if (!synth) return;

    const updateVoices = () => {
      const availableVoices = synth.getVoices();
      setState((prev) => ({
        ...prev,
        voices: availableVoices,
        currentVoice: availableVoices[0] || null,
      }));
    };

    updateVoices();
    synth.onvoiceschanged = updateVoices;

    return () => {
      synth.onvoiceschanged = null;
    };
  }, [synth]);

  const speak = useCallback(
    (text: string, voiceIndex?: number) => {
      if (!synth || !state.isSupported) {
        const error = "Text-to-speech not supported";
        setState((prev) => ({ ...prev, error }));
        onError?.(error);
        return;
      }

      // Cancel any ongoing speech
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = state.rate;
      utterance.pitch = state.pitch;
      utterance.volume = state.volume;

      if (voiceIndex !== undefined && state.voices[voiceIndex]) {
        utterance.voice = state.voices[voiceIndex];
        setState((prev) => ({
          ...prev,
          currentVoice: state.voices[voiceIndex],
        }));
      } else if (state.currentVoice) {
        utterance.voice = state.currentVoice;
      }

      utterance.onstart = () => {
        setState((prev) => ({
          ...prev,
          isSpeaking: true,
          isPaused: false,
          error: null,
        }));
        onStart?.();
      };

      utterance.onend = () => {
        setState((prev) => ({
          ...prev,
          isSpeaking: false,
          isPaused: false,
        }));
        onEnd?.();
      };

      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        const error = `Speech synthesis error: ${event.error}`;
        setState((prev) => ({
          ...prev,
          isSpeaking: false,
          isPaused: false,
          error,
        }));
        onError?.(error);
      };

      utteranceRef.current = utterance;
      synth.speak(utterance);
    },
    [synth, state.isSupported, state.rate, state.pitch, state.volume, state.voices, state.currentVoice, onStart, onEnd, onError]
  );

  const pause = useCallback(() => {
    if (!synth || !state.isSpeaking) return;

    synth.pause();
    setState((prev) => ({
      ...prev,
      isPaused: true,
    }));
    onPause?.();
  }, [synth, state.isSpeaking, onPause]);

  const resume = useCallback(() => {
    if (!synth || !state.isPaused) return;

    synth.resume();
    setState((prev) => ({
      ...prev,
      isPaused: false,
    }));
    onResume?.();
  }, [synth, state.isPaused, onResume]);

  const stop = useCallback(() => {
    if (!synth) return;

    synth.cancel();
    setState((prev) => ({
      ...prev,
      isSpeaking: false,
      isPaused: false,
    }));
  }, [synth]);

  const setRate = useCallback((rate: number) => {
    const clampedRate = Math.max(0.5, Math.min(2, rate));
    setState((prev) => ({
      ...prev,
      rate: clampedRate,
    }));

    if (utteranceRef.current) {
      utteranceRef.current.rate = clampedRate;
    }
  }, []);

  const setPitch = useCallback((pitch: number) => {
    const clampedPitch = Math.max(0.5, Math.min(2, pitch));
    setState((prev) => ({
      ...prev,
      pitch: clampedPitch,
    }));

    if (utteranceRef.current) {
      utteranceRef.current.pitch = clampedPitch;
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setState((prev) => ({
      ...prev,
      volume: clampedVolume,
    }));

    if (utteranceRef.current) {
      utteranceRef.current.volume = clampedVolume;
    }
  }, []);

  const setVoice = useCallback(
    (voiceIndex: number) => {
      if (voiceIndex >= 0 && voiceIndex < state.voices.length) {
        setState((prev) => ({
          ...prev,
          currentVoice: state.voices[voiceIndex],
        }));

        if (utteranceRef.current) {
          utteranceRef.current.voice = state.voices[voiceIndex];
        }
      }
    },
    [state.voices]
  );

  return {
    ...state,
    speak,
    pause,
    resume,
    stop,
    setRate,
    setPitch,
    setVolume,
    setVoice,
  };
}
