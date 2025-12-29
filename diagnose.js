
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnose() {
    console.log('--- DIAGNOSIS START ---')
    console.log('Checking Table Structure via information_schema...')

    // Check columns for 'companies'
    const { data: cols, error } = await supabase
        .from('information_schema.columns')
        .select('table_name, column_name, data_type')
        .eq('table_schema', 'public')
        .in('table_name', ['companies', 'bookings', 'visits'])

    // Note: accessing information_schema via PostgREST might be restricted.
    // If this fails, we'll try a raw insert and catch the detailed error.

    if (error) {
        console.log('Direct schema access failed (RLS/Permissions on info_schema):', error.message)
        console.log('Attempting functional probe...')
    } else {
        console.log('--- FOUND COLUMNS ---')
        cols.forEach(c => console.log(`${c.table_name}: ${c.column_name} (${c.data_type})`))
    }

    // Functional Probe: Companies
    console.log('\n--- PROBING COMPANIES ---')
    const compId = `probe-c-${Date.now()}`
    const { error: compError } = await supabase.from('companies').insert({
        id: compId,
        name: 'Probe Corp',
        // We purposefully omit legacy columns to test if constraints are dropped
        contact_email: 'probe@test.com'
    })
    if (compError) console.error('❌ Company Insert Failed:', compError.message, compError.details)
    else console.log('✅ Company Insert Succeeded')

    // Functional Probe: Bookings
    console.log('\n--- PROBING BOOKINGS ---')
    const { error: bookError } = await supabase.from('bookings').insert({
        id: `probe-b-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        start_time: '12:00',
        end_time: '13:00',
        booker_name: 'Probe Booker',
        branch_id: 'branch-1'
        // Omit legacy cols
    })
    if (bookError) console.error('❌ Booking Insert Failed:', bookError.message, bookError.details)
    else console.log('✅ Booking Insert Succeeded')

    // Functional Probe: Visits
    console.log('\n--- PROBING VISITS ---')
    const { error: visitError } = await supabase.from('visits').insert({
        id: `probe-v-${Date.now()}`,
        visitor_name: 'Probe Visitor',
        status: 'outstanding',
        date: new Date().toISOString().split('T')[0]
    })
    if (visitError) console.error('❌ Visit Insert Failed:', visitError.message, visitError.details)
    else console.log('✅ Visit Insert Succeeded')

    // Cleanup
    if (!compError) await supabase.from('companies').delete().eq('id', compId)
}

diagnose()
