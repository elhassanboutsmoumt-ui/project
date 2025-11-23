import { useState, useEffect } from 'react';
import { Users, FolderOpen, ClipboardCheck, DollarSign, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';
import { AgentManagement } from './components/AgentManagement';
import { ProjectManagement } from './components/ProjectManagement';
import { AttendanceTracking } from './components/AttendanceTracking';
import { PaymentReporting } from './components/PaymentReporting';
import { Login } from './components/Login';

type Tab = 'agents' | 'projects' | 'attendance' | 'payments';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('agents');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    } catch (err) {
      console.error('Auth check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
  };

  const tabs = [
    { id: 'agents' as Tab, label: 'Agents', icon: Users, color: 'blue' },
    { id: 'projects' as Tab, label: 'Projets', icon: FolderOpen, color: 'green' },
    { id: 'attendance' as Tab, label: 'Pointage', icon: ClipboardCheck, color: 'orange' },
    { id: 'payments' as Tab, label: 'Paiements', icon: DollarSign, color: 'teal' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Système de Gestion des Paiements
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Gestion des agents, projets, pointages et paiements
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut size={18} />
              Déconnexion
            </button>
          </div>

          <nav className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const colorClasses = {
                blue: isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-blue-600 hover:border-blue-300',
                green: isActive ? 'border-green-600 text-green-600' : 'border-transparent text-gray-600 hover:text-green-600 hover:border-green-300',
                orange: isActive ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-600 hover:text-orange-600 hover:border-orange-300',
                teal: isActive ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-600 hover:text-teal-600 hover:border-teal-300',
              };

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${colorClasses[tab.color]}`}
                >
                  <Icon size={20} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'agents' && <AgentManagement />}
        {activeTab === 'projects' && <ProjectManagement />}
        {activeTab === 'attendance' && <AttendanceTracking />}
        {activeTab === 'payments' && <PaymentReporting />}
      </main>
    </div>
  );
}

export default App;
