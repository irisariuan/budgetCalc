


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."balance_adjustments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "text" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "description" "text" NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."balance_adjustments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."budget_additions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "text" NOT NULL,
    "description" "text",
    "amount" numeric(12,2) NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "budget_additions_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."budget_additions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "text" NOT NULL,
    "description" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "source" "text" NOT NULL,
    "paid_by_id" "uuid",
    "split_among" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "receipt_url" "text",
    CONSTRAINT "expenses_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "expenses_source_check" CHECK (("source" = ANY (ARRAY['group'::"text", 'personal'::"text"])))
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rooms" OWNER TO "postgres";


ALTER TABLE ONLY "public"."balance_adjustments"
    ADD CONSTRAINT "balance_adjustments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_additions"
    ADD CONSTRAINT "budget_additions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



CREATE INDEX "balance_adjustments_date_idx" ON "public"."balance_adjustments" USING "btree" ("date");



CREATE INDEX "balance_adjustments_member_id_idx" ON "public"."balance_adjustments" USING "btree" ("member_id");



CREATE INDEX "balance_adjustments_room_id_idx" ON "public"."balance_adjustments" USING "btree" ("room_id");



CREATE INDEX "budget_additions_date_idx" ON "public"."budget_additions" USING "btree" ("date");



CREATE INDEX "budget_additions_room_id_idx" ON "public"."budget_additions" USING "btree" ("room_id");



CREATE INDEX "expenses_date_idx" ON "public"."expenses" USING "btree" ("date");



CREATE INDEX "expenses_paid_by_id_idx" ON "public"."expenses" USING "btree" ("paid_by_id");



CREATE INDEX "expenses_room_id_idx" ON "public"."expenses" USING "btree" ("room_id");



CREATE INDEX "members_room_id_idx" ON "public"."members" USING "btree" ("room_id");



ALTER TABLE ONLY "public"."balance_adjustments"
    ADD CONSTRAINT "balance_adjustments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."balance_adjustments"
    ADD CONSTRAINT "balance_adjustments_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_additions"
    ADD CONSTRAINT "budget_additions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_paid_by_id_fkey" FOREIGN KEY ("paid_by_id") REFERENCES "public"."members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE "public"."balance_adjustments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "balance_adjustments: allow all" ON "public"."balance_adjustments" USING (true) WITH CHECK (true);



ALTER TABLE "public"."budget_additions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "budget_additions: allow all" ON "public"."budget_additions" USING (true) WITH CHECK (true);



ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "expenses: allow all" ON "public"."expenses" USING (true) WITH CHECK (true);



ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "members: allow all" ON "public"."members" USING (true) WITH CHECK (true);



ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rooms: allow all" ON "public"."rooms" USING (true) WITH CHECK (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."balance_adjustments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."budget_additions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."expenses";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."members";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."rooms";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON TABLE "public"."balance_adjustments" TO "anon";
GRANT ALL ON TABLE "public"."balance_adjustments" TO "authenticated";
GRANT ALL ON TABLE "public"."balance_adjustments" TO "service_role";



GRANT ALL ON TABLE "public"."budget_additions" TO "anon";
GRANT ALL ON TABLE "public"."budget_additions" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_additions" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."members" TO "anon";
GRANT ALL ON TABLE "public"."members" TO "authenticated";
GRANT ALL ON TABLE "public"."members" TO "service_role";



GRANT ALL ON TABLE "public"."rooms" TO "anon";
GRANT ALL ON TABLE "public"."rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."rooms" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































--
-- Dumped schema changes for auth and storage
--

CREATE POLICY "receipts: allow public delete" ON "storage"."objects" FOR DELETE USING (("bucket_id" = 'receipts'::"text"));



CREATE POLICY "receipts: allow public read" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'receipts'::"text"));



CREATE POLICY "receipts: allow public upload" ON "storage"."objects" FOR INSERT WITH CHECK (("bucket_id" = 'receipts'::"text"));



