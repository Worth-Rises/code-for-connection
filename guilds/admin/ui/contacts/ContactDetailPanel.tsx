import { useState } from 'react';
import { useAuth } from '../../../../apps/web/src/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';

interface ContactRequest {
  id: string;
  relationship: string;
  isAttorney: boolean;
  status: string;
  requestedAt: string;
  reviewedAt: string | null;
  incarceratedPerson: {
    id: string;
    firstName: string;
    lastName: string;
    externalId: string | null;
    facilityId: string;
    facility: { id: string; name: string };
  };
  familyMember: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
}

interface ContactDetailPanelProps {
  contact: ContactRequest;
  onClose: () => void;
  onUpdated: () => void;
}

export default function ContactDetailPanel({ contact, onClose, onUpdated }: ContactDetailPanelProps) {
  const { token } = useAuth();
  const [approveOpen, setApproveOpen] = useState(false);
  const [denyOpen, setDenyOpen] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resident = contact.incarceratedPerson;
  const family = contact.familyMember;

  async function handleApprove() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/contact-requests/${contact.id}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error?.message ?? 'Failed to approve contact');
        return;
      }
      toast.success('Contact approved');
      setApproveOpen(false);
      onUpdated();
    } catch {
      toast.error('Failed to approve contact');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeny() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/contact-requests/${contact.id}/deny`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: denyReason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error?.message ?? 'Failed to deny contact');
        return;
      }
      toast.success('Contact denied');
      setDenyOpen(false);
      setDenyReason('');
      onUpdated();
    } catch {
      toast.error('Failed to deny contact');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-96 border-l border-gray-200 bg-white flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-base font-medium">Contact Detail</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
      </div>

      <div className="flex-1 p-4 space-y-5">
        {/* Resident info */}
        <div>
          <p className="text-xs font-medium uppercase text-gray-500 mb-2">Resident</p>
          <div className="rounded-md border border-gray-200 p-3 text-sm space-y-1">
            <p className="font-medium">{resident.firstName} {resident.lastName} {resident.externalId && `#${resident.externalId}`}</p>
            <p className="text-gray-500">{resident.facility.name}</p>
          </div>
        </div>

        {/* Contact info */}
        <div>
          <p className="text-xs font-medium uppercase text-gray-500 mb-2">Contact (Requesting)</p>
          <div className="rounded-md border border-gray-200 p-3 text-sm space-y-1">
            <p className="font-medium">{family.firstName} {family.lastName}</p>
            <p className="text-gray-500">{family.phone}</p>
            <p className="text-gray-500">{family.email}</p>
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Relationship</span>
            <span className="font-medium capitalize">{contact.relationship}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Attorney</span>
            <span>{contact.isAttorney ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Requested</span>
            <span>{new Date(contact.requestedAt).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <Badge variant={contact.status === 'pending' ? 'secondary' : contact.status === 'approved' ? 'default' : 'destructive'}>
              {contact.status}
            </Badge>
          </div>
        </div>

        {/* Communication History placeholder */}
        <div>
          <p className="text-xs font-medium uppercase text-gray-500 mb-2">Communication History</p>
          <p className="text-sm text-gray-400">(No prior contact)</p>
        </div>
      </div>

      {/* Actions */}
      {contact.status === 'pending' && (
        <div className="border-t border-gray-200 p-4 flex gap-2">
          <Button className="flex-1" onClick={() => setApproveOpen(true)}>Approve</Button>
          <Button variant="destructive" className="flex-1" onClick={() => setDenyOpen(true)}>Deny</Button>
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Contact</DialogTitle>
            <DialogDescription>Review and approve this contact request.</DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-gray-200 p-3 text-sm space-y-1">
            <p><span className="text-gray-500">Name:</span> {family.firstName} {family.lastName}</p>
            <p><span className="text-gray-500">Relationship:</span> {contact.relationship}</p>
            <p><span className="text-gray-500">Phone:</span> {family.phone}</p>
            <p><span className="text-gray-500">Email:</span> {family.email}</p>
            <p><span className="text-gray-500">Resident:</span> {resident.firstName} {resident.lastName} {resident.externalId && `(#${resident.externalId})`}</p>
            <p><span className="text-gray-500">Submitted:</span> {new Date(contact.requestedAt).toLocaleDateString()}</p>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleApprove} disabled={submitting}>
              {submitting ? 'Approving...' : 'Approve Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny Dialog */}
      <Dialog open={denyOpen} onOpenChange={(open) => { setDenyOpen(open); if (!open) setDenyReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Contact</DialogTitle>
            <DialogDescription>You are about to deny this contact request.</DialogDescription>
          </DialogHeader>

          <div className="text-sm space-y-1">
            <p><span className="text-gray-500">Contact:</span> {family.firstName} {family.lastName}</p>
            <p><span className="text-gray-500">Resident:</span> {resident.firstName} {resident.lastName} {resident.externalId && `(#${resident.externalId})`}</p>
          </div>

          <p className="text-sm text-gray-500">
            This action is logged and the applicant will not be notified automatically.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (required)</label>
            <Textarea
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              placeholder="Enter reason for denial..."
            />
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeny}
              disabled={submitting || !denyReason.trim()}
            >
              {submitting ? 'Denying...' : 'Deny Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
