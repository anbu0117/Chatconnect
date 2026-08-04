import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/authStore.js";
import { useChatStore } from "../store/chatStore.js";

/**
 * Plays a short beep using the Web Audio API. Generated in-code rather
 * than shipping an audio file, so there's nothing extra to bundle.
 */
const playBeep = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio isn't critical to app function; fail silently if unsupported/blocked
  }
};

/**
 * Requests Notification permission once, then shows a native browser
 * notification + plays a beep whenever a new message arrives while the
 * tab is unfocused. Mount this once near the top of the authenticated app.
 */
export const useNewMessageNotifications = () => {
  const { socket, authUser } = useAuthStore();
  const isTabFocused = useRef(true);

  useEffect(() => {
    const handleFocus = () => (isTabFocused.current = true);
    const handleBlur = () => (isTabFocused.current = false);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (message.senderId === authUser?._id) return; // don't notify on our own sends
      if (isTabFocused.current) return;

      playBeep();

      if ("Notification" in window && Notification.permission === "granted") {
        const senderName =
          useChatStore.getState().users.find((u) => u._id === message.senderId)?.username ||
          "New message";
        new Notification(senderName, {
          body: message.text || "Sent an image",
          icon: "/default-avatar.svg",
        });
      }
    };

    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, [socket, authUser]);
};
