import React from "react";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ChatWindow from "../components/ChatWindow.jsx";
import NoChatSelected from "../components/NoChatSelected.jsx";
import { useChatStore } from "../store/chatStore.js";
import { useNewMessageNotifications } from "../hooks/useNewMessageNotifications.js";

const ChatPage = () => {
  const { selectedUser } = useChatStore();
  useNewMessageNotifications();

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        {/* On mobile, show either the list or the open chat, not both */}
        <div className={`${selectedUser ? "hidden md:flex" : "flex"} w-full md:w-auto`}>
          <Sidebar />
        </div>
        <div className={`${selectedUser ? "flex" : "hidden md:flex"} flex-1`}>
          {selectedUser ? <ChatWindow /> : <NoChatSelected />}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
