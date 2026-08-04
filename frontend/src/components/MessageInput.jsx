import React, { useRef, useState } from "react";
import { Image as ImageIcon, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { useChatStore } from "../store/chatStore.js";
import { useAuthStore } from "../store/authStore.js";

let typingTimeout = null;

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const { selectedUser, sendMessage } = useChatStore();
  const { socket, authUser } = useAuthStore();

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const emitTyping = () => {
    if (!socket || !selectedUser) return;
    socket.emit("typing", { senderId: authUser._id, receiverId: selectedUser._id });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("stopTyping", { senderId: authUser._id, receiverId: selectedUser._id });
    }, 1500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imageFile) return;
    if (!selectedUser) return;

    const formData = new FormData();
    formData.append("text", text.trim());
    if (imageFile) formData.append("image", imageFile);

    await sendMessage(selectedUser._id, formData);

    setText("");
    removeImage();
    clearTimeout(typingTimeout);
    socket?.emit("stopTyping", { senderId: authUser._id, receiverId: selectedUser._id });
  };

  return (
    <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
      {imagePreview && (
        <div className="mb-2 flex items-center gap-2">
          <div className="relative">
            <img src={imagePreview} alt="Preview" className="h-16 w-16 rounded-lg object-cover" />
            <button
              onClick={removeImage}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-neutral-900 p-0.5 text-white"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 rounded-full p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Attach image"
        >
          <ImageIcon className="h-5 w-5" />
        </button>

        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            emitTyping();
          }}
          placeholder="Type a message..."
          className="flex-1 rounded-full border border-neutral-300 bg-transparent px-4 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-neutral-700"
        />

        <button
          type="submit"
          disabled={!text.trim() && !imageFile}
          className="shrink-0 rounded-full bg-brand-500 p-2.5 text-white transition hover:bg-brand-600 disabled:opacity-40"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
