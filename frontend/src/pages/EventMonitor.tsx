import React, { useEffect, useState } from 'react';
import { fetchEvents } from '../services/api';
import type { EventItem } from '../types';
import { Activity, RefreshCw } from 'lucide-react';

export const EventMonitor: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(true);

  const loadEvents = () => {
    fetchEvents(1, 40)
      .then((res) => setEvents(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvents();
    const interval = setInterval(() => {
      if (isPolling) {
        loadEvents();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isPolling]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Event Telemetry Monitor</h2>
          <p className="text-sm text-slate-400 mt-1">Real-time event stream normalized from payment webhooks & merchant activity</p>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`flex items-center space-x-2 text-xs px-3 py-1.5 rounded-xl border transition-colors ${
              isPolling
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin' : ''}`} />
            <span>{isPolling ? 'Live Stream Active' : 'Stream Paused'}</span>
          </button>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-[#131b29] border border-[#1f293d] rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0b0f17]/50 border-b border-[#1f293d] text-xs text-slate-400 uppercase font-semibold">
              <th className="p-4">Event Type</th>
              <th className="p-4">Entity Type</th>
              <th className="p-4">Entity ID</th>
              <th className="p-4">Source</th>
              <th className="p-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1f293d] text-xs text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">Connecting to telemetry stream...</td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">No events logged yet</td>
              </tr>
            ) : (
              events.map((evt) => (
                <tr key={evt.id} className="hover:bg-[#1f293d]/30 transition-colors">
                  <td className="p-4 font-mono font-semibold text-blue-400">{evt.event_type}</td>
                  <td className="p-4 capitalize">{evt.entity_type}</td>
                  <td className="p-4 font-mono text-slate-400">{evt.entity_id}</td>
                  <td className="p-4 text-slate-300">
                    <span className="px-2 py-1 rounded bg-[#0b0f17] border border-[#1f293d]">
                      {evt.source}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">{new Date(evt.event_timestamp).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
