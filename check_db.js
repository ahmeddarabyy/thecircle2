// Comprehensive diagnostic script to check Supabase connection and tables
// Run with: node check_db.js

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Checking Supabase Configuration...\n');
console.log('URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('\n❌ Missing environment variables in .env!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tablesToCheck = [
    'branches',
    'users',
    'companies',
    'members',
    'inventory_items',
    'services',
    'rooms',
    'bookings',
    'expenses',
    'transactions',
    'transaction_items',
    'invoices',
    'contracts',
    'room_reservations'
];

console.log('\n📊 Testing Database Table Access...\n');

for (const table of tablesToCheck) {
    const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error(`❌ ${table.padEnd(20)} Error: ${error.message} (${error.code})`);
    } else {
        console.log(`✅ ${table.padEnd(20)} Accessible`);
    }
}

console.log('\n🔍 Checking for initial data...');
const { data: users, error: usersError } = await supabase.from('users').select('username').limit(1);
if (users && users.length > 0) {
    console.log(`✅ Found users (Login should work)`);
} else {
    console.log(`⚠️  No users found. Did you run the seed part of the SQL?`);
}

const { data: branches, error: branchesError } = await supabase.from('branches').select('name').limit(1);
if (branches && branches.length > 0) {
    console.log(`✅ Found branches (App needs at least one branch)`);
} else {
    console.log(`⚠️  No branches found. The app requires at least one active branch.`);
}

console.log('\n✅ Diagnostic complete!');
