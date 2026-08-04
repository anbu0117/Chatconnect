import React, { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Loader } from "lucide-react";

import { useAuthStore } from "./store/authStore.js";
import { useChatStore } from "./store/chatStore.js";

import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, socket } = useAuthStore();
  const { subscribeToSocketEvents, unsubscribeFromSocketEvents } = useChatStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Re-subscribe chat-related socket listeners whenever the socket
  // connection changes (e.g. on login, or reconnect after a network blip).
  useEffect(() => {
    if (socket) subscribeToSocketEvents();
    return () => unsubscribeFromSocketEvents();
  }, [socket]);

  if (isCheckingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-light dark:bg-surface-dark">
        <Loader className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={authUser ? <ChatPage /> : <Navigate to="/login" />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
        <Route
          path="/register"
          element={!authUser ? <RegisterPage /> : <Navigate to="/" />}
        />
        <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Toaster position="top-center" />
    </>
  );
};

export default App;
