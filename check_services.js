import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkServices() {
    const { data, error } = await supabase.from('services').select('*');
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('--- Services in DB ---');
    data.forEach(s => {
        console.log(`- ${s.name}: Price=${s.price} (${typeof s.price}), Type=${s.type}, MemberAccess=${s.available_for_members}`);
    });
}

checkServices();
