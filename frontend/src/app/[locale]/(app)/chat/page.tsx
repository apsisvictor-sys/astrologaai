'use client';

import { ChatProvider } from '@/lib/chat-context';
import { ChatWindow } from '@/components/chat/chat-window';

export default function ChatPage() {
  return (
    <ChatProvider>
      <div className="h-screen flex flex-col">
        <ChatWindow />
      </div>
    </ChatProvider>
  );
}
