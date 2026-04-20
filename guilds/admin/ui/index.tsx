import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@openconnect/ui';
import { useAuth } from '../../../apps/web/src/context/AuthContext';
import { usePolling } from '../../../apps/web/src/hooks/usePolling';
import { StatCard } from '../../../packages/ui/src/admin/StatCard';

import { fetchVoiceStats, fetchVoiceCallLogs } from './voice/api';
import { fetchVideoStats, fetchVideoPendingRequests, fetchVideoCallLogs } from './video/api';
import { fetchMessagingStats, fetchPendingMessages, fetchMessageLogs, approveMessage, rejectMessage, blockConversation } from './messaging/api';

import { VoiceCallHistoryTable } from './voice/components';
import { VideoPendingRequestsTable, VideoCallHistoryTable } from './video/components';
import { MessagingPendingReviewTable, MessagingHistoryTable } from './messaging/components';

import type { VoiceCallLogResponse } from './voice/types';
import type { VideoCallLogResponse } from './video/types';
import type { MessageLogResponse } from './messaging/types';

import { useState } from 'react';

/**
 * Unified overview dashboard — shows stats, pending items, and mini-histories
 * for voice, video, and messaging in one place.
 */
export default function AdminDashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // ── Stats ──────────────────────────────────────────
  const voiceStats = usePolling(
    useCallback(() => fetchVoiceStats(token!), [token]),
    15_000
  );
  const videoStats = usePolling(
    useCallback(() => fetchVideoStats(token!), [token]),
    15_000
  );
  const messagingStats = usePolling(
    useCallback(() => fetchMessagingStats(token!), [token]),
    15_000
  );

  // ── Pending items ──────────────────────────────────
  const videoPending = usePolling(
    useCallback(() => fetchVideoPendingRequests(token!), [token]),
    15_000
  );
  const messagingPending = usePolling(
    useCallback(() => fetchPendingMessages(token!), [token]),
    15_000
  );

  // ── Mini-histories (first page only, small page size) ──
  const voiceLogs = usePolling(
    useCallback(() => fetchVoiceCallLogs(token!, 1, 5), [token]),
    30_000
  );
  const videoLogs = usePolling(
    useCallback(() => fetchVideoCallLogs(token!, 1, 5), [token]),
    30_000
  );
  const messagingLogs = usePolling(
    useCallback(() => fetchMessageLogs(token!, 1, 5), [token]),
    30_000
  );

  // ── Video pending actions ──────────────────────────
  const handleVideoApprove = async (callId: string) => {
    setActionInProgress(callId);
    try {
      const { approveVideoRequest } = await import('./video/api');
      await approveVideoRequest(token!, callId);
      videoPending.refresh();
      videoStats.refresh();
    } catch (e) {
      console.error('Error approving video request:', e);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleVideoDeny = async (callId: string) => {
    setActionInProgress(callId);
    try {
      const { denyVideoRequest } = await import('./video/api');
      await denyVideoRequest(token!, callId);
      videoPending.refresh();
      videoStats.refresh();
    } catch (e) {
      console.error('Error denying video request:', e);
    } finally {
      setActionInProgress(null);
    }
  };

  // ── Messaging pending actions ──────────────────────
  const handleMsgApprove = async (messageId: string) => {
    setActionInProgress(messageId);
    try {
      await approveMessage(token!, messageId);
      messagingPending.refresh();
      messagingStats.refresh();
    } catch (e) {
      console.error('Error approving message:', e);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleMsgReject = async (messageId: string) => {
    setActionInProgress(messageId);
    try {
      await rejectMessage(token!, messageId);
      messagingPending.refresh();
      messagingStats.refresh();
    } catch (e) {
      console.error('Error rejecting message:', e);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleMsgBlock = async (conversationId: string) => {
    try {
      await blockConversation(token!, conversationId);
      messagingPending.refresh();
    } catch (e) {
      console.error('Error blocking conversation:', e);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of all communications</p>
      </div>

      {/* ── Stats Cards ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Voice Calls"
          value={voiceStats.data?.activeCalls ?? 0}
          loading={voiceStats.loading}
          color="blue"
          pulse={(voiceStats.data?.activeCalls ?? 0) > 0}
        />
        <StatCard
          label="Active Video Calls"
          value={videoStats.data?.activeCalls ?? 0}
          loading={videoStats.loading}
          color="green"
          pulse={(videoStats.data?.activeCalls ?? 0) > 0}
        />
        <StatCard
          label="Video Requests"
          value={videoStats.data?.pendingRequests ?? 0}
          loading={videoStats.loading}
          color="yellow"
          pulse={(videoStats.data?.pendingRequests ?? 0) > 0}
        />
        <StatCard
          label="Pending Messages"
          value={messagingStats.data?.pendingReview ?? 0}
          loading={messagingStats.loading}
          color="yellow"
          pulse={(messagingStats.data?.pendingReview ?? 0) > 0}
        />
      </div>

      {/* ── Pending Requests (all types) ──────────────── */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Pending Video Requests</h2>
          <button
            onClick={() => navigate('/admin/video')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View all →
          </button>
        </div>
        <VideoPendingRequestsTable
          requests={videoPending.data ?? []}
          loading={videoPending.loading}
          actionInProgress={actionInProgress}
          onApprove={handleVideoApprove}
          onDeny={handleVideoDeny}
          onRefresh={videoPending.refresh}
        />
      </Card>

      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Messages Pending Review</h2>
          <button
            onClick={() => navigate('/admin/messaging')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View all →
          </button>
        </div>
        <MessagingPendingReviewTable
          messages={messagingPending.data ?? []}
          loading={messagingPending.loading}
          actionInProgress={actionInProgress}
          onApprove={handleMsgApprove}
          onReject={handleMsgReject}
          onBlockConversation={handleMsgBlock}
        />
      </Card>

      {/* ── Mini-Histories ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Voice mini-history */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">📞 Voice</h2>
            <button
              onClick={() => navigate('/admin/voice')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View all →
            </button>
          </div>
          <VoiceCallHistoryTable
            calls={voiceLogs.data?.data ?? []}
            loading={voiceLogs.loading}
          />
        </Card>

        {/* Video mini-history */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">📹 Video</h2>
            <button
              onClick={() => navigate('/admin/video')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View all →
            </button>
          </div>
          <VideoCallHistoryTable
            calls={videoLogs.data?.data ?? []}
            loading={videoLogs.loading}
          />
        </Card>

        {/* Messaging mini-history */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">💬 Messages</h2>
            <button
              onClick={() => navigate('/admin/messaging')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View all →
            </button>
          </div>
          <MessagingHistoryTable
            messages={messagingLogs.data?.data ?? []}
            loading={messagingLogs.loading}
          />
        </Card>
      </div>
    </div>
  );
}
