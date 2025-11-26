import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Agent, Project, Attendance } from '../types';
import { ClipboardCheck, Save, X, Calendar, Plus, Trash2 } from 'lucide-react';

interface AttendanceWithDetails extends Attendance {
  agents?: { full_name: string; employee_id: string };
  projects?: { name: string; code: string };
}

export function AttendanceTracking() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [attendances, setAttendances] = useState<AttendanceWithDetails[]>([]);
  const [editingRows, setEditingRows] = useState<{ [key: string]: Partial<Attendance> }>({});
  const [newRows, setNewRows] = useState<{ [key: string]: Partial<Attendance> }>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadAgents();
    loadProjects();
  }, []);

  useEffect(() => {
    loadAttendances();
  }, [selectedDate]);

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

  const loadAttendances = async () => {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        agents:agent_id(full_name, employee_id),
        projects:project_id(name, code)
      `)
      .eq('date', selectedDate)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading attendances:', error);
    } else {
      setAttendances(data || []);
      setEditingRows({});
    }
  };

  const addNewRows = (count: number = 1) => {
    const newRowsToAdd: { [key: string]: Partial<Attendance> } = {};
    for (let i = 0; i < count; i++) {
      const key = `new-${Date.now()}-${Math.random()}`;
      newRowsToAdd[key] = {
        agent_id: '',
        project_id: '',
        date: selectedDate,
        hours_worked: 8,
        daily_amount: 0,
        notes: '',
      };
    }
    setNewRows({ ...newRows, ...newRowsToAdd });
  };

  const updateNewRow = (key: string, field: string, value: any) => {
    const updatedRow = { ...newRows[key] };
    updatedRow[field] = value;

    if (field === 'agent_id' && value) {
      const agent = agents.find(a => a.id === value);
      if (agent) {
        updatedRow.daily_amount = agent.daily_rate;
      }
    }

    setNewRows({
      ...newRows,
      [key]: updatedRow,
    });
  };

  const updateExistingRow = (id: string, field: string, value: any) => {
    const updatedRow = { ...editingRows[id] };
    updatedRow[field] = value;

    if (field === 'agent_id' && value) {
      const agent = agents.find(a => a.id === value);
      if (agent) {
        updatedRow.daily_amount = agent.daily_rate;
      }
    }

    setEditingRows({
      ...editingRows,
      [id]: updatedRow,
    });
  };

  const deleteNewRow = (key: string) => {
    const { [key]: _, ...rest } = newRows;
    setNewRows(rest);
  };

  const handleDeleteExisting = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce pointage ?')) {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting attendance:', error);
      } else {
        loadAttendances();
      }
    }
  };

  const saveNewRows = async () => {
    const validRows = Object.entries(newRows)
      .filter(([_, data]) => data.agent_id && data.project_id && data.daily_amount)
      .map(([_, data]) => data);

    if (validRows.length === 0) {
      alert('Veuillez remplir Agent, Projet et Montant pour chaque ligne');
      return;
    }

    const { error } = await supabase
      .from('attendance')
      .insert(validRows);

    if (error) {
      console.error('Error saving attendances:', error);
      alert('Erreur: ' + error.message);
    } else {
      setNewRows({});
      loadAttendances();
    }
  };

  const saveExistingRows = async () => {
    const updates = Object.entries(editingRows)
      .filter(([_, data]) => Object.keys(data).length > 0)
      .map(([id, data]) => ({ id, ...data }));

    if (updates.length === 0) {
      alert('Aucune modification à enregistrer');
      return;
    }

    for (const update of updates) {
      const { id, ...data } = update;
      const { error } = await supabase
        .from('attendance')
        .update(data)
        .eq('id', id);

      if (error) {
        console.error('Error updating attendance:', error);
        alert('Erreur: ' + error.message);
        return;
      }
    }

    setEditingRows({});
    loadAttendances();
  };

  const hasNewRows = Object.keys(newRows).length > 0;
  const hasEdits = Object.keys(editingRows).length > 0;
  const totalAmount = attendances.reduce((sum, att) => sum + parseFloat(att.daily_amount.toString()), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Pointage Journalier</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-gray-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => addNewRows(1)}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus size={20} />
            Ajouter une Ligne
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md flex justify-between items-center">
        <div>
          <span className="text-sm text-gray-600">Total du jour: </span>
          <span className="text-xl font-bold text-orange-600">{totalAmount.toLocaleString()} DA</span>
        </div>
        {hasNewRows && (
          <button
            onClick={() => addNewRows(5)}
            className="flex items-center gap-2 text-sm px-3 py-1 border border-orange-300 text-orange-600 rounded hover:bg-orange-50 transition-colors"
          >
            <Plus size={16} />
            Ajouter 5 Lignes
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Agent *
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  Projet *
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Heures
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Montant *
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Notes
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {attendances.map((attendance) => (
                <tr key={attendance.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <select
                      value={editingRows[attendance.id]?.agent_id ?? attendance.agent_id}
                      onChange={(e) => updateExistingRow(attendance.id, 'agent_id', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Sélectionner</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.employee_id} - {agent.full_name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={editingRows[attendance.id]?.project_id ?? attendance.project_id}
                      onChange={(e) => updateExistingRow(attendance.id, 'project_id', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Sélectionner</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.code} - {project.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.5"
                      value={editingRows[attendance.id]?.hours_worked ?? attendance.hours_worked}
                      onChange={(e) => updateExistingRow(attendance.id, 'hours_worked', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={editingRows[attendance.id]?.daily_amount ?? attendance.daily_amount}
                      onChange={(e) => updateExistingRow(attendance.id, 'daily_amount', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={editingRows[attendance.id]?.notes ?? attendance.notes}
                      onChange={(e) => updateExistingRow(attendance.id, 'notes', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleDeleteExisting(attendance.id)}
                      className="text-red-600 hover:text-red-900 text-sm"
                    >
                      Suppr.
                    </button>
                  </td>
                </tr>
              ))}

              {Object.entries(newRows).map(([key, data]) => (
                <tr key={key} className="bg-orange-50 hover:bg-orange-100 border-b border-orange-200">
                  <td className="px-4 py-2">
                    <select
                      value={data.agent_id || ''}
                      onChange={(e) => updateNewRow(key, 'agent_id', e.target.value)}
                      className="w-full px-2 py-1 border border-orange-300 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Sélectionner</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.employee_id} - {agent.full_name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={data.project_id || ''}
                      onChange={(e) => updateNewRow(key, 'project_id', e.target.value)}
                      className="w-full px-2 py-1 border border-orange-300 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Sélectionner</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.code} - {project.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.5"
                      placeholder="8"
                      value={data.hours_worked || ''}
                      onChange={(e) => updateNewRow(key, 'hours_worked', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-orange-300 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={data.daily_amount || ''}
                      onChange={(e) => updateNewRow(key, 'daily_amount', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-orange-300 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      placeholder="Notes"
                      value={data.notes || ''}
                      onChange={(e) => updateNewRow(key, 'notes', e.target.value)}
                      className="w-full px-2 py-1 border border-orange-300 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => deleteNewRow(key)}
                      className="text-red-600 hover:text-red-900 text-sm"
                    >
                      Suppr.
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {attendances.length === 0 && hasNewRows === false && (
          <div className="text-center py-12 text-gray-500">
            Aucun pointage pour cette date
          </div>
        )}
      </div>

      {(hasNewRows || hasEdits) && (
        <div className="flex justify-end gap-2">
          {hasNewRows && (
            <button
              onClick={saveNewRows}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save size={18} />
              Enregistrer les Nouveaux Pointages
            </button>
          )}
          {hasEdits && (
            <button
              onClick={saveExistingRows}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save size={18} />
              Enregistrer les Modifications
            </button>
          )}
          {(hasNewRows || hasEdits) && (
            <button
              onClick={() => {
                setNewRows({});
                setEditingRows({});
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X size={18} />
              Annuler
            </button>
          )}
        </div>
      )}
    </div>
  );
}
