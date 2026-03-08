'use client';

import { ChatProvider } from '@/lib/chat-context';
import { ChatWindow } from '@/components/chat/chat-window';

interface SessionPageProps {
  params: { sessionId: string };
}

export default function SessionPage({ params }: SessionPageProps) {
  return (
    <ChatProvider>
      <div className="h-screen flex flex-col">
        <ChatWindow sessionId={params.sessionId} />
      </div>
    </ChatProvider>
  );
}
