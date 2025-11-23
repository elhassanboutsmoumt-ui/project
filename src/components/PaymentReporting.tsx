import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Agent, Project, Payment } from '../types';
import { DollarSign, FileText, Download, Send } from 'lucide-react';

interface PaymentSummary {
  agent_id: string;
  agent_name: string;
  employee_id: string;
  project_id: string;
  project_name: string;
  project_code: string;
  total_days: number;
  total_hours: number;
  total_amount: number;
  selected?: boolean;
}

export function PaymentReporting() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [summaries, setSummaries] = useState<PaymentSummary[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [generatingPayments, setGeneratingPayments] = useState(false);

  useEffect(() => {
    loadAgents();
    loadProjects();
  }, []);

  useEffect(() => {
    loadPaymentSummary();
  }, [selectedAgent, selectedProject, startDate, endDate]);

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

  const loadPaymentSummary = async () => {
    let query = supabase
      .from('attendance')
      .select(`
        agent_id,
        project_id,
        hours_worked,
        daily_amount,
        agents:agent_id(full_name, employee_id),
        projects:project_id(name, code)
      `)
      .gte('date', startDate)
      .lte('date', endDate);

    if (selectedAgent) {
      query = query.eq('agent_id', selectedAgent);
    }

    if (selectedProject) {
      query = query.eq('project_id', selectedProject);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading payment summary:', error);
      return;
    }

    const summaryMap = new Map<string, PaymentSummary>();

    data?.forEach((record: any) => {
      const key = `${record.agent_id}-${record.project_id}`;

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          agent_id: record.agent_id,
          agent_name: record.agents?.full_name || '',
          employee_id: record.agents?.employee_id || '',
          project_id: record.project_id,
          project_name: record.projects?.name || '',
          project_code: record.projects?.code || '',
          total_days: 0,
          total_hours: 0,
          total_amount: 0,
          selected: false,
        });
      }

      const summary = summaryMap.get(key)!;
      summary.total_days += 1;
      summary.total_hours += parseFloat(record.hours_worked.toString());
      summary.total_amount += parseFloat(record.daily_amount.toString());
    });

    setSummaries(Array.from(summaryMap.values()));
    setSelectedRows(new Set());
  };

  const toggleRowSelection = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedRows.size === summaries.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(summaries.map((_, i) => i)));
    }
  };

  const generatePayments = async () => {
    if (selectedRows.size === 0) {
      alert('Veuillez sélectionner au moins une ligne');
      return;
    }

    setGeneratingPayments(true);

    const selectedSummaries = summaries.filter((_, i) => selectedRows.has(i));
    const payments: Partial<Payment>[] = selectedSummaries.map(summary => ({
      agent_id: summary.agent_id,
      project_id: summary.project_id,
      period_start: startDate,
      period_end: endDate,
      total_amount: summary.total_amount,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: paymentMethod,
      status: 'pending',
      notes: `${summary.total_days} jours de travail - ${summary.project_code}`,
    }));

    const { error } = await supabase
      .from('payments')
      .insert(payments);

    if (error) {
      console.error('Error generating payments:', error);
      alert('Erreur: ' + error.message);
    } else {
      alert(`${payments.length} paiement(s) généré(s) avec succès !`);
      setSelectedRows(new Set());
    }

    setGeneratingPayments(false);
  };

  const totalGlobal = summaries.reduce((sum, s) => sum + s.total_amount, 0);
  const selectedTotal = summaries
    .filter((_, i) => selectedRows.has(i))
    .reduce((sum, s) => sum + s.total_amount, 0);

  const exportToCSV = () => {
    const headers = ['Matricule', 'Agent', 'Projet', 'Jours', 'Heures', 'Montant Total (DA)'];
    const rows = summaries.map(s => [
      s.employee_id,
      s.agent_name,
      `${s.project_code} - ${s.project_name}`,
      s.total_days.toString(),
      s.total_hours.toString(),
      s.total_amount.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
      '',
      `Total Global,,,,,${totalGlobal.toFixed(2)}`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `paiements_${startDate}_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Rapports de Paiement</h2>
        <button
          onClick={exportToCSV}
          disabled={summaries.length === 0}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Download size={20} />
          Exporter CSV
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de Début
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de Fin
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filtrer par Agent
            </label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="">Tous les agents</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.employee_id} - {agent.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filtrer par Projet
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="">Tous les projets</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} - {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-100 rounded-lg">
              <DollarSign size={24} className="text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Général</p>
              <p className="text-2xl font-bold text-gray-800">{totalGlobal.toLocaleString()} DA</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Nombre de Lignes</p>
              <p className="text-2xl font-bold text-gray-800">{summaries.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <FileText size={24} className="text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Sélectionnées</p>
              <p className="text-2xl font-bold text-gray-800">{selectedRows.size}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Montant Sélectionné</p>
              <p className="text-2xl font-bold text-gray-800">{selectedTotal.toLocaleString()} DA</p>
            </div>
          </div>
        </div>
      </div>

      {selectedRows.size > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-orange-500 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800">{selectedRows.size} ligne(s) sélectionnée(s)</p>
            <p className="text-sm text-gray-600">Montant: {selectedTotal.toLocaleString()} DA</p>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Méthode de Paiement
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="bank_transfer">Virement Bancaire</option>
                <option value="cash">Espèces</option>
                <option value="check">Chèque</option>
              </select>
            </div>
            <button
              onClick={generatePayments}
              disabled={generatingPayments}
              className="flex items-center gap-2 bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed h-fit"
            >
              <Send size={18} />
              Générer les Paiements
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === summaries.length && summaries.length > 0}
                    onChange={toggleAllSelection}
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Matricule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projet
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jours
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Heures
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {summaries.map((summary, index) => (
                <tr
                  key={index}
                  className={`hover:bg-gray-50 ${selectedRows.has(index) ? 'bg-orange-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(index)}
                      onChange={() => toggleRowSelection(index)}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {summary.employee_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {summary.agent_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {summary.project_code} - {summary.project_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {summary.total_days}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {summary.total_hours.toFixed(2)}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                    {summary.total_amount.toLocaleString()} DA
                  </td>
                </tr>
              ))}
              {summaries.length > 0 && (
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={6} className="px-6 py-4 text-right text-sm text-gray-900">
                    TOTAL GÉNÉRAL
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {totalGlobal.toLocaleString()} DA
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {summaries.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Aucune donnée pour la période sélectionnée
          </div>
        )}
      </div>
    </div>
  );
}
