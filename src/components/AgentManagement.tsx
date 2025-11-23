import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Agent } from '../types';
import { UserPlus, Trash2, Save, X, Plus } from 'lucide-react';

export function AgentManagement() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [editingRows, setEditingRows] = useState<{ [key: string]: Partial<Agent> }>({});
  const [newRows, setNewRows] = useState<{ [key: string]: Partial<Agent> }>({});
  const [newRowCount, setNewRowCount] = useState(0);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('full_name');

    if (error) {
      console.error('Error loading agents:', error);
    } else {
      setAgents(data || []);
    }
  };

  const addNewRow = () => {
    const key = `new-${Date.now()}-${Math.random()}`;
    setNewRows({
      ...newRows,
      [key]: {
        full_name: '',
        employee_id: '',
        daily_rate: 0,
        monthly_rate: 0,
        payment_type: 'daily',
        phone: '',
        email: '',
        active: true,
      },
    });
    setNewRowCount(newRowCount + 1);
  };

  const updateNewRow = (key: string, field: string, value: any) => {
    setNewRows({
      ...newRows,
      [key]: { ...newRows[key], [field]: value },
    });
  };

  const updateExistingRow = (id: string, field: string, value: any) => {
    setEditingRows({
      ...editingRows,
      [id]: { ...editingRows[id], [field]: value },
    });
  };

  const deleteNewRow = (key: string) => {
    const { [key]: _, ...rest } = newRows;
    setNewRows(rest);
  };

  const saveNewRows = async () => {
    const validRows = Object.entries(newRows)
      .filter(([_, data]) => data.full_name && data.employee_id)
      .map(([_, data]) => data);

    if (validRows.length === 0) {
      alert('Veuillez remplir au moins Nom et Matricule pour chaque ligne');
      return;
    }

    const { error } = await supabase
      .from('agents')
      .insert(validRows);

    if (error) {
      console.error('Error saving agents:', error);
      alert('Erreur: ' + error.message);
    } else {
      setNewRows({});
      loadAgents();
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
        .from('agents')
        .update(data)
        .eq('id', id);

      if (error) {
        console.error('Error updating agent:', error);
        alert('Erreur: ' + error.message);
        return;
      }
    }

    setEditingRows({});
    loadAgents();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet agent ?')) {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting agent:', error);
      } else {
        loadAgents();
      }
    }
  };

  const hasNewRows = Object.keys(newRows).length > 0;
  const hasEdits = Object.keys(editingRows).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Gestion des Agents</h2>
        <button
          onClick={addNewRow}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Ajouter une Ligne
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Matricule *
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Nom *
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  Taux Jour
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  Taux Mois
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Téléphone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Actif
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={editingRows[agent.id]?.employee_id ?? agent.employee_id}
                      onChange={(e) => updateExistingRow(agent.id, 'employee_id', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={editingRows[agent.id]?.full_name ?? agent.full_name}
                      onChange={(e) => updateExistingRow(agent.id, 'full_name', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={editingRows[agent.id]?.payment_type ?? agent.payment_type}
                      onChange={(e) => updateExistingRow(agent.id, 'payment_type', e.target.value as 'daily' | 'monthly')}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="daily">Journalier</option>
                      <option value="monthly">Mensuel</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={editingRows[agent.id]?.daily_rate ?? agent.daily_rate}
                      onChange={(e) => updateExistingRow(agent.id, 'daily_rate', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={editingRows[agent.id]?.monthly_rate ?? agent.monthly_rate}
                      onChange={(e) => updateExistingRow(agent.id, 'monthly_rate', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={editingRows[agent.id]?.phone ?? agent.phone}
                      onChange={(e) => updateExistingRow(agent.id, 'phone', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={editingRows[agent.id]?.active ?? agent.active}
                      onChange={(e) => updateExistingRow(agent.id, 'active', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleDelete(agent.id)}
                      className="text-red-600 hover:text-red-900 text-sm"
                    >
                      Suppr.
                    </button>
                  </td>
                </tr>
              ))}

              {Object.entries(newRows).map(([key, data]) => (
                <tr key={key} className="bg-blue-50 hover:bg-blue-100 border-b border-blue-200">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      placeholder="Ex: EMP001"
                      value={data.employee_id || ''}
                      onChange={(e) => updateNewRow(key, 'employee_id', e.target.value)}
                      className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      placeholder="Ex: Ahmed"
                      value={data.full_name || ''}
                      onChange={(e) => updateNewRow(key, 'full_name', e.target.value)}
                      className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={data.payment_type || 'daily'}
                      onChange={(e) => updateNewRow(key, 'payment_type', e.target.value as 'daily' | 'monthly')}
                      className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="daily">Journalier</option>
                      <option value="monthly">Mensuel</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={data.daily_rate || ''}
                      onChange={(e) => updateNewRow(key, 'daily_rate', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={data.monthly_rate || ''}
                      onChange={(e) => updateNewRow(key, 'monthly_rate', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      placeholder="0123456789"
                      value={data.phone || ''}
                      onChange={(e) => updateNewRow(key, 'phone', e.target.value)}
                      className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={data.active ?? true}
                      onChange={(e) => updateNewRow(key, 'active', e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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

        {agents.length === 0 && hasNewRows === false && (
          <div className="text-center py-12 text-gray-500">
            Aucun agent enregistré
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
              Enregistrer les Nouveaux Agents
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
