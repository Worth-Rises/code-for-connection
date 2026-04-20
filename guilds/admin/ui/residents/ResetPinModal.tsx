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
import { toast } from 'sonner';

interface ResetPinModalProps {
  residentId: string;
  residentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'confirm' | 'result';

export default function ResetPinModal({ residentId, residentName, open, onOpenChange }: ResetPinModalProps) {
  const { token } = useAuth();
  const [step, setStep] = useState<Step>('confirm');
  const [newPin, setNewPin] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    onOpenChange(false);
    // Reset state after close animation
    setTimeout(() => {
      setStep('confirm');
      setNewPin(null);
    }, 200);
  }

  async function handleReset() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/residents/${residentId}/reset-pin`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error?.message ?? 'Failed to reset PIN');
        return;
      }

      setNewPin(data.data.newPin);
      setStep('result');
      toast.success('PIN reset successfully');
    } catch {
      toast.error('Failed to reset PIN');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopy() {
    if (newPin) {
      navigator.clipboard.writeText(newPin);
      toast.success('PIN copied to clipboard');
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent showCloseButton={step === 'result'}>
        {step === 'confirm' ? (
          <>
            <DialogHeader>
              <DialogTitle>Reset PIN</DialogTitle>
              <DialogDescription>
                Generate a new PIN for {residentName}.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              This will generate a new PIN. The old PIN will stop working immediately.
              You must communicate the new PIN to the resident.
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button onClick={handleReset} disabled={submitting}>
                {submitting ? 'Generating...' : 'Generate New PIN'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>New PIN Generated</DialogTitle>
              <DialogDescription>
                This PIN will not be shown again.
              </DialogDescription>
            </DialogHeader>

            <div className="text-4xl font-mono tracking-widest text-center p-6 bg-gray-100 rounded-lg">
              {newPin}
            </div>

            <div className="flex justify-center">
              <Button variant="outline" onClick={handleCopy}>
                Copy to Clipboard
              </Button>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
