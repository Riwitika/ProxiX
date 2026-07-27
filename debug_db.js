const { createClient } = require('@supabase/supabase-js')
const supabase = createClient('https://yqizsaxujlpiirqpkkbe.supabase.co', 'sb_publishable_dmeTjKcSX3ys7NAdHELAgQ_s6cRSQK4')

async function run() {
  const { data: att } = await supabase.from('attendance').select('*')
  console.log("All Attendance:", att)

  const { data: users } = await supabase.from('users').select('*')
  console.log("Users and their devices:", users.map(u => ({ username: u.username, device_id: u.device_id })))
}
run();
