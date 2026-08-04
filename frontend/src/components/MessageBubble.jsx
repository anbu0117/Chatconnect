import React from "react";
import { Check, CheckCheck } from "lucide-react";

const formatTime = (isoString) =>
  new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const StatusTick = ({ status }) => {
  if (status === "seen") return <CheckCheck className="h-3.5 w-3.5 text-brand-200" />;
  if (status === "delivered") return <CheckCheck className="h-3.5 w-3.5 text-white/70" />;
  return <Check className="h-3.5 w-3.5 text-white/70" />;
};

const MessageBubble = ({ message, isOwnMessage }) => {
  return (
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-2xl px-3.5 py-2 ${
          isOwnMessage
            ? "rounded-br-sm bg-brand-500 text-white"
            : "rounded-bl-sm bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
        }`}
      >
        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="Shared attachment"
            className="mb-1.5 max-h-64 rounded-lg object-cover"
          />
        )}
        {message.text && <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>}
        <div
          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
            isOwnMessage ? "text-white/70" : "text-neutral-400"
          }`}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isOwnMessage && <StatusTick status={message.status} />}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
