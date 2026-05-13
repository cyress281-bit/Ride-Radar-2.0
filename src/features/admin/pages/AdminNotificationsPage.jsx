import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bell, Check, AlertCircle } from 'lucide-react';
import { sendAnnouncement } from '@/features/admin/api/admin-api.js';
import AdminPageShell from '@/features/admin/components/AdminPageShell.jsx';
import AdminLayout from '@/features/admin/components/AdminLayout.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * AdminNotificationsPage - Send global announcements to all platform users.
 *
 * Tries Edge Function first, falls back to batch insert (500 rows at a time).
 */
export default function AdminNotificationsPage() {
  return (
    <AdminPageShell
      skeleton={
        <AdminLayout>
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-7 w-32" />
          </div>
          <div className="mx-auto max-w-xl space-y-4">
            <Skeleton className="h-10 w-full rounded-[20px]" />
            <Skeleton className="h-32 w-full rounded-[20px]" />
            <Skeleton className="h-11 w-full rounded-[20px]" />
          </div>
        </AdminLayout>
      }
    >
      <AdminNotificationsContent />
    </AdminPageShell>
  );
}

function AdminNotificationsContent() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const broadcast = useMutation({
    mutationFn: () => sendAnnouncement(title, body),
  });

  const handleSubmit = () => {
    broadcast.mutate(undefined, {
      onSuccess: () => {
        setTitle('');
        setBody('');
      },
    });
  };

  const deliveryMethod = broadcast.data?.data?.method;
  const deliveryCount = broadcast.data?.data?.count;

  return (
    <AdminLayout>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Announcements</h2>
      </div>

      <div className="mx-auto max-w-xl space-y-4">
        <div>
          <Label htmlFor="announcement-title">Title</Label>
          <Input
            id="announcement-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., New feature available"
            className="mt-1.5 min-h-[44px]"
          />
        </div>
        <div>
          <Label htmlFor="announcement-body">Body</Label>
          <Textarea
            id="announcement-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your announcement here..."
            rows={5}
            className="mt-1.5"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!title || broadcast.isPending}
          className="w-full rounded-full h-11"
        >
          <Bell className="mr-2 h-4 w-4" />
          {broadcast.isPending ? 'Sending...' : 'Send to all users'}
        </Button>

        {broadcast.isSuccess && (
          <div className="flex items-center gap-2 rounded-[20px] border border-success/20 bg-success/10 p-3 text-sm text-success">
            <Check className="h-4 w-4" />
            <div>
              <p className="font-medium">Announcement sent successfully.</p>
              {deliveryMethod && (
                <p className="text-xs opacity-80">
                  Method: {deliveryMethod === 'edge_function' ? 'Edge Function' : 'Batch insert'}
                  {deliveryCount != null && ` · ${deliveryCount} users`}
                </p>
              )}
            </div>
          </div>
        )}

        {broadcast.isError && (
          <div className="flex items-center gap-2 rounded-[20px] border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            Error: {broadcast.error?.message || 'Failed to send announcement'}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
