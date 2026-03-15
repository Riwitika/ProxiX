import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yqizsaxujlpiirqpkkbe.supabase.co'
const supabaseKey = 'sb_publishable_dmeTjKcSX3ys7NAdHELAgQ_s6cRSQK4'

export const supabase = createClient(supabaseUrl, supabaseKey)