
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ultdeyxftiawkqrugnfm.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsdGRleXhmdGlhd2txcnVnbmZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMzI3MSwiZXhwIjoyMDgzODA5MjcxfQ.j5nfS2IUCDONKZogqRdwPeXPmLTLiqO6NmsXth0O0_I";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Checking row counts...");
    const { count: tCount } = await supabase.from('tower_technical_data').select('*', { count: 'exact', head: true });
    const { count: sCount } = await supabase.from('span_technical_data').select('*', { count: 'exact', head: true });

    console.log("Tower Count:", tCount);
    console.log("Span Count:", sCount);
}

run();
