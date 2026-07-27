const { createClient } = require('@supabase/supabase-js');
const file = require('fs').readFileSync('./src/supabaseClient.js', 'utf8');
const urlMatch = file.match(/supabaseUrl\s*=\s*['"]([^'"]+)['"]/);
const keyMatch = file.match(/supabaseAnonKey\s*=\s*['"]([^'"]+)['"]/);

if(urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  async function test() {
      const {data: sched} = await supabase.from('schedule').select('*').limit(2);
      console.log("== SCHEDULE ROWS ==");
      console.log(JSON.stringify(sched, null, 2));
      const {data: sess} = await supabase.from('sessions').select('*').limit(2);
      console.log("== SESSION ROWS ==");
      console.log(JSON.stringify(sess, null, 2));
  }
  test();
}
