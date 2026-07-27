const { createClient } = require('@supabase/supabase-js')
const supabase = createClient('https://yqizsaxujlpiirqpkkbe.supabase.co', 'sb_publishable_dmeTjKcSX3ys7NAdHELAgQ_s6cRSQK4')

async function run() {
  console.log("Wiping all attendance records...");
  const { error: err1 } = await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (err1) console.error("Error wiping attendance:", err1);

  console.log("Wiping all sessions...");
  const { error: err2 } = await supabase.from('sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (err2) console.error("Error wiping sessions:", err2);

  console.log("Resetting all device IDs...");
  const { error: err3 } = await supabase.from('users').update({ device_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
  if (err3) console.error("Error resetting devices:", err3);

  console.log("✅ Database successfully wiped! Fresh slate ready.");
}

run();
