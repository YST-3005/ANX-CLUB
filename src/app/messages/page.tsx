'use client';

import { useState } from 'react';
import { chatsApi } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { motion } from 'framer-motion';
import { MessageSquare, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MessagesPage() {
  const { user, isAuthenticated } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string[]>([]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    if (!isAuthenticated) { toast.error('Please sign in'); return; }
    setSending(true);
    try {
      await chatsApi.send({ message: message.trim() });
      setSent((prev) => [...prev, message.trim()]);
      setMessage('');
      toast.success('Message sent!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto w-full pb-10">
      <div className="flex items-center justify-between bg-black/40 border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-400" /> Messages
          </h1>
          <p className="text-sm text-gray-400 mt-1">Your conversations with mentors and the team</p>
        </div>
      </div>

      <Card padding="none" className="flex flex-col h-[500px]">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sent.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-8 w-8" />}
              title="No messages yet"
              description="Start a conversation with a mentor or the A.N.X team."
            />
          ) : (
            sent.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-end gap-2 justify-end"
              >
                <div className="max-w-xs">
                  <div className="bg-primary text-white rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm">
                    {msg}
                  </div>
                </div>
                <Avatar name={user?.displayName || 'You'} src={user?.photoURL} size="xs" />
              </motion.div>
            ))
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="border-t border-border p-3 flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            containerClassName="flex-1"
          />
          <Button type="submit" variant="primary" size="icon" isLoading={sending} aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
