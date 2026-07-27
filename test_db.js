const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://yqizsaxujlpiirqpkkbe.supabase.co', 'sb_publishable_dmeTjKcSX3ys7NAdHELAgQ_s6cRSQK4');

async function test() {
    const {data: sched} = await supabase.from('schedule').select('*').limit(2);
    console.log("== SCHEDULE ==");
    console.log(JSON.stringify(sched, null, 2));

    const {data: sess} = await supabase.from('sessions').select('*').limit(5);
    console.log("== SESSIONS ==");
    console.log(JSON.stringify(sess, null, 2));
}
test();
