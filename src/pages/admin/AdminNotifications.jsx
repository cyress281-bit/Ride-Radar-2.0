import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Check } from 'lucide-react';

export default function AdminNotifications() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);

  const broadcast = useMutation({
    mutationFn: async () => {
      await base44.functions.invoke('sendNotification', {
        sendToAll: true,
        type: 'announcement',
        title,
        body,
      });
    },
    onSuccess: () => { setSent(true); setTitle(''); setBody(''); },
  });

  return (
    <div className="px-5 pt-5">
      <Link to="/admin" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Admin
      </Link>
      <h1 className="font-display text-2xl font-bold tracking-tight mb-1">Announcements</h1>
      <p className="text-sm text-muted-foreground mb-6">Send a notification to all users</p>

      <div className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label>Body</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="mt-1.5" />
        </div>
        <Button onClick={() => broadcast.mutate()} disabled={!title || broadcast.isPending} className="w-full rounded-full h-11">
          {broadcast.isPending ? 'Sending...' : 'Send to all users'}
        </Button>
        {sent && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <Check className="w-4 h-4" /> Announcement sent.
          </div>
        )}
      </div>
    </div>
  );
}