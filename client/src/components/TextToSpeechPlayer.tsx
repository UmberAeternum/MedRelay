import { useState, useEffect } from "react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Play,
  Pause,
  Square,
  Volume2,
  Zap,
  AlertCircle,
  Check,
  Loader2,
} from "lucide-react";

interface TextToSpeechPlayerProps {
  text: string;
  autoPlay?: boolean;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
  disabled?: boolean;
}

/**
 * Text-to-Speech player component
 * Provides playback controls, voice selection, and audio settings
 */
export function TextToSpeechPlayer({
  text,
  autoPlay = false,
  onPlayStart,
  onPlayEnd,
  disabled = false,
}: TextToSpeechPlayerProps) {
  const tts = useTextToSpeech({
    onStart: onPlayStart,
    onEnd: onPlayEnd,
  });

  const [showSettings, setShowSettings] = useState(false);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);

  // Auto-play if enabled
  useEffect(() => {
    if (autoPlay && text && !tts.isSpeaking) {
      tts.speak(text);
    }
  }, [autoPlay, text, tts.isSpeaking, tts.speak]);

  const handleVoiceChange = (index: string) => {
    const voiceIndex = parseInt(index, 10);
    setSelectedVoiceIndex(voiceIndex);
    tts.setVoice(voiceIndex);
  };

  const handleRateChange = (value: number[]) => {
    tts.setRate(value[0]);
  };

  const handlePitchChange = (value: number[]) => {
    tts.setPitch(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    tts.setVolume(value[0]);
  };

  if (!tts.isSupported) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">Text-to-speech is not supported in your browser</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 bg-slate-800/30 border border-cyan-500/20 rounded-lg p-4">
      {/* Playback Controls */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => tts.speak(text)}
          disabled={disabled || tts.isSpeaking}
          className="bg-cyan-600 hover:bg-cyan-700 text-white"
          size="sm"
        >
          {tts.isSpeaking ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Speaking...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Play
            </>
          )}
        </Button>

        {tts.isSpeaking && (
          <>
            <Button
              onClick={tts.isPaused ? tts.resume : tts.pause}
              variant="outline"
              size="sm"
              className="border-cyan-500/30 hover:bg-cyan-500/10"
            >
              {tts.isPaused ? (
                <>
                  <Play className="w-4 h-4 mr-2 text-cyan-400" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-2 text-cyan-400" />
                  Pause
                </>
              )}
            </Button>

            <Button
              onClick={tts.stop}
              variant="outline"
              size="sm"
              className="border-red-500/30 hover:bg-red-500/10"
            >
              <Square className="w-4 h-4 text-red-400" />
            </Button>
          </>
        )}

        <Button
          onClick={() => setShowSettings(!showSettings)}
          variant="outline"
          size="sm"
          className="border-cyan-500/30 hover:bg-cyan-500/10 ml-auto"
        >
          <Zap className="w-4 h-4 text-cyan-400" />
        </Button>
      </div>

      {/* Status */}
      {tts.isSpeaking && (
        <div className="flex items-center gap-2 text-cyan-400">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          <span className="text-xs">
            {tts.isPaused ? "Paused" : "Playing"}
          </span>
        </div>
      )}

      {tts.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs">{tts.error}</span>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="space-y-4 bg-slate-700/30 rounded p-3 border border-slate-600/30">
          {/* Voice Selection */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-semibold">Voice</label>
            <Select
              value={selectedVoiceIndex.toString()}
              onValueChange={handleVoiceChange}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600/30 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600/30">
                {tts.voices.map((voice, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    <span className="text-slate-100">
                      {voice.name}
                      {voice.default && " (Default)"}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Speech Rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs text-slate-400 font-semibold">Speed</label>
              <span className="text-xs text-cyan-400">{tts.rate.toFixed(1)}x</span>
            </div>
            <Slider
              value={[tts.rate]}
              onValueChange={handleRateChange}
              min={0.5}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Pitch */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs text-slate-400 font-semibold">Pitch</label>
              <span className="text-xs text-cyan-400">{tts.pitch.toFixed(1)}</span>
            </div>
            <Slider
              value={[tts.pitch]}
              onValueChange={handlePitchChange}
              min={0.5}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Volume */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs text-slate-400 font-semibold">Volume</label>
              <span className="text-xs text-cyan-400">{(tts.volume * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-slate-400" />
              <Slider
                value={[tts.volume]}
                onValueChange={handleVolumeChange}
                min={0}
                max={1}
                step={0.1}
                className="flex-1"
              />
            </div>
          </div>

          {/* Voice Info */}
          {tts.currentVoice && (
            <div className="bg-slate-800/50 rounded p-2 border border-slate-600/30">
              <p className="text-xs text-slate-400">
                <span className="font-semibold">Current Voice:</span> {tts.currentVoice.name}
              </p>
              <p className="text-xs text-slate-500">
                {tts.currentVoice.lang} • {tts.currentVoice.default ? "Default" : "Alternative"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-slate-400">
        Click play to hear the diagnostic response read aloud. Adjust voice, speed, and pitch as needed.
      </p>
    </div>
  );
}

/**
 * Compact TTS player for inline use in messages
 */
export function CompactTextToSpeechPlayer({ text }: { text: string }) {
  const tts = useTextToSpeech();

  if (!tts.isSupported) return null;

  return (
    <Button
      onClick={() => tts.speak(text)}
      disabled={tts.isSpeaking}
      variant="ghost"
      size="sm"
      className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
      title="Read aloud"
    >
      {tts.isSpeaking ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Volume2 className="w-4 h-4" />
      )}
    </Button>
  );
}
