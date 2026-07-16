import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BedDouble, Users, RefreshCw, Home } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';

interface OccupancyData {
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  occupancy_rate: number;
  rooms: RoomData[];
}

interface RoomData {
  room_number: string;
  resident_name: string | null;
  status: 'occupied' | 'available' | 'reserved' | 'maintenance';
  date_admitted: string | null;
}

export default function BedOccupancy() {
  const [data, setData] = useState<OccupancyData | null>(null);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [occRes, roomsRes] = await Promise.all([
        api.get('/bed-occupancy'),
        api.get('/bed-occupancy/rooms'),
      ]);
      setData(occRes.data);
      setRooms(roomsRes.data);
    } catch { toast.error('Failed to load occupancy data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const statusColor = (status: string) => {
    if (status === 'occupied') return 'bg-red-500/20 border-red-500/40 text-red-300';
    if (status === 'available') return 'bg-green-500/20 border-green-500/40 text-green-300';
    if (status === 'reserved') return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300';
    return 'bg-gray-500/20 border-gray-500/40 text-gray-400';
  };

  const occupancyPercent = data ? Math.round(data.occupancy_rate) : 0;
  const rateColor = occupancyPercent >= 90 ? 'text-red-400' : occupancyPercent >= 75 ? 'text-yellow-400' : 'text-green-400';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <BedDouble size={20} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Bed Occupancy</h1>
            <p className="text-sm text-gray-400">Real-time room and bed availability</p>
          </div>
        </div>
        <button onClick={fetchData} className="p-2 rounded-lg text-gray-400 hover:text-white" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Key metrics */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Beds', value: data.total_beds, color: 'text-white', icon: BedDouble },
            { label: 'Occupied', value: data.occupied_beds, color: 'text-red-400', icon: Users },
            { label: 'Available', value: data.available_beds, color: 'text-green-400', icon: Home },
            { label: 'Occupancy Rate', value: `${occupancyPercent}%`, color: rateColor, icon: BedDouble },
          ].map(m => (
            <div key={m.label} className="rounded-xl p-4" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
              <div className="text-xs text-gray-400 mt-1">{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Occupancy bar */}
      {data && (
        <div className="rounded-xl p-4" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Occupancy</span>
            <span className={`font-medium ${rateColor}`}>{occupancyPercent}%</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${occupancyPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ background: occupancyPercent >= 90 ? '#ef4444' : occupancyPercent >= 75 ? '#f59e0b' : '#22c55e' }} />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span><span>75%</span><span>90%</span><span>100%</span>
          </div>
        </div>
      )}

      {/* View toggle */}
      <div className="flex gap-2">
        {(['grid', 'list'] as const).map(m => (
          <button key={m} onClick={() => setViewMode(m)}
            className={`px-4 py-2 rounded-lg text-sm capitalize ${viewMode === m ? 'text-white' : 'text-gray-400'}`}
            style={{ background: viewMode === m ? '#e8b130' : 'rgba(255,255,255,0.06)' }}>
            {m} View
          </button>
        ))}
      </div>

      {/* Rooms */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-3">
          {rooms.map(r => (
            <div key={r.room_number}
              className={`p-3 rounded-xl border text-center cursor-default ${statusColor(r.status)}`}>
              <div className="text-lg font-bold">{r.room_number}</div>
              <div className="text-xs mt-1 truncate">{r.resident_name || r.status}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map(r => (
            <div key={r.room_number} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-white font-medium w-16">Room {r.room_number}</span>
              <span className={`px-2 py-0.5 rounded text-xs border capitalize ${statusColor(r.status)}`}>{r.status}</span>
              <span className="text-gray-400 text-sm flex-1">{r.resident_name || '—'}</span>
              {r.date_admitted && <span className="text-gray-500 text-xs">Admitted {r.date_admitted}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
        <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />Occupied</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />Available</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1" />Reserved</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-gray-500 mr-1" />Maintenance</span>
      </div>
    </div>
  );
}
