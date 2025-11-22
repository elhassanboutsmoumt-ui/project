/*
  # Payroll Management System Schema

  ## Overview
  This migration creates a complete payroll management system for tracking agents, projects, daily attendance, and payments.

  ## 1. New Tables

  ### `agents` table
  - `id` (uuid, primary key) - Unique identifier for each agent
  - `full_name` (text) - Agent's full name
  - `employee_id` (text, unique) - Employee identification number
  - `daily_rate` (numeric) - Daily salary rate
  - `monthly_rate` (numeric) - Monthly salary rate (optional)
  - `payment_type` (text) - Type of payment: 'daily' or 'monthly'
  - `phone` (text) - Contact phone number
  - `email` (text) - Email address
  - `active` (boolean) - Whether the agent is currently active
  - `created_at` (timestamptz) - Record creation timestamp

  ### `projects` table
  - `id` (uuid, primary key) - Unique identifier for each project
  - `name` (text) - Project name
  - `code` (text, unique) - Project code
  - `description` (text) - Project description
  - `start_date` (date) - Project start date
  - `end_date` (date) - Project end date (nullable)
  - `budget` (numeric) - Project budget
  - `active` (boolean) - Whether the project is currently active
  - `created_at` (timestamptz) - Record creation timestamp

  ### `attendance` table
  - `id` (uuid, primary key) - Unique identifier for each attendance record
  - `agent_id` (uuid, foreign key) - Reference to agent
  - `project_id` (uuid, foreign key) - Reference to project
  - `date` (date) - Attendance date
  - `hours_worked` (numeric) - Number of hours worked
  - `daily_amount` (numeric) - Amount to be paid for this day
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz) - Record creation timestamp

  ### `payments` table
  - `id` (uuid, primary key) - Unique identifier for each payment
  - `agent_id` (uuid, foreign key) - Reference to agent
  - `project_id` (uuid, foreign key) - Reference to project (nullable)
  - `period_start` (date) - Payment period start date
  - `period_end` (date) - Payment period end date
  - `total_amount` (numeric) - Total payment amount
  - `payment_date` (date) - Actual payment date
  - `payment_method` (text) - Payment method (cash, bank transfer, etc.)
  - `status` (text) - Payment status (pending, paid, cancelled)
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz) - Record creation timestamp

  ## 2. Security
  - Enable RLS on all tables
  - Add policies for authenticated users to manage all records
  
  ## 3. Important Notes
  - Each attendance record links an agent to a project for a specific date
  - Payments can be calculated from attendance records
  - Agents can have daily or monthly payment types
  - All monetary values use numeric type for precision
*/

CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  employee_id text UNIQUE NOT NULL,
  daily_rate numeric(10,2) DEFAULT 0,
  monthly_rate numeric(10,2) DEFAULT 0,
  payment_type text NOT NULL DEFAULT 'daily' CHECK (payment_type IN ('daily', 'monthly')),
  phone text DEFAULT '',
  email text DEFAULT '',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text DEFAULT '',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  budget numeric(12,2) DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  hours_worked numeric(4,2) DEFAULT 8,
  daily_amount numeric(10,2) NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, project_id, date)
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_amount numeric(12,2) NOT NULL,
  payment_date date DEFAULT CURRENT_DATE,
  payment_method text DEFAULT 'bank_transfer',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_agent_date ON attendance(agent_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_project_date ON attendance(project_id, date);
CREATE INDEX IF NOT EXISTS idx_payments_agent ON payments(agent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view agents"
  ON agents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert agents"
  ON agents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update agents"
  ON agents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete agents"
  ON agents FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to view projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to view attendance"
  ON attendance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert attendance"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update attendance"
  ON attendance FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete attendance"
  ON attendance FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete payments"
  ON payments FOR DELETE
  TO authenticated
  USING (true);