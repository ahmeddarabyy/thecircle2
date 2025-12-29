
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runVerification() {
    console.log('--- Starting Verification Flow ---')

    // 1. Create a Test Company
    const companyId = `comp-verify-${Date.now()}`
    const { error: compError } = await supabase.from('companies').insert({
        id: companyId,
        name: 'Verification Corp',
        // contact_email: 'test@verify.com' // Column might be missing in pre-existing table
    })
    if (compError) { console.error('Create Company Failed', compError); return }
    console.log('1. Company Created')

    // 2. Create a Test Booking
    const bookingId = `book-verify-${Date.now()}`
    const { error: bookError } = await supabase.from('bookings').insert({
        id: bookingId,
        date: new Date().toISOString().split('T')[0],
        start_time: '10:00:00',
        end_time: '12:00:00',
        resource_type: 'desk',
        booker_type: 'company',
        booker_id: companyId,
        booker_name: 'Verification Corp',
        status: 'confirmed',
        branch_id: 'branch-1' // Assuming branch-1 exists, or we might fail constraint
    })
    // Note: branch-1 needs to exist. If failing, we might need to fetch a branch first.
    if (bookError) {
        console.error('Create Booking Failed (make sure branch-1 exists or usage valid)', bookError)
        // Check branches
        const { data: branches } = await supabase.from('branches').select('id').limit(1)
        if (branches && branches.length > 0) {
            console.log('Retrying with branch', branches[0].id)
            await supabase.from('bookings').insert({
                id: bookingId,
                date: new Date().toISOString().split('T')[0],
                start_time: '10:00:00',
                end_time: '12:00:00',
                resource_type: 'desk',
                booker_type: 'company',
                booker_id: companyId,
                booker_name: 'Verification Corp',
                status: 'confirmed',
                branch_id: branches[0].id
            })
        } else {
            return
        }
    }
    console.log('2. Booking Created')

    // 3. Simulate Conversion (This logic mimics storage.ts convertBookingToVisit)
    // We can't import typescript storage.ts here directly easily without ts-node, 
    // so we replicate the logic to verify DB constraints/triggers/columns work.

    // A. Fetch Booking
    const { data: booking } = await supabase.from('bookings').select('*').eq('id', bookingId).single()
    if (!booking) { console.error('Booking not found!'); return }

    // B. Insert Visit
    const visitId = `visit-verify-${Date.now()}`
    const { error: visitError } = await supabase.from('visits').insert({
        id: visitId,
        date: new Date().toISOString().split('T')[0],
        check_in_time: new Date().toISOString(),
        visitor_type: booking.booker_type,
        visitor_id: booking.booker_id,
        visitor_name: booking.booker_name,
        booking_id: bookingId,
        branch_id: booking.branch_id,
        status: 'checked-in',
        payment_status: 'unpaid',
        total_amount: 0,
        paid_amount: 0
    })

    if (visitError) { console.error('Create Visit Failed', visitError); return }
    console.log('3. Visit Created from Booking')

    // C. Update Booking Status
    const { error: updateError } = await supabase.from('bookings').update({ status: 'converted_to_visit' }).eq('id', bookingId)
    if (updateError) { console.error('Update Booking Status Failed', updateError); return }
    console.log('4. Booking Status Updated to converted_to_visit')

    // 5. Verify Final State
    const { data: finalBooking } = await supabase.from('bookings').select('status').eq('id', bookingId).single()
    const { data: finalVisit } = await supabase.from('visits').select('status, booking_id').eq('id', visitId).single()

    if (finalBooking.status === 'converted_to_visit' && finalVisit.booking_id === bookingId) {
        console.log('✅ SUCCESS: Full flow verified!')
    } else {
        console.error('❌ FAILURE: State mismatch', { finalBooking, finalVisit })
    }

    // Cleanup
    await supabase.from('visits').delete().eq('id', visitId)
    await supabase.from('bookings').delete().eq('id', bookingId)
    await supabase.from('companies').delete().eq('id', companyId)
    console.log('Cleanup Complete')
}

runVerification()
