
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verifyBookings() {
    console.log('Verifying bookings table...')

    // 1. Check if table exists and has entries
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

    if (error) {
        console.error('Error fetching bookings:', error)
        return
    }

    console.log(`Found ${bookings.length} bookings.`)
    if (bookings.length > 0) {
        console.log('Last booking:', bookings[0])
    } else {
        console.log('No bookings found yet. Try creating one in the app!')
    }
}

async function verify() {
    // 1. Try to read
    const { data, error } = await supabase
        .from('bookings')
        .select('*')

    if (error) {
        console.error('Error fetching bookings:', error)
    } else {
        console.log(`Found ${data.length} bookings.`)
        if (data.length > 0) {
            console.log('Last booking:', data[data.length - 1])
        }
    }

    // 2. Try to insert a test booking with minimal fields to check columns
    const testBooking = {
        id: `test-${Date.now()}`,
        visitor_name: 'Test Visitor',
        expected_start_time: new Date().toISOString(),
        // expected_end_time: new Date(Date.now() + 3600000).toISOString(), // Commented out to check if this was the only one
        status: 'confirmed',
        branch_id: 'branch-001' // Assuming this exists or is nullable/not foreign key constrained yet?
    }

    console.log('Attempting to insert test booking...')
    const { data: insertData, error: insertError } = await supabase
        .from('bookings')
        .insert(testBooking)
        .select()

    if (insertError) {
        console.error('Error inserting booking:', insertError)
    } else {
        console.log('Successfully inserted booking:', insertData)
    }
}

verify()
