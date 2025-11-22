import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Agent, Project, Attendance } from '../types';
import { ClipboardCheck, Save, X, Calendar } from 'lucide-react';

interface AttendanceWithDetails extends Attendance {
  agents?: { full_name: string; employee_id: string };
  projects?: { name: string; code: string };
}

export function AttendanceTracking() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [attendances, setAttendances] = useState<AttendanceWithDetails[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState({
    agent_id: '',
    project_id: '',
    date: new Date().toISOString().split('T')[0],
    hours_worked: 8,
    daily_amount: 0,
    notes: '',
  });

  useEffect(() => {
    loadAgents();
    loadProjects();
  }, []);

  useEffect(() => {
    loadAttendances();
  }, [selectedDate]);

  useEffect(() => {
    if (formData.agent_id) {
      const agent = agents.find(a => a.id === formData.agent_id);
      if (agent) {
        setFormData(prev => ({
          ...prev,
          daily_amount: agent.daily_rate,
        }));
      }
    }
  }, [formData.agent_id, agents]);

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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from('attendance')
      .insert([formData]);

    if (error) {
      console.error('Error adding attendance:', error);
      alert('Erreur: ' + error.message);
    } else {
      setIsAdding(false);
      resetForm();
      loadAttendances();
    }
  };

  const handleDelete = async (id: string) => {
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

  const resetForm = () => {
    setFormData({
      agent_id: '',
      project_id: '',
      date: new Date().toISOString().split('T')[0],
      hours_worked: 8,
      daily_amount: 0,
      notes: '',
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    resetForm();
  };

  const totalAmount = attendances.reduce((sum, att) => sum + parseFloat(att.daily_amount.toString()), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Pointage Journalier</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-gray-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              <ClipboardCheck size={20} />
              Ajouter un Pointage
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agent *
              </label>
              <select
                required
                value={formData.agent_id}
                onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Sélectionner un agent</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.employee_id} - {agent.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Projet *
              </label>
              <select
                required
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Sélectionner un projet</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Heures Travaillées *
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={formData.hours_worked}
                onChange={(e) => setFormData({ ...formData, hours_worked: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant Journalier (DA) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.daily_amount}
                onChange={(e) => setFormData({ ...formData, daily_amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X size={18} />
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Save size={18} />
              Enregistrer
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="text-right">
          <span className="text-sm text-gray-600">Total du jour: </span>
          <span className="text-xl font-bold text-orange-600">{totalAmount.toLocaleString()} DA</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Matricule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Heures
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendances.map((attendance) => (
                <tr key={attendance.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {attendance.agents?.employee_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attendance.agents?.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attendance.projects?.code} - {attendance.projects?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attendance.hours_worked}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {parseFloat(attendance.daily_amount.toString()).toLocaleString()} DA
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {attendance.notes}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(attendance.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {attendances.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Aucun pointage pour cette date
          </div>
        )}
      </div>
    </div>
  );
}
