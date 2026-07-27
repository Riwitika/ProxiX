const { createClient } = require('@supabase/supabase-js')
const supabase = createClient('https://yqizsaxujlpiirqpkkbe.supabase.co', 'sb_publishable_dmeTjKcSX3ys7NAdHELAgQ_s6cRSQK4')

async function run() {
  console.log('Testing SELECT...');
  const { data, error } = await supabase.from('users').select('*').limit(1)
  console.log("Select error:", error)
  if (data && data.length > 0) {
     console.log('Testing UPDATE...');
     const { data: updateData, error: updateError } = await supabase.from('users').update({ device_id: 'test_uuid' }).eq('id', data[0].id).select()
     console.log("Update Error:", updateError)
     console.log("Updated rows:", updateData ? updateData.length : 0);
  } else {
     console.log('NO data returned.');
  }
}
run();
