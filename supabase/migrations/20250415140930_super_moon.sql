/*
  # Initial schema setup for L&T Finance application

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `phone` (text, unique)
      - `email` (text)
      - `name` (text)
      - `company_id` (uuid, foreign key)
      - `created_at` (timestamp)
      
    - `companies`
      - `id` (uuid, primary key)
      - `name` (text)
      - `tagline` (text)
      - `logo_url` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  email text,
  name text,
  company_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  tagline text,
  logo_url text,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE users
  ADD CONSTRAINT fk_company
  FOREIGN KEY (company_id)
  REFERENCES companies(id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read company data"
  ON companies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update associated company"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (id IN (
    SELECT company_id 
    FROM users 
    WHERE users.id = auth.uid()
  ));