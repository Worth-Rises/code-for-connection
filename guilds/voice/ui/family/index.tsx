import { Routes, Route } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardContent,
  Layout,
  LoadingSpinner,
  PageHeader,
  Container,
} from "@openconnect/ui";
import {
  API_BASE,
  formatDate,
  formatDuration,
  statusLabel,
  statusIcon,
} from "../shared";
import { ApprovedUserContact, VoiceCallRecord } from "../types";
import { useFetchData } from "../hooks";

function VoiceHome() {
  const {
    data: callHistoryData,
    isLoading: loadingHistory,
    error: callHistoryError,
  } = useFetchData<VoiceCallRecord[]>(
    `${API_BASE}/voice/call-logs?pageSize=10`,
  );
  const {
    data: contactsData,
    isLoading: loadingContacts,
    error: contactsError,
  } = useFetchData<ApprovedUserContact[]>(`${API_BASE}/voice/contacts  `);

  return (
    <Layout>
      <Container>
        <PageHeader
          title="Voice Calls"
          subtitle="Family interface for receiving calls"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader title="Approved Contacts" action={<></>} />
            <CardContent className="p-4">
              {loadingContacts ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : contactsData?.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-5xl block mb-4">📋</span>
                  <p className="text-gray-500">No approved contacts yet.</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Ask your facility to approve contacts for calling.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contactsData?.map((c) => (
                    <ContactCard key={c.id} contact={c} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Call History" />
            <CardContent className="p-4">
              {loadingHistory ? (
                <div className="flex justify-center py-6">
                  <LoadingSpinner size="md" />
                </div>
              ) : callHistoryData?.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500 text-sm">
                    No calls yet. Make your first call above!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {callHistoryData?.map((call) => (
                    <CallHistoryItem key={call.id} call={call} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Container>
    </Layout>
  );
}

function ContactCard({ contact }: { contact: ApprovedUserContact }) {
  const { incarceratedPerson } = contact;

  return (
    <Card padding="md">
      <CardContent className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {incarceratedPerson.firstName} {incarceratedPerson.lastName}
            </h3>
            <p className="text-sm text-gray-500">
              {incarceratedPerson.externalId}
            </p>
            <p className="text-sm text-gray-400 mt-0.5">
              {incarceratedPerson.facility?.name}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CallHistoryItem({ call }: { call: VoiceCallRecord }) {
  const name = call.familyMember
    ? `${call.familyMember.firstName} ${call.familyMember.lastName}`
    : "Unknown";

  return (
    <Card padding="none">
      <CardContent className="px-4 py-3">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-3">
            <span className="text-xl">{statusIcon(call.status)}</span>
            <div>
              <p className="text-sm font-medium text-gray-900">{name}</p>
              <p className="text-xs text-gray-400">
                {formatDate(call.startedAt)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">
              {call.durationSeconds != null
                ? formatDuration(call.durationSeconds)
                : "—"}
            </p>
            <p className="text-xs text-gray-400">{statusLabel(call.status)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VoiceFamily() {
  return (
    <Routes>
      <Route index element={<VoiceHome />} />
    </Routes>
  );
}
