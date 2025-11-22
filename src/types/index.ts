export interface Agent {
  id: string;
  full_name: string;
  employee_id: string;
  daily_rate: number;
  monthly_rate: number;
  payment_type: 'daily' | 'monthly';
  phone: string;
  email: string;
  active: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description: string;
  start_date: string;
  end_date: string | null;
  budget: number;
  active: boolean;
  created_at: string;
}

export interface Attendance {
  id: string;
  agent_id: string;
  project_id: string;
  date: string;
  hours_worked: number;
  daily_amount: number;
  notes: string;
  created_at: string;
}

export interface Payment {
  id: string;
  agent_id: string;
  project_id: string | null;
  period_start: string;
  period_end: string;
  total_amount: number;
  payment_date: string;
  payment_method: string;
  status: 'pending' | 'paid' | 'cancelled';
  notes: string;
  created_at: string;
}
