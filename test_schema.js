const { createClient } = require('@supabase/supabase-js')
const supabase = createClient('https://yqizsaxujlpiirqpkkbe.supabase.co', 'sb_publishable_dmeTjKcSX3ys7NAdHELAgQ_s6cRSQK4')

async function run() {
  const { data: sched } = await supabase.from('schedule').select('*').limit(1)
  const schedData = sched[0];
  
  console.log("Found class_id:", schedData.class_id);

  const { data: newSess, error: errInsert } = await supabase.from('sessions').insert([{
    class_id: schedData.class_id,
    session_date: new Date().toISOString().split('T')[0],
    qr_token: "TEST-" + Math.random().toString(36),
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 35 * 1000).toISOString(),
    is_locked: false
  }]).select().single()

  console.log("Insert result:", JSON.stringify(newSess, null, 2), "Insert error:", errInsert);
}
run();
