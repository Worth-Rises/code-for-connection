import { useState, useEffect } from 'react';
import { useAuth } from '../../../../apps/web/src/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

interface ReleaseResidentModalProps {
  residentId: string;
  residentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function ReleaseResidentModal({
  residentId,
  residentName,
  open,
  onOpenChange,
  onSuccess,
}: ReleaseResidentModalProps) {
  const { token } = useAuth();
  const [releaseDate, setReleaseDate] = useState(() => todayISO());
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setReleaseDate(todayISO());
  }, [open]);

  function handleClose() {
    onOpenChange(false);
    setTimeout(() => {
      setReleaseDate(todayISO());
      setReason('');
    }, 200);
  }

  async function handleConfirm() {
    const trimmed = reason.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/residents/${residentId}/release`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: trimmed, releaseDate: releaseDate || undefined }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error?.message ?? 'Failed to release resident');
        return;
      }

      toast.success('Resident released');
      handleClose();
      onSuccess?.();
    } catch {
      toast.error('Failed to release resident');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Process Release</DialogTitle>
          <DialogDescription>
            Process release for {residentName}. This will:
          </DialogDescription>
        </DialogHeader>

        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
          <li>Set status to Released</li>
          <li>Remove access to all communication services</li>
          <li>Record release date and reason</li>
        </ul>

        <div className="space-y-2">
          <Label htmlFor="release-date">Release Date</Label>
          <Input
            id="release-date"
            type="date"
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
          />
          <p className="text-xs text-gray-500">Defaults to today</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="release-reason">Reason (required)</Label>
          <Textarea
            id="release-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for release..."
            rows={3}
            className="resize-none"
          />
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            onClick={handleConfirm}
            disabled={!reason.trim() || submitting}
          >
            {submitting ? 'Releasing...' : 'Confirm Release'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
