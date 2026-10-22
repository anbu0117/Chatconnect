import React, { useState, useRef, useEffect } from "react";
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Forward,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useChatStore } from "../store/chatStore.js";

const formatTime = (isoString) =>
  new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const StatusTick = ({ status }) => {
  if (status === "sending") return <Clock className="h-3 w-3 animate-pulse text-white/60" />;
  if (status === "failed") return <AlertCircle className="h-3 w-3 text-red-300" />;
  if (status === "seen") return <CheckCheck className="h-3.5 w-3.5 text-brand-200" />;
  if (status === "delivered") return <CheckCheck className="h-3.5 w-3.5 text-white/70" />;
  return <Check className="h-3.5 w-3.5 text-white/70" />;
};

const MessageBubble = ({ message, isOwnMessage }) => {
  const { setForwardingMessage, editMessage, deleteMessage } = useChatStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editInputRef = useRef(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.selectionStart = editInputRef.current.value.length;
      editInputRef.current.selectionEnd = editInputRef.current.value.length;
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditText(message.text || "");
    setIsEditing(true);
    setShowDeleteConfirm(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(message.text || "");
  };

  const handleSaveEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === message.text) {
      setIsEditing(false);
      return;
    }
    setIsSubmitting(true);
    await editMessage(message._id, trimmed);
    setIsSubmitting(false);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    await deleteMessage(message._id);
    setIsSubmitting(false);
    setShowDeleteConfirm(false);
  };

  const isSending = message.status === "sending";

  return (
    <div
      className={`group relative flex items-center gap-1.5 ${
        isOwnMessage ? "justify-end flex-row" : "justify-start flex-row-reverse"
      }`}
    >
      {/* Action Toolbar on Hover (Edit, Delete, Forward) */}
      {!isEditing && !showDeleteConfirm && (
        <div
          className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${
            isOwnMessage ? "order-first" : "order-last"
          }`}
        >
          {/* Edit Button (Sender only, text messages, not currently sending) */}
          {isOwnMessage && message.text && !isSending && (
            <button
              type="button"
              onClick={handleStartEdit}
              className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 hover:text-brand-500 transition shrink-0"
              title="Edit message"
              aria-label="Edit message"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Delete Button (Sender only, not currently sending) */}
          {isOwnMessage && !isSending && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-full p-1.5 text-neutral-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 hover:text-rose-500 transition shrink-0"
              title="Delete message"
              aria-label="Delete message"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Forward Button */}
          <button
            type="button"
            onClick={() => setForwardingMessage(message)}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 hover:text-brand-500 transition shrink-0"
            title="Forward message"
            aria-label="Forward message"
          >
            <Forward className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Bubble Container */}
      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2 shadow-sm transition-all ${
          isOwnMessage
            ? "rounded-br-sm bg-brand-500 text-white"
            : "rounded-bl-sm bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
        } ${showDeleteConfirm ? "ring-2 ring-rose-500/50" : ""}`}
      >
        {/* Forwarded Tag */}
        {message.isForwarded && (
          <div
            className={`flex items-center gap-1 text-[11px] italic mb-1 ${
              isOwnMessage ? "text-white/75" : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            <Forward className="h-3 w-3" />
            <span>Forwarded</span>
          </div>
        )}

        {/* Image Attachment */}
        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="Shared attachment"
            className="mb-1.5 max-h-64 rounded-lg object-cover"
          />
        )}

        {/* Inline Edit Mode */}
        {isEditing ? (
          <div className="space-y-2 py-1">
            <textarea
              ref={editInputRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="w-full rounded-lg bg-black/10 dark:bg-black/25 text-white placeholder-white/60 p-2 text-sm outline-none border border-white/20 focus:border-white/50 resize-none"
              placeholder="Edit your message..."
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-end gap-1.5 text-xs">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSubmitting}
                className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white/90 transition flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSubmitting || !editText.trim()}
                className="px-2.5 py-1 rounded-md bg-white text-brand-600 font-semibold hover:bg-white/90 transition flex items-center gap-1 shadow-sm disabled:opacity-50"
              >
                <Check className="h-3 w-3" /> Save
              </button>
            </div>
          </div>
        ) : showDeleteConfirm ? (
          /* Delete Confirmation Inline Popover */
          <div className="py-1 space-y-2 text-xs">
            <p className="font-medium text-white/90">Delete this message for everyone?</p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSubmitting}
                className="px-2 py-1 rounded bg-white/20 hover:bg-white/30 text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium transition shadow-sm"
              >
                {isSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        ) : (
          /* Standard Message Text */
          message.text && (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
          )
        )}

        {/* Message Metadata Footer */}
        {!isEditing && !showDeleteConfirm && (
          <div
            className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
              isOwnMessage ? "text-white/70" : "text-neutral-400"
            }`}
          >
            {message.isEdited && (
              <span className="italic opacity-80" title="Edited message">
                (edited)
              </span>
            )}
            <span>{formatTime(message.createdAt)}</span>
            {isOwnMessage && <StatusTick status={message.status} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
