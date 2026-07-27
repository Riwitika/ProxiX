const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://yqizsaxujlpiirqpkkbe.supabase.co'
const supabaseKey = 'sb_publishable_dmeTjKcSX3ys7NAdHELAgQ_s6cRSQK4'

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log("Testing insert into sessions...");
  const sessionToken = "PROXIX-" + Math.random().toString(36).substring(2, 10);
  
  const { data, error } = await supabase
      .from("sessions")
      .insert([{
          class_id: 1, 
          session_date: new Date().toISOString().split('T')[0],
          qr_token: sessionToken,
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 35 * 1000).toISOString(),
          is_locked: false
      }]).select().single()

  if(error) {
     console.error("Supabase Error:", error);
  } else {
     console.log("Supabase Success! Data:", data);
  }
}

test().then(() => console.log("Done")).catch(e => console.error(e));
