import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Agent, Project, Attendance } from '../types';
import { Calendar, Save, X } from 'lucide-react';

export function AttendanceTracking() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<{ [agentId: string]: Partial<Attendance> }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAgents();
    loadProjects();
  }, []);

  useEffect(() => {
    initializeAttendanceData();
  }, [agents, selectedDate]);

  const loadAgents = async () => {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('active', true)
      .order('full_name');

    if (error) {
      console.error('Error loading agents:', error);
    } else {
      setAgents(data || []);
    }
  };

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('active', true)
      .order('name');

    if (error) {
      console.error('Error loading projects:', error);
    } else {
      setProjects(data || []);
    }
  };

  const initializeAttendanceData = async () => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', selectedDate);

    if (error) {
      console.error('Error loading attendance:', error);
      return;
    }

    const attendanceMap: { [agentId: string]: Partial<Attendance> } = {};

    agents.forEach(agent => {
      const existing = data?.find(a => a.agent_id === agent.id);
      if (existing) {
        attendanceMap[agent.id] = {
          id: existing.id,
          agent_id: agent.id,
          project_id: existing.project_id,
          date: existing.date,
          hours_worked: existing.hours_worked,
          daily_amount: existing.daily_amount,
          notes: existing.notes,
        };
      } else {
        attendanceMap[agent.id] = {
          agent_id: agent.id,
          project_id: '',
          date: selectedDate,
          hours_worked: 8,
          daily_amount: 0,
          notes: '',
        };
      }
    });

    setAttendanceData(attendanceMap);
  };

  const updateAttendanceData = (agentId: string, field: string, value: any) => {
    const agent = agents.find(a => a.id === agentId);
    const updatedData = { ...attendanceData[agentId] };
    updatedData[field] = value;

    if (field === 'project_id') {
      if (value === 'ABSENT') {
        updatedData.project_id = '';
        updatedData.daily_amount = 0;
      } else if (value) {
        updatedData.daily_amount = agent?.daily_rate || 0;
      }
    }

    setAttendanceData({
      ...attendanceData,
      [agentId]: updatedData,
    });
  };

  const saveAllAttendance = async () => {
    setLoading(true);

    const toInsert: Partial<Attendance>[] = [];
    const toUpdate: { id: string; data: Partial<Attendance> }[] = [];

    Object.entries(attendanceData).forEach(([agentId, data]) => {
      if (data.project_id) {
        if (data.id) {
          toUpdate.push({
            id: data.id,
            data: {
              project_id: data.project_id,
              hours_worked: data.hours_worked,
              daily_amount: data.daily_amount,
              notes: data.notes,
            },
          });
        } else {
          toInsert.push({
            agent_id: agentId,
            project_id: data.project_id,
            date: selectedDate,
            hours_worked: data.hours_worked,
            daily_amount: data.daily_amount,
            notes: data.notes,
          });
        }
      }
    });

    try {
      if (toInsert.length > 0) {
        const { error } = await supabase
          .from('attendance')
          .insert(toInsert);

        if (error) throw error;
      }

      for (const update of toUpdate) {
        const { id, data } = update;
        const { error } = await supabase
          .from('attendance')
          .update(data)
          .eq('id', id);

        if (error) throw error;
      }

      alert(`Pointage sauvegardé: ${toInsert.length} nouveau(x) et ${toUpdate.length} modifié(s)`);
      initializeAttendanceData();
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = Object.values(attendanceData)
    .filter(data => data.project_id)
    .reduce((sum, data) => sum + parseFloat((data.daily_amount || 0).toString()), 0);

  const filledRows = Object.values(attendanceData).filter(data => data.project_id).length;
  const absentCount = agents.length - filledRows;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Pointage Journalier</h2>
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-gray-600" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <p className="text-sm text-gray-600">Total du jour</p>
          <p className="text-3xl font-bold text-orange-600">{totalAmount.toLocaleString()} DA</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md">
          <p className="text-sm text-gray-600">Présents</p>
          <p className="text-3xl font-bold text-green-600">{filledRows}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md">
          <p className="text-sm text-gray-600">Absents</p>
          <p className="text-3xl font-bold text-red-600">{absentCount}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md">
          <p className="text-sm text-gray-600">Progression</p>
          <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
            <div
              className="bg-orange-600 h-3 rounded-full transition-all"
              style={{ width: `${agents.length > 0 ? (filledRows / agents.length) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Matricule
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Agent
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  Projet *
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Heures
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Montant
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {agents.map((agent) => {
                const data = attendanceData[agent.id];
                const hasProject = !!data?.project_id;
                return (
                  <tr
                    key={agent.id}
                    className={`hover:bg-gray-50 transition-colors ${hasProject ? 'bg-orange-50' : 'bg-red-50'}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{agent.employee_id}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{agent.full_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={data?.project_id || 'ABSENT'}
                        onChange={(e) => updateAttendanceData(agent.id, 'project_id', e.target.value)}
                        className={`w-full px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-transparent ${
                          hasProject
                            ? 'border-green-300 bg-white'
                            : 'border-red-300 bg-white'
                        }`}
                      >
                        <option value="ABSENT">ABSENT</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.code} - {project.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.5"
                        value={data?.hours_worked || ''}
                        onChange={(e) =>
                          updateAttendanceData(agent.id, 'hours_worked', parseFloat(e.target.value) || 0)
                        }
                        disabled={!data?.project_id}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        value={data?.project_id ? (data?.daily_amount || '') : ''}
                        onChange={(e) =>
                          updateAttendanceData(agent.id, 'daily_amount', parseFloat(e.target.value) || 0)
                        }
                        disabled={!data?.project_id}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed font-semibold"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        placeholder="Notes optionnelles"
                        value={data?.notes || ''}
                        onChange={(e) => updateAttendanceData(agent.id, 'notes', e.target.value)}
                        disabled={!data?.project_id}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {agents.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Aucun agent actif disponible
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={() => initializeAttendanceData()}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <X size={18} />
          Réinitialiser
        </button>
        <button
          onClick={saveAllAttendance}
          disabled={loading || filledRows === 0}
          className="flex items-center gap-2 bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Save size={18} />
          {loading ? 'Enregistrement...' : 'Enregistrer le Pointage'}
        </button>
      </div>
    </div>
  );
}
