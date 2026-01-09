

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


CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."create_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Insert a new row into the `users` table with the same `user_id` from `auth.users`
  INSERT INTO users (user_id) 
  VALUES (NEW.id);
  
  -- Return the new row that was inserted into `auth.users`
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.users (id, user_id)
  values (new.id, new.id);
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."buddies" (
    "id" integer NOT NULL,
    "auth_user_id" "uuid",
    "buddy_auth_user_id" "uuid"
);


ALTER TABLE "public"."buddies" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."buddies_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."buddies_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."buddies_id_seq" OWNED BY "public"."buddies"."id";



CREATE TABLE IF NOT EXISTS "public"."buddy_list_buddies" (
    "id" integer NOT NULL,
    "buddy_list_id" integer,
    "buddy_id" integer
);


ALTER TABLE "public"."buddy_list_buddies" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."buddy_list_buddies_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."buddy_list_buddies_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."buddy_list_buddies_id_seq" OWNED BY "public"."buddy_list_buddies"."id";



CREATE TABLE IF NOT EXISTS "public"."buddy_lists" (
    "id" integer NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL
);


ALTER TABLE "public"."buddy_lists" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."buddy_lists_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."buddy_lists_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."buddy_lists_id_seq" OWNED BY "public"."buddy_lists"."id";



CREATE TABLE IF NOT EXISTS "public"."classifications" (
    "id" integer NOT NULL,
    "event_id" integer NOT NULL,
    "event_type" "text",
    "comfort_level" "text",
    "experience_level" "text",
    "inclusivity" "text",
    "consent_and_safety_policies" "text"[],
    "alcohol_and_substance_policies" "text"[],
    "venue_type" "text",
    "interactivity_level" "text",
    "dress_code" "text"[],
    "accessibility" "text"[],
    "tags" "text"[],
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."classifications" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."classifications_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."classifications_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."classifications_id_seq" OWNED BY "public"."classifications"."id";



CREATE TABLE IF NOT EXISTS "public"."communities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "name" "text" NOT NULL,
    "code" "text",
    "visibility" "text",
    "organizer_id" integer,
    "type" "text",
    "description" "text",
    "join_code" "text",
    "auth_type" "text"
);


ALTER TABLE "public"."communities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_curators" (
    "community_id" "uuid" NOT NULL,
    "curator_id" "uuid" NOT NULL
);


ALTER TABLE "public"."community_curators" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid",
    "community_id" "uuid",
    "role" character varying(50),
    "status" character varying(50),
    "join_type" character varying(50),
    "approved_by" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "community_memberships_join_type_check" CHECK ((("join_type")::"text" = ANY ((ARRAY['public'::character varying, 'private'::character varying])::"text"[]))),
    CONSTRAINT "community_memberships_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['public_member'::character varying, 'private_member'::character varying, 'admin'::character varying])::"text"[]))),
    CONSTRAINT "community_memberships_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['approved'::character varying, 'pending'::character varying, 'denied'::character varying])::"text"[])))
);


ALTER TABLE "public"."community_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_communities" (
    "event_id" integer NOT NULL,
    "community_id" "uuid" NOT NULL
);


ALTER TABLE "public"."event_communities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_wishlist" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "event_id" integer,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."event_wishlist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" integer NOT NULL,
    "original_id" "text",
    "organizer_id" integer,
    "name" "text" NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "ticket_url" "text",
    "image_url" "text",
    "location" "text",
    "neighborhood" "text",
    "price" "text",
    "short_price" "text",
    "description" "text",
    "tags" "text"[],
    "timestamp_scraped" timestamp without time zone,
    "source_url" character varying(255),
    "source_origination_group_id" character varying(255),
    "source_origination_group_name" character varying(255),
    "source_origination_platform" character varying(50),
    "source_ticketing_platform" character varying(50),
    "dataset" "text",
    "event_url" "text",
    "approval_status" "text",
    "vetted" boolean DEFAULT false,
    "classification_status" "text",
    "type" "text" DEFAULT 'event'::"text",
    "recurring" "text" DEFAULT 'none'::"text",
    "video_url" "text",
    "lat" "text",
    "lon" "text",
    "hidden" boolean DEFAULT false NOT NULL,
    "location_area_id" "uuid",
    "visibility" "text" DEFAULT 'public'::"text",
    "city" "text",
    "region" "text",
    CONSTRAINT "events_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "events_classification_status_check" CHECK (("classification_status" = ANY (ARRAY['queued'::"text", 'auto_classified'::"text", 'admin_classified'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."event_popups" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "event_id" integer,
    "title" "text" NOT NULL,
    "body_markdown" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "published_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "stopped_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "event_popups_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'stopped'::"text"])))
);

ALTER TABLE "public"."event_popups" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."push_notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "event_id" integer,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "image_url" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "send_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "sent_count" integer DEFAULT 0,
    "failed_count" integer DEFAULT 0,
    "last_error" "text",
    "created_by_auth_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "push_notifications_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'scheduled'::"text", 'sending'::"text", 'sent'::"text", 'failed'::"text", 'canceled'::"text"])))
);

ALTER TABLE "public"."push_notifications" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "auth_user_id" "uuid",
    "token" "text" NOT NULL,
    "device_id" "text",
    "platform" "text",
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "last_seen_at" timestamp with time zone,
    "disabled_at" timestamp with time zone,
    "disable_reason" "text"
);

ALTER TABLE "public"."push_tokens" OWNER TO "postgres";


COMMENT ON COLUMN "public"."events"."location_area_id" IS 'Foreign key referencing the location of the event';



CREATE SEQUENCE IF NOT EXISTS "public"."events_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."events_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."events_id_seq" OWNED BY "public"."events"."id";



CREATE TABLE IF NOT EXISTS "public"."kinks" (
    "id" integer NOT NULL,
    "idea_title" "text" NOT NULL,
    "level" "text",
    "materials_required" "text",
    "idea_description" "text",
    "categories" "jsonb",
    "recommended" boolean DEFAULT false,
    "status" "text",
    "to_do_priority" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."kinks" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."kinks_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."kinks_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."kinks_id_seq" OWNED BY "public"."kinks"."id";



CREATE TABLE IF NOT EXISTS "public"."location_areas" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "city" character varying(255),
    "region" character varying(255),
    "country" character varying(255),
    "entity_type" character varying(50),
    "aliases" "text"[]
);


ALTER TABLE "public"."location_areas" OWNER TO "postgres";


COMMENT ON TABLE "public"."location_areas" IS 'Table to store location information';



COMMENT ON COLUMN "public"."location_areas"."id" IS 'Unique identifier for each location';



COMMENT ON COLUMN "public"."location_areas"."name" IS 'Name of the location';



CREATE TABLE IF NOT EXISTS "public"."organizers" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "url" character varying(255) NOT NULL,
    "original_id" "text",
    "aliases" "text"[],
    "hidden" boolean DEFAULT false
);


ALTER TABLE "public"."organizers" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."organizers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."organizers_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."organizers_id_seq" OWNED BY "public"."organizers"."id";



CREATE TABLE IF NOT EXISTS "public"."promo_code_event" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "event_id" integer,
    "promo_code_id" "uuid",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."promo_code_event" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promo_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organizer_id" integer,
    "promo_code" "text" NOT NULL,
    "discount" numeric(6,2) NOT NULL,
    "discount_type" "text" NOT NULL,
    "scope" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "product_type" "text",
    CONSTRAINT "promo_codes_discount_check" CHECK (("discount" >= (0)::numeric)),
    CONSTRAINT "promo_codes_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percent'::"text", 'fixed'::"text"]))),
    CONSTRAINT "promo_codes_scope_check" CHECK (("scope" = ANY (ARRAY['organizer'::"text", 'event'::"text"])))
);


ALTER TABLE "public"."promo_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."swipe_mode_choices" (
    "event_id" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "choice" character varying(8) NOT NULL,
    "list" character varying(255) DEFAULT 'main'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "swipe_mode_choices_choice_check" CHECK ((("choice")::"text" = ANY ((ARRAY['wishlist'::character varying, 'skip'::character varying])::"text"[])))
);


ALTER TABLE "public"."swipe_mode_choices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_events" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_event_name" "text",
    "user_event_props" "jsonb",
    "auth_user_id" "uuid"
);


ALTER TABLE "public"."user_events" OWNER TO "postgres";


ALTER TABLE "public"."user_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."user_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "share_code" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "name" "text",
    "avatar_url" "text",
    "selected_location_area_id" "uuid",
    "selected_community_id" "uuid"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."buddies" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."buddies_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."buddy_list_buddies" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."buddy_list_buddies_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."buddy_lists" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."buddy_lists_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."classifications" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."classifications_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."events" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."events_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."kinks" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."kinks_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."organizers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."organizers_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."buddies"
    ADD CONSTRAINT "buddies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."buddies"
    ADD CONSTRAINT "buddies_user_id_buddy_user_id_key" UNIQUE ("auth_user_id", "buddy_auth_user_id");



ALTER TABLE ONLY "public"."buddy_list_buddies"
    ADD CONSTRAINT "buddy_list_buddies_buddy_list_id_buddy_id_key" UNIQUE ("buddy_list_id", "buddy_id");



ALTER TABLE ONLY "public"."buddy_list_buddies"
    ADD CONSTRAINT "buddy_list_buddies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."buddy_lists"
    ADD CONSTRAINT "buddy_lists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."classifications"
    ADD CONSTRAINT "classifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_curators"
    ADD CONSTRAINT "community_curators_pkey" PRIMARY KEY ("community_id", "curator_id");



ALTER TABLE ONLY "public"."community_memberships"
    ADD CONSTRAINT "community_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_communities"
    ADD CONSTRAINT "event_communities_pkey" PRIMARY KEY ("event_id", "community_id");



ALTER TABLE ONLY "public"."event_wishlist"
    ADD CONSTRAINT "event_wishlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."event_popups"
    ADD CONSTRAINT "event_popups_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."push_notifications"
    ADD CONSTRAINT "push_notifications_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kinks"
    ADD CONSTRAINT "kinks_idea_title_key" UNIQUE ("idea_title");



ALTER TABLE ONLY "public"."kinks"
    ADD CONSTRAINT "kinks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location_areas"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizers"
    ADD CONSTRAINT "organizers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promo_code_event"
    ADD CONSTRAINT "promo_code_event_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."swipe_mode_choices"
    ADD CONSTRAINT "swipe_mode_choices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "unique_auth_user_id" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."classifications"
    ADD CONSTRAINT "unique_event_id" UNIQUE ("event_id");



ALTER TABLE ONLY "public"."organizers"
    ADD CONSTRAINT "unique_organizer_name" UNIQUE ("name");



ALTER TABLE ONLY "public"."user_events"
    ADD CONSTRAINT "user_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_event_location" ON "public"."events" USING "btree" ("location_area_id");



CREATE INDEX "idx_events_end_date" ON "public"."events" USING "btree" ("end_date");



CREATE INDEX "idx_events_organizer_id" ON "public"."events" USING "btree" ("organizer_id");



CREATE INDEX "idx_events_start_date" ON "public"."events" USING "btree" ("start_date");



CREATE INDEX "idx_location_area_name" ON "public"."location_areas" USING "btree" ("name");

CREATE INDEX "idx_push_notifications_send_at" ON "public"."push_notifications" USING "btree" ("send_at");
CREATE INDEX "idx_push_notifications_status" ON "public"."push_notifications" USING "btree" ("status");
CREATE INDEX "idx_push_notifications_event_id" ON "public"."push_notifications" USING "btree" ("event_id");
CREATE UNIQUE INDEX "push_tokens_token_key" ON "public"."push_tokens" USING "btree" ("token");



CREATE OR REPLACE TRIGGER "update_classifications_updated_at" BEFORE UPDATE ON "public"."classifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."buddies"
    ADD CONSTRAINT "buddies_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."buddies"
    ADD CONSTRAINT "buddies_auth_user_id_fkey1" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."buddies"
    ADD CONSTRAINT "buddies_buddy_auth_user_id_fkey" FOREIGN KEY ("buddy_auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."buddies"
    ADD CONSTRAINT "buddies_buddy_auth_user_id_fkey1" FOREIGN KEY ("buddy_auth_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."buddy_list_buddies"
    ADD CONSTRAINT "buddy_list_buddies_buddy_id_fkey" FOREIGN KEY ("buddy_id") REFERENCES "public"."buddies"("id");



ALTER TABLE ONLY "public"."buddy_list_buddies"
    ADD CONSTRAINT "buddy_list_buddies_buddy_list_id_fkey" FOREIGN KEY ("buddy_list_id") REFERENCES "public"."buddy_lists"("id");



ALTER TABLE ONLY "public"."buddy_lists"
    ADD CONSTRAINT "buddy_lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."classifications"
    ADD CONSTRAINT "classifications_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_curators"
    ADD CONSTRAINT "community_curators_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_curators"
    ADD CONSTRAINT "community_curators_curator_id_fkey" FOREIGN KEY ("curator_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_memberships"
    ADD CONSTRAINT "community_memberships_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_memberships"
    ADD CONSTRAINT "community_memberships_auth_user_id_fkey1" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_memberships"
    ADD CONSTRAINT "community_memberships_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id");



ALTER TABLE ONLY "public"."event_communities"
    ADD CONSTRAINT "event_communities_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_communities"
    ADD CONSTRAINT "event_communities_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_wishlist"
    ADD CONSTRAINT "event_wishlist_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_wishlist"
    ADD CONSTRAINT "event_wishlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_wishlist"
    ADD CONSTRAINT "event_wishlist_user_id_fkey1" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."event_popups"
    ADD CONSTRAINT "event_popups_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."push_notifications"
    ADD CONSTRAINT "push_notifications_created_by_auth_user_id_fkey" FOREIGN KEY ("created_by_auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."push_notifications"
    ADD CONSTRAINT "push_notifications_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."swipe_mode_choices"
    ADD CONSTRAINT "fk_event" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "fk_event_location_area" FOREIGN KEY ("location_area_id") REFERENCES "public"."location_areas"("id");



ALTER TABLE ONLY "public"."promo_code_event"
    ADD CONSTRAINT "promo_code_event_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."promo_code_event"
    ADD CONSTRAINT "promo_code_event_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."swipe_mode_choices"
    ADD CONSTRAINT "swipe_mode_choices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_events"
    ADD CONSTRAINT "user_events_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "public"."users"("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_selected_community_id_fkey" FOREIGN KEY ("selected_community_id") REFERENCES "public"."communities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_selected_location_area_id_fkey" FOREIGN KEY ("selected_location_area_id") REFERENCES "public"."location_areas"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kinks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."promo_code_event" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_events" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."user_events";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "retool_user";
































































































































































































GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";





















GRANT ALL ON TABLE "public"."buddies" TO "anon";
GRANT ALL ON TABLE "public"."buddies" TO "authenticated";
GRANT ALL ON TABLE "public"."buddies" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."buddies" TO "retool_user";



GRANT ALL ON SEQUENCE "public"."buddies_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."buddies_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."buddies_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."buddy_list_buddies" TO "anon";
GRANT ALL ON TABLE "public"."buddy_list_buddies" TO "authenticated";
GRANT ALL ON TABLE "public"."buddy_list_buddies" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."buddy_list_buddies" TO "retool_user";



GRANT ALL ON SEQUENCE "public"."buddy_list_buddies_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."buddy_list_buddies_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."buddy_list_buddies_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."buddy_lists" TO "anon";
GRANT ALL ON TABLE "public"."buddy_lists" TO "authenticated";
GRANT ALL ON TABLE "public"."buddy_lists" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."buddy_lists" TO "retool_user";



GRANT ALL ON SEQUENCE "public"."buddy_lists_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."buddy_lists_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."buddy_lists_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."classifications" TO "anon";
GRANT ALL ON TABLE "public"."classifications" TO "authenticated";
GRANT ALL ON TABLE "public"."classifications" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."classifications" TO "retool_user";



GRANT ALL ON SEQUENCE "public"."classifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."classifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."classifications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."communities" TO "anon";
GRANT ALL ON TABLE "public"."communities" TO "authenticated";
GRANT ALL ON TABLE "public"."communities" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."communities" TO "retool_user";



GRANT ALL ON TABLE "public"."community_curators" TO "anon";
GRANT ALL ON TABLE "public"."community_curators" TO "authenticated";
GRANT ALL ON TABLE "public"."community_curators" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."community_curators" TO "retool_user";



GRANT ALL ON TABLE "public"."community_memberships" TO "anon";
GRANT ALL ON TABLE "public"."community_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."community_memberships" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."community_memberships" TO "retool_user";



GRANT ALL ON TABLE "public"."event_communities" TO "anon";
GRANT ALL ON TABLE "public"."event_communities" TO "authenticated";
GRANT ALL ON TABLE "public"."event_communities" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."event_communities" TO "retool_user";



GRANT ALL ON TABLE "public"."event_wishlist" TO "anon";
GRANT ALL ON TABLE "public"."event_wishlist" TO "authenticated";
GRANT ALL ON TABLE "public"."event_wishlist" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."event_wishlist" TO "retool_user";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."events" TO "retool_user";

GRANT ALL ON TABLE "public"."event_popups" TO "anon";
GRANT ALL ON TABLE "public"."event_popups" TO "authenticated";
GRANT ALL ON TABLE "public"."event_popups" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."event_popups" TO "retool_user";

GRANT ALL ON TABLE "public"."push_notifications" TO "anon";
GRANT ALL ON TABLE "public"."push_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."push_notifications" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."push_notifications" TO "retool_user";

GRANT ALL ON TABLE "public"."push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tokens" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."push_tokens" TO "retool_user";



GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."kinks" TO "anon";
GRANT ALL ON TABLE "public"."kinks" TO "authenticated";
GRANT ALL ON TABLE "public"."kinks" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."kinks" TO "retool_user";



GRANT ALL ON SEQUENCE "public"."kinks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."kinks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."kinks_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."location_areas" TO "anon";
GRANT ALL ON TABLE "public"."location_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."location_areas" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."location_areas" TO "retool_user";



GRANT ALL ON TABLE "public"."organizers" TO "anon";
GRANT ALL ON TABLE "public"."organizers" TO "authenticated";
GRANT ALL ON TABLE "public"."organizers" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."organizers" TO "retool_user";



GRANT ALL ON SEQUENCE "public"."organizers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."organizers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."organizers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."promo_code_event" TO "anon";
GRANT ALL ON TABLE "public"."promo_code_event" TO "authenticated";
GRANT ALL ON TABLE "public"."promo_code_event" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."promo_code_event" TO "retool_user";



GRANT ALL ON TABLE "public"."promo_codes" TO "anon";
GRANT ALL ON TABLE "public"."promo_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."promo_codes" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."promo_codes" TO "retool_user";



GRANT ALL ON TABLE "public"."swipe_mode_choices" TO "anon";
GRANT ALL ON TABLE "public"."swipe_mode_choices" TO "authenticated";
GRANT ALL ON TABLE "public"."swipe_mode_choices" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."swipe_mode_choices" TO "retool_user";



GRANT ALL ON TABLE "public"."user_events" TO "anon";
GRANT ALL ON TABLE "public"."user_events" TO "authenticated";
GRANT ALL ON TABLE "public"."user_events" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_events" TO "retool_user";



GRANT ALL ON SEQUENCE "public"."user_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."users" TO "retool_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES  TO "retool_user";






























RESET ALL;
