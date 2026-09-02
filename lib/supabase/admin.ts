import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Cliente con la service_role key: bypassa RLS y puede administrar usuarios
 * de Supabase Auth (auth.admin.*). Solo se usa dentro de Server Actions /
 * Route Handlers, nunca llega al navegador.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
