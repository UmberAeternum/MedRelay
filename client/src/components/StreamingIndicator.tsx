import { Loader2, Zap, MessageCircle } from "lucide-react";

interface StreamingIndicatorProps {
  type?: "dots" | "pulse" | "wave" | "spinner";
  message?: string;
  showIcon?: boolean;
}

/**
 * Streaming indicator component with multiple animation styles
 * Provides visual feedback during AI response streaming
 */
export function StreamingIndicator({
  type = "wave",
  message = "AI is thinking...",
  showIcon = true,
}: StreamingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-cyan-400">
      {showIcon && (
        <div className="relative">
          {type === "spinner" && <Loader2 className="w-4 h-4 animate-spin" />}
          {type === "pulse" && (
            <div className="w-4 h-4 bg-cyan-400 rounded-full animate-pulse" />
          )}
          {type === "dots" && (
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
              <div
                className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              />
              <div
                className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              />
            </div>
          )}
          {type === "wave" && (
            <div className="flex gap-0.5 items-end">
              <div
                className="w-1 h-2 bg-cyan-400 rounded-full animate-pulse"
                style={{ animationDelay: "0s" }}
              />
              <div
                className="w-1 h-3 bg-cyan-400 rounded-full animate-pulse"
                style={{ animationDelay: "0.1s" }}
              />
              <div
                className="w-1 h-2 bg-cyan-400 rounded-full animate-pulse"
                style={{ animationDelay: "0.2s" }}
              />
            </div>
          )}
        </div>
      )}
      <span className="text-sm text-slate-300">{message}</span>
    </div>
  );
}

/**
 * Typing indicator component (three dots animation)
 */
export function TypingIndicator() {
  return (
    <div className="flex gap-1">
      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
      <div
        className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
        style={{ animationDelay: "0.1s" }}
      />
      <div
        className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
        style={{ animationDelay: "0.2s" }}
      />
    </div>
  );
}

/**
 * Streaming progress bar component
 */
interface StreamingProgressProps {
  progress?: number;
  label?: string;
}

export function StreamingProgress({ progress = 0, label = "Processing..." }: StreamingProgressProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs text-cyan-400">{Math.round(progress)}%</span>
      </div>
      <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Skeleton loading component for message placeholder
 */
export function MessageSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-4 bg-slate-700 rounded w-3/4" />
      <div className="h-4 bg-slate-700 rounded w-5/6" />
      <div className="h-4 bg-slate-700 rounded w-2/3" />
    </div>
  );
}

/**
 * Streaming status badge
 */
interface StreamingStatusProps {
  status: "idle" | "streaming" | "complete" | "error";
  message?: string;
}

export function StreamingStatus({ status, message }: StreamingStatusProps) {
  const statusConfig = {
    idle: { color: "bg-slate-600", label: "Ready", icon: MessageCircle },
    streaming: { color: "bg-cyan-500", label: "Streaming", icon: Zap },
    complete: { color: "bg-green-500", label: "Complete", icon: MessageCircle },
    error: { color: "bg-red-500", label: "Error", icon: MessageCircle },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 ${config.color} rounded-full ${status === "streaming" ? "animate-pulse" : ""}`} />
      <span className="text-xs text-slate-400">
        {message || config.label}
      </span>
    </div>
  );
}

/**
 * Animated gradient text for streaming responses
 */
interface StreamingTextProps {
  text: string;
  isStreaming?: boolean;
}

export function StreamingText({ text, isStreaming }: StreamingTextProps) {
  return (
    <div className="relative">
      <span className={isStreaming ? "animate-pulse" : ""}>{text}</span>
      {isStreaming && (
        <span className="absolute -right-2 top-0 w-1 h-4 bg-cyan-400 animate-pulse" />
      )}
    </div>
  );
}
