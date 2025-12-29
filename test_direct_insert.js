// Direct test script to check if contracts can be inserted
// Run this in browser console while on the contracts page

async function testContractInsert() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY'
  
  console.log('Testing Supabase connection...')
  console.log('URL:', supabaseUrl)
  console.log('Key exists:', !!supabaseKey)
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  // Test data
  const testContract = {
    id: 'test-' + Date.now(),
    type: 'private-desk',
    member_id: 'test-member-id', // Replace with actual member ID
    start_date: new Date().toISOString().split('T')[0],
    monthly_fee: 1000,
    status: 'active',
    auto_renew: false,
    payment_method: 'cash',
    branch_id: 'test-branch-id', // Replace with actual branch ID
    created_at: new Date().toISOString()
  }
  
  console.log('Test contract:', testContract)
  
  const { data, error } = await supabase.from('contracts').insert(testContract).select()
  
  if (error) {
    console.error('INSERT FAILED:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Error details:', error.details)
    console.error('Error hint:', error.hint)
    alert('INSERT FAILED: ' + error.message)
  } else {
    console.log('INSERT SUCCESS:', data)
    alert('INSERT SUCCESS! Check console for details.')
  }
}

testContractInsert()


