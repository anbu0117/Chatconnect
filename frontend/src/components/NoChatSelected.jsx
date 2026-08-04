import React from "react";
import { MessageCircle } from "lucide-react";

const NoChatSelected = () => (
  <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10">
      <MessageCircle className="h-8 w-8 text-brand-500" />
    </div>
    <h2 className="text-lg font-semibold">Select someone to chat with</h2>
    <p className="max-w-xs text-sm text-neutral-500">
      Pick a person from the list to see your conversation, or search for someone new.
    </p>
  </div>
);

export default NoChatSelected;
