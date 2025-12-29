// Test script to directly test contract insertion
// Copy this into browser console while on contracts page

(async function testDirectInsert() {
  console.log('=== DIRECT INSERT TEST ===')
  
  // Get Supabase client from the app
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  
  console.log('Supabase URL:', supabaseUrl ? 'SET' : 'MISSING')
  console.log('Supabase Key:', supabaseKey ? 'SET' : 'MISSING')
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials!')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  // Test data - replace with actual IDs from your database
  const testData = {
    id: 'test-direct-' + Date.now(),
    type: 'private-desk',
    member_id: 'test-member-id', // REPLACE WITH ACTUAL MEMBER ID
    start_date: new Date().toISOString().split('T')[0],
    monthly_fee: 1000,
    status: 'active',
    auto_renew: false,
    payment_method: 'cash',
    branch_id: 'test-branch-id', // REPLACE WITH ACTUAL BRANCH ID
    created_at: new Date().toISOString()
  }
  
  console.log('Test data:', testData)
  console.log('Attempting insert...')
  
  const { data, error } = await supabase.from('contracts').insert(testData).select()
  
  if (error) {
    console.error('❌ INSERT FAILED:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Error details:', error.details)
    console.error('Error hint:', error.hint)
    alert('INSERT FAILED: ' + error.message)
  } else {
    console.log('✅ INSERT SUCCESS:', data)
    alert('INSERT SUCCESS! Check console.')
  }
})()


