const { createClient } = require('@supabase/supabase-js')
const supabase = createClient('https://yqizsaxujlpiirqpkkbe.supabase.co', 'sb_publishable_dmeTjKcSX3ys7NAdHELAgQ_s6cRSQK4')

async function run() {
  const { data, error } = await supabase.from('users').update({ device_id: null }).neq('id', '00000000-0000-0000-0000-000000000000')
  console.log("Reset all devices. Error:", error)
}
run();
