// Script to create a default admin user in Supabase
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createDefaultUser() {
  const user = {
    id: 'u-admin-1',
    username: 'admin',
    password: 'password',
    role: 'admin',
    full_name: 'Admin User'
  }

  console.log('Creating user:', user.username)
  
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: user.id,
      username: user.username,
      password: user.password,
      role: user.role,
      full_name: user.full_name
    })
    .select()

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      console.log('User already exists!')
    } else {
      console.error('Error creating user:', error)
    }
  } else {
    console.log('User created successfully:', data)
  }
}

createDefaultUser()

