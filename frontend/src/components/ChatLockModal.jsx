import React, { useState } from "react";
import { Lock, Unlock, KeyRound, Eye, EyeOff, X, ShieldCheck, Loader2 } from "lucide-react";
import { useChatStore } from "../store/chatStore.js";
import toast from "react-hot-toast";

const ChatLockModal = () => {
  const {
    isPinModalOpen,
    pinModalMode,
    setPinModalOpen,
    verifyChatPin,
    setChatPin,
    pendingLockConversationId,
    toggleLockConversation,
  } = useChatStore();

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isPinModalOpen) return null;

  const handleClose = () => {
    setPin("");
    setConfirmPin("");
    setCurrentPin("");
    setIsLoading(false);
    setPinModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (pinModalMode === "unlock") {
      if (!pin.trim()) {
        toast.error("Please enter your PIN");
        return;
      }
      setIsLoading(true);
      const success = await verifyChatPin(pin.trim());
      setIsLoading(false);
      if (success) {
        // If there was a pending conversation to toggle lock on:
        if (pendingLockConversationId) {
          await toggleLockConversation(pendingLockConversationId);
        }
        handleClose();
      }
    } else if (pinModalMode === "set" || pinModalMode === "change") {
      if (pin.trim().length < 4 || pin.trim().length > 8) {
        toast.error("PIN must be 4 to 8 characters/digits");
        return;
      }
      if (pin !== confirmPin) {
        toast.error("PIN confirmation does not match");
        return;
      }
      if (pinModalMode === "change" && !currentPin.trim()) {
        toast.error("Please enter your current PIN");
        return;
      }

      setIsLoading(true);
      const success = await setChatPin(pin.trim(), currentPin.trim() || undefined);
      setIsLoading(false);
      if (success) {
        if (pendingLockConversationId) {
          await toggleLockConversation(pendingLockConversationId);
        }
        handleClose();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon & Title */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center mx-auto mb-3 shadow-sm ring-1 ring-brand-500/20">
            {pinModalMode === "unlock" ? (
              <Lock className="h-7 w-7" />
            ) : (
              <KeyRound className="h-7 w-7" />
            )}
          </div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {pinModalMode === "unlock"
              ? "Unlock Private Chats"
              : pinModalMode === "set"
              ? "Set Private Chat PIN"
              : "Change Chat PIN"}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs mx-auto">
            {pinModalMode === "unlock"
              ? "Enter your PIN to view your locked private conversations."
              : "Set a 4 to 8 digit/character secure PIN to protect your private chats."}
          </p>
        </div>

        {/* PIN Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {pinModalMode === "change" && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Current PIN
              </label>
              <input
                type={showPin ? "text" : "password"}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="Enter current PIN"
                maxLength={8}
                autoFocus
                className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 px-3.5 py-2.5 text-center text-sm font-mono tracking-widest outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              {pinModalMode === "unlock"
                ? "Enter PIN"
                : pinModalMode === "set"
                ? "New PIN"
                : "New PIN"}
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                maxLength={8}
                autoFocus={pinModalMode !== "change"}
                className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 px-3.5 py-2.5 text-center text-sm font-mono tracking-widest outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {(pinModalMode === "set" || pinModalMode === "change") && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Confirm PIN
              </label>
              <input
                type={showPin ? "text" : "password"}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Confirm new PIN"
                maxLength={8}
                className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 px-3.5 py-2.5 text-center text-sm font-mono tracking-widest outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
              />
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !pin.trim()}
              className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : pinModalMode === "unlock" ? (
                <>
                  <Unlock className="h-4 w-4" />
                  <span>Unlock Chats</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Save PIN</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatLockModal;
