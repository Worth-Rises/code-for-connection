import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '@openconnect/ui';
import { useAdminApi } from '../hooks/useAdminApi';
import { useFacilityScope } from '../hooks/useFacilityScope';
import { FacilitySelector } from '../components/FacilitySelector';

interface HousingUnitWithType {
  id: string;
  name: string;
  unitType: {
    name: string;
    voiceCallDurationMinutes: number;
    callingHoursStart: string;
    callingHoursEnd: string;
    maxContacts: number;
  };
}

interface FacilityConfig {
  id: string;
  name: string;
  announcementText: string;
  announcementAudioUrl: string | null;
  agency: { name: string };
  housingUnits: HousingUnitWithType[];
}

export default function FacilityConfigPage() {
  const { get, patch } = useAdminApi();
  const { facilityId, setFacilityId, isAgencyAdmin } = useFacilityScope();
  const [config, setConfig] = useState<FacilityConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementAudioUrl, setAnnouncementAudioUrl] = useState('');

  const fetchConfig = useCallback(async () => {
    if (!facilityId) {
      setConfig(null);
      return;
    }
    setLoading(true);
    try {
      const res = await get(`/facility/${facilityId}`);
      const data = res.data;
      setConfig(data);
      setAnnouncementText(data?.announcementText || '');
      setAnnouncementAudioUrl(data?.announcementAudioUrl || '');
    } catch {
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, [get, facilityId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    if (!facilityId) return;
    setSaving(true);
    try {
      await patch(`/facility/${facilityId}`, { announcementText, announcementAudioUrl });
      fetchConfig();
    } catch {
      // error handled silently
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Facility Configuration</h1>
        {isAgencyAdmin && (
          <div className="w-64">
            <FacilitySelector value={facilityId} onChange={setFacilityId} />
          </div>
        )}
      </div>

      {!facilityId ? (
        <Card padding="lg">
          <p className="text-center text-gray-500">Select a facility to view configuration.</p>
        </Card>
      ) : loading ? (
        <Card padding="lg">
          <p className="text-center text-gray-500">Loading...</p>
        </Card>
      ) : !config ? (
        <Card padding="lg">
          <p className="text-center text-gray-500">Facility not found.</p>
        </Card>
      ) : (
        <>
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Facility Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="text-gray-900">{config.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Agency</p>
                <p className="text-gray-900">{config.agency.name}</p>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Announcements</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Announcement Text</label>
                <textarea
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Announcement Audio URL</label>
                <input
                  type="text"
                  value={announcementAudioUrl}
                  onChange={(e) => setAnnouncementAudioUrl(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave} loading={saving}>Save Changes</Button>
              </div>
            </div>
          </Card>

          {config.housingUnits && config.housingUnits.length > 0 && (
            <Card padding="lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Housing Units</h2>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Unit Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Call Duration</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Calling Hours</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Max Contacts</th>
                  </tr>
                </thead>
                <tbody>
                  {config.housingUnits.map((h) => (
                    <tr key={h.id} className="border-b border-gray-100">
                      <td className="px-4 py-3">{h.name}</td>
                      <td className="px-4 py-3">{h.unitType.name}</td>
                      <td className="px-4 py-3">{h.unitType.voiceCallDurationMinutes} min</td>
                      <td className="px-4 py-3">{h.unitType.callingHoursStart} - {h.unitType.callingHoursEnd}</td>
                      <td className="px-4 py-3">{h.unitType.maxContacts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
