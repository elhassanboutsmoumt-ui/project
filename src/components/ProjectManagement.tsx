import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Project } from '../types';
import { Save, X, Plus } from 'lucide-react';

export function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingRows, setEditingRows] = useState<{ [key: string]: Partial<Project> }>({});
  const [newRows, setNewRows] = useState<{ [key: string]: Partial<Project> }>({});

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading projects:', error);
    } else {
      setProjects(data || []);
    }
  };

  const addNewRow = () => {
    const key = `new-${Date.now()}-${Math.random()}`;
    const today = new Date().toISOString().split('T')[0];
    setNewRows({
      ...newRows,
      [key]: {
        name: '',
        code: '',
        description: '',
        start_date: today,
        end_date: null,
        budget: 0,
        active: true,
      },
    });
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
      .filter(([_, data]) => data.name && data.code)
      .map(([_, data]) => data);

    if (validRows.length === 0) {
      alert('Veuillez remplir au moins Nom et Code pour chaque ligne');
      return;
    }

    const { error } = await supabase
      .from('projects')
      .insert(validRows);

    if (error) {
      console.error('Error saving projects:', error);
      alert('Erreur: ' + error.message);
    } else {
      setNewRows({});
      loadProjects();
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
        .from('projects')
        .update(data)
        .eq('id', id);

      if (error) {
        console.error('Error updating project:', error);
        alert('Erreur: ' + error.message);
        return;
      }
    }

    setEditingRows({});
    loadProjects();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting project:', error);
      } else {
        loadProjects();
      }
    }
  };

  const hasNewRows = Object.keys(newRows).length > 0;
  const hasEdits = Object.keys(editingRows).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Gestion des Projets</h2>
        <button
          onClick={addNewRow}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Code *
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  Nom *
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Début
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Fin
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Budget
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Actif
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={editingRows[project.id]?.code ?? project.code}
                      onChange={(e) => updateExistingRow(project.id, 'code', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={editingRows[project.id]?.name ?? project.name}
                      onChange={(e) => updateExistingRow(project.id, 'name', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={editingRows[project.id]?.description ?? project.description}
                      onChange={(e) => updateExistingRow(project.id, 'description', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="date"
                      value={editingRows[project.id]?.start_date ?? project.start_date}
                      onChange={(e) => updateExistingRow(project.id, 'start_date', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="date"
                      value={editingRows[project.id]?.end_date ?? project.end_date ?? ''}
                      onChange={(e) => updateExistingRow(project.id, 'end_date', e.target.value || null)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={editingRows[project.id]?.budget ?? project.budget}
                      onChange={(e) => updateExistingRow(project.id, 'budget', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={editingRows[project.id]?.active ?? project.active}
                      onChange={(e) => updateExistingRow(project.id, 'active', e.target.checked)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="text-red-600 hover:text-red-900 text-sm"
                    >
                      Suppr.
                    </button>
                  </td>
                </tr>
              ))}

              {Object.entries(newRows).map(([key, data]) => (
                <tr key={key} className="bg-green-50 hover:bg-green-100 border-b border-green-200">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      placeholder="Ex: PROJ001"
                      value={data.code || ''}
                      onChange={(e) => updateNewRow(key, 'code', e.target.value)}
                      className="w-full px-2 py-1 border border-green-300 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      placeholder="Ex: Projet A"
                      value={data.name || ''}
                      onChange={(e) => updateNewRow(key, 'name', e.target.value)}
                      className="w-full px-2 py-1 border border-green-300 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      placeholder="Description"
                      value={data.description || ''}
                      onChange={(e) => updateNewRow(key, 'description', e.target.value)}
                      className="w-full px-2 py-1 border border-green-300 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="date"
                      value={data.start_date || ''}
                      onChange={(e) => updateNewRow(key, 'start_date', e.target.value)}
                      className="w-full px-2 py-1 border border-green-300 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="date"
                      value={data.end_date || ''}
                      onChange={(e) => updateNewRow(key, 'end_date', e.target.value || null)}
                      className="w-full px-2 py-1 border border-green-300 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={data.budget || ''}
                      onChange={(e) => updateNewRow(key, 'budget', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-green-300 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={data.active ?? true}
                      onChange={(e) => updateNewRow(key, 'active', e.target.checked)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
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

        {projects.length === 0 && hasNewRows === false && (
          <div className="text-center py-12 text-gray-500">
            Aucun projet enregistré
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
              Enregistrer les Nouveaux Projets
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
