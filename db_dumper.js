const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const file = fs.readFileSync('./src/supabaseClient.js', 'utf8');
const urlMatch = file.match(/supabaseUrl\s*=\s*['"]([^'"]+)['"]/);
const keyMatch = file.match(/supabaseAnonKey\s*=\s*['"]([^'"]+)['"]/);
const hardKey = 'sb_publishable_dmeTjKcSX3ys7NAdHELAgQ_s6cRSQK4';

const supabase = createClient('https://yqizsaxujlpiirqpkkbe.supabase.co', hardKey);

async function test() {
    console.log("Fetching schedule...");
    const {data: sched, error: err1} = await supabase.from('schedule').select('*').limit(2);
    console.log("== SCHEDULE ==", sched, err1);

    console.log("Fetching sessions...");
    const {data: sess, error: err2} = await supabase.from('sessions').select('*').limit(2);
    console.log("== SESSIONS ==", sess, err2);
    
    console.log("Fetching classes...");
    const {data: cls, error: err3} = await supabase.from('classes').select('*').limit(2);
    console.log("== CLASSES ==", cls, err3);
}
test();
