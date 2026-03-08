import { useState } from 'react';
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
import { toast } from 'sonner';

interface DeactivateResidentModalProps {
  residentId: string;
  residentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function DeactivateResidentModal({
  residentId,
  residentName,
  open,
  onOpenChange,
  onSuccess,
}: DeactivateResidentModalProps) {
  const { token } = useAuth();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    onOpenChange(false);
    setTimeout(() => setReason(''), 200);
  }

  async function handleConfirm() {
    const trimmed = reason.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/residents/${residentId}/deactivate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: trimmed }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error?.message ?? 'Failed to deactivate resident');
        return;
      }

      toast.success('Resident deactivated');
      handleClose();
      onSuccess?.();
    } catch {
      toast.error('Failed to deactivate resident');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deactivate Resident</DialogTitle>
          <DialogDescription>
            Deactivate {residentName}. This will:
          </DialogDescription>
        </DialogHeader>

        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
          <li>Communication access will be removed.</li>
          <li>Records are preserved.</li>
          <li>This is reversible.</li>
        </ul>

        <div className="space-y-2">
          <Label htmlFor="deactivate-reason">Reason (required)</Label>
          <Textarea
            id="deactivate-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for deactivation..."
            rows={3}
            className="resize-none"
          />
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || submitting}
          >
            {submitting ? 'Deactivating...' : 'Confirm Deactivation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
