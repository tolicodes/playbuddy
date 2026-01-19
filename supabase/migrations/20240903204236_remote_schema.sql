-- Squashed baseline: current remote schema dump (public schema).


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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



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


CREATE OR REPLACE FUNCTION "public"."import_sources_sync_excluded"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if new.approval_status = 'approved' then
        new.is_excluded := false;
    else
        new.is_excluded := true;
    end if;
    return new;
end;
$$;


ALTER FUNCTION "public"."import_sources_sync_excluded"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_job_completed"("p_job_id" "uuid") RETURNS "void"
    LANGUAGE "sql"
    AS $$
  update public.scrape_jobs
  set completed_tasks = completed_tasks + 1
  where id = p_job_id;
$$;


ALTER FUNCTION "public"."increment_job_completed"("p_job_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_job_failed"("p_job_id" "uuid") RETURNS "void"
    LANGUAGE "sql"
    AS $$
  update public.scrape_jobs
  set failed_tasks = failed_tasks + 1
  where id = p_job_id;
$$;


ALTER FUNCTION "public"."increment_job_failed"("p_job_id" "uuid") OWNER TO "postgres";


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
    "comfort_level" "text",
    "experience_level" "text",
    "inclusivity" "text"[],
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


CREATE TABLE IF NOT EXISTS "public"."deep_link_branch_stats" (
    "id" bigint NOT NULL,
    "deep_link_id" "uuid" NOT NULL,
    "range_start_date" "date" NOT NULL,
    "range_end_date" "date" NOT NULL,
    "range_label" "text",
    "range_days" integer,
    "generated_at" timestamp with time zone,
    "overall_clicks" integer,
    "ios_link_clicks" integer,
    "ios_install" integer,
    "ios_reopen" integer,
    "android_link_clicks" integer,
    "android_install" integer,
    "android_reopen" integer,
    "desktop_link_clicks" integer,
    "desktop_texts_sent" integer,
    "desktop_ios_install" integer,
    "desktop_ios_reopen" integer,
    "desktop_android_install" integer,
    "desktop_android_reopen" integer,
    "source_url" "text",
    "source_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."deep_link_branch_stats" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."deep_link_branch_stats_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."deep_link_branch_stats_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."deep_link_branch_stats_id_seq" OWNED BY "public"."deep_link_branch_stats"."id";



CREATE TABLE IF NOT EXISTS "public"."deep_link_events" (
    "deep_link_id" "uuid" NOT NULL,
    "featured_promo_code_id" "uuid",
    "event_id" integer NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."deep_link_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deep_link_promo_codes" (
    "deep_link_id" "uuid" NOT NULL,
    "promo_code_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."deep_link_promo_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deep_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "campaign" "text",
    "slug" "text",
    "organizer_id" integer,
    "community_id" "uuid",
    "type" "text",
    "name" "text",
    "featured_event_id" integer,
    "featured_promo_code_id" "uuid",
    "status" "text" DEFAULT 'active'::"text",
    "initialized_on" timestamp with time zone,
    "campaign_start_date" "date",
    "campaign_end_date" "date",
    "channel" "text",
    "print_run_id" integer,
    "marketing_assignee_id" integer,
    "print_run_asset_number" integer,
    "facilitator_id" "uuid"
);


ALTER TABLE "public"."deep_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_communities" (
    "event_id" integer NOT NULL,
    "community_id" "uuid" NOT NULL
);


ALTER TABLE "public"."event_communities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "media_id" "uuid" NOT NULL,
    "sort_order" integer,
    "event_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text")
);


ALTER TABLE "public"."event_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_popups" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "event_id" integer,
    "title" "text" NOT NULL,
    "body_markdown" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "published_at" timestamp with time zone,
    "stopped_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    CONSTRAINT "event_popups_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'stopped'::"text"])))
);


ALTER TABLE "public"."event_popups" OWNER TO "postgres";


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
    "price" "text",
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
    "event_categories" "text",
    "weekly_pick" boolean,
    "short_description" "text",
    "custom_description" "text",
    "play_party" boolean,
    "facilitator_only" boolean,
    "non_ny" boolean,
    "vetting_url" "text",
    "country" "text",
    "is_munch" boolean,
    "munch_id" integer,
    "hosts" "text"[],
    "facilitators" "uuid"[],
    "frozen" boolean DEFAULT false NOT NULL,
    "neighborhood" "text",
    "short_price" "text",
    "user_submitted" boolean DEFAULT false,
    CONSTRAINT "events_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "events_classification_status_check" CHECK (("classification_status" = ANY (ARRAY['queued'::"text", 'auto_classified'::"text", 'admin_classified'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


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



CREATE TABLE IF NOT EXISTS "public"."facilitator_aliases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facilitator_id" "uuid" NOT NULL,
    "alias" "text" NOT NULL
);


ALTER TABLE "public"."facilitator_aliases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."facilitator_events" (
    "facilitator_id" "uuid" NOT NULL,
    "event_id" integer NOT NULL
);


ALTER TABLE "public"."facilitator_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."facilitator_followers" (
    "facilitator_id" "uuid" NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "followed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."facilitator_followers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."facilitator_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facilitator_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "media_id" "uuid"
);


ALTER TABLE "public"."facilitator_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."facilitator_notifications" (
    "facilitator_id" "uuid" NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "subscribed" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."facilitator_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."facilitator_tags" (
    "facilitator_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL
);


ALTER TABLE "public"."facilitator_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."facilitators" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "bio" "text",
    "profile_image_url" "text",
    "intro_video_url" "text",
    "verified" boolean DEFAULT false NOT NULL,
    "location" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "instagram_handle" "text",
    "fetlife_handle" "text",
    "title" "text",
    "website" "text",
    "email" "text",
    "organizer_id" integer
);


ALTER TABLE "public"."facilitators" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."follows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "followee_type" "text" NOT NULL,
    "followee_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "follows_followee_type_check" CHECK (("followee_type" = ANY (ARRAY['organizer'::"text", 'facilitator'::"text", 'event'::"text", 'munch'::"text"])))
);


ALTER TABLE "public"."follows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."import_sources" (
    "id" bigint NOT NULL,
    "source" "text" NOT NULL,
    "method" "text" NOT NULL,
    "identifier" "text" NOT NULL,
    "identifier_type" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "event_defaults" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approval_status" "text" DEFAULT 'pending'::"text",
    "message_sent" boolean DEFAULT false,
    "is_festival" boolean DEFAULT false,
    "is_excluded" boolean DEFAULT false,
    CONSTRAINT "import_sources_identifier_type_check" CHECK (("identifier_type" = ANY (ARRAY['handle'::"text", 'url'::"text"])))
);


ALTER TABLE "public"."import_sources" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."import_sources_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."import_sources_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."import_sources_id_seq" OWNED BY "public"."import_sources"."id";



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



CREATE TABLE IF NOT EXISTS "public"."marketing_assignees" (
    "id" integer NOT NULL,
    "name" "text",
    "role" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."marketing_assignees" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."marketing_assignees_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."marketing_assignees_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."marketing_assignees_id_seq" OWNED BY "public"."marketing_assignees"."id";



CREATE TABLE IF NOT EXISTS "public"."media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid",
    "title" "text",
    "description" "text",
    "type" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "is_explicit" boolean DEFAULT false,
    "is_public" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "thumbnail_url" "text",
    CONSTRAINT "media_type_check" CHECK (("type" = ANY (ARRAY['video'::"text", 'image'::"text"])))
);


ALTER TABLE "public"."media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."munches" (
    "id" integer NOT NULL,
    "title" "text" NOT NULL,
    "location" "text",
    "hosts" "text",
    "ig_handle" "text",
    "cadence" "text",
    "schedule_text" "text",
    "cost_of_entry" "text",
    "age_restriction" "text",
    "open_to_everyone" "text",
    "main_audience" "text",
    "status" "text",
    "notes" "text",
    "verified" boolean,
    "tags" "text"[],
    "website" "text",
    "fetlife_handle" "text",
    "organizer_id" integer
);


ALTER TABLE "public"."munches" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."munches_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."munches_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."munches_id_seq" OWNED BY "public"."munches"."id";



CREATE TABLE IF NOT EXISTS "public"."organizers" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "url" "text",
    "original_id" "text",
    "aliases" "text"[],
    "hidden" boolean DEFAULT false,
    "bio" "text",
    "instagram_handle" "text",
    "fetlife_handle" "text",
    "membership_app_url" "text",
    "membership_only" boolean,
    "fetlife_handles" "text"[]
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



CREATE TABLE IF NOT EXISTS "public"."print_runs" (
    "id" integer NOT NULL,
    "marketing_assignee_id" integer,
    "start_number" integer,
    "count" integer,
    "media_type" "text",
    "version" "text",
    "qr_x" integer,
    "qr_y" integer,
    "qr_width" integer,
    "qr_height" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."print_runs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."print_runs_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."print_runs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."print_runs_id_seq" OWNED BY "public"."print_runs"."id";



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


CREATE TABLE IF NOT EXISTS "public"."push_notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
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
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "event_id" integer,
    CONSTRAINT "push_notifications_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'scheduled'::"text", 'sending'::"text", 'sent'::"text", 'failed'::"text", 'canceled'::"text"])))
);


ALTER TABLE "public"."push_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "auth_user_id" "uuid",
    "token" "text" NOT NULL,
    "device_id" "text",
    "platform" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_seen_at" timestamp with time zone,
    "disabled_at" timestamp with time zone,
    "disable_reason" "text"
);


ALTER TABLE "public"."push_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scrape_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by_auth_user_id" "uuid",
    "mode" "text" DEFAULT 'async'::"text" NOT NULL,
    "source" "text" DEFAULT 'auto'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "priority" integer DEFAULT 5 NOT NULL,
    "total_tasks" integer DEFAULT 0 NOT NULL,
    "completed_tasks" integer DEFAULT 0 NOT NULL,
    "failed_tasks" integer DEFAULT 0 NOT NULL,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."scrape_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scrape_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "url" "text" NOT NULL,
    "source" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "priority" integer DEFAULT 5 NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "result" "jsonb",
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "event_id" integer
);


ALTER TABLE "public"."scrape_tasks" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "entity" "text" NOT NULL,
    "type" "text"
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_deep_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auth_user_id" "uuid",
    "deep_link_id" "uuid",
    "claimed_on" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_deep_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_events" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_event_name" "text",
    "user_event_props" "jsonb",
    "auth_user_id" "uuid",
    "device_id" "text"
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
    "selected_community_id" "uuid",
    "initial_deep_link_id" "uuid",
    "role" "text",
    "joined_newsletter" boolean DEFAULT false,
    "share_calendar" boolean DEFAULT false
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."buddies" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."buddies_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."buddy_list_buddies" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."buddy_list_buddies_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."buddy_lists" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."buddy_lists_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."classifications" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."classifications_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."deep_link_branch_stats" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."deep_link_branch_stats_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."events" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."events_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."import_sources" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."import_sources_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."kinks" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."kinks_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."marketing_assignees" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."marketing_assignees_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."munches" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."munches_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."organizers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."organizers_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."print_runs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."print_runs_id_seq"'::"regclass");



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



ALTER TABLE ONLY "public"."deep_link_branch_stats"
    ADD CONSTRAINT "deep_link_branch_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deep_link_events"
    ADD CONSTRAINT "deep_link_events_pkey" PRIMARY KEY ("deep_link_id", "event_id");



ALTER TABLE ONLY "public"."deep_link_promo_codes"
    ADD CONSTRAINT "deep_link_promo_codes_pkey" PRIMARY KEY ("deep_link_id", "promo_code_id", "id");



ALTER TABLE ONLY "public"."deep_links"
    ADD CONSTRAINT "deep_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_communities"
    ADD CONSTRAINT "event_communities_pkey" PRIMARY KEY ("event_id", "community_id");



ALTER TABLE ONLY "public"."event_media"
    ADD CONSTRAINT "event_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_popups"
    ADD CONSTRAINT "event_popups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_wishlist"
    ADD CONSTRAINT "event_wishlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."facilitator_aliases"
    ADD CONSTRAINT "facilitator_aliases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."facilitator_events"
    ADD CONSTRAINT "facilitator_events_pkey" PRIMARY KEY ("facilitator_id", "event_id");



ALTER TABLE ONLY "public"."facilitator_events"
    ADD CONSTRAINT "facilitator_events_unique" UNIQUE ("facilitator_id", "event_id");



ALTER TABLE ONLY "public"."facilitator_followers"
    ADD CONSTRAINT "facilitator_followers_pkey" PRIMARY KEY ("facilitator_id", "auth_user_id");



ALTER TABLE ONLY "public"."facilitator_media"
    ADD CONSTRAINT "facilitator_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."facilitator_notifications"
    ADD CONSTRAINT "facilitator_notifications_pkey" PRIMARY KEY ("facilitator_id", "auth_user_id");



ALTER TABLE ONLY "public"."facilitator_tags"
    ADD CONSTRAINT "facilitator_tags_pkey" PRIMARY KEY ("facilitator_id", "tag_id");



ALTER TABLE ONLY "public"."facilitators"
    ADD CONSTRAINT "facilitators_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_auth_user_id_followee_type_followee_id_key" UNIQUE ("auth_user_id", "followee_type", "followee_id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."import_sources"
    ADD CONSTRAINT "import_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."import_sources"
    ADD CONSTRAINT "import_sources_source_method_identifier_uniq" UNIQUE ("source", "method", "identifier");



ALTER TABLE ONLY "public"."kinks"
    ADD CONSTRAINT "kinks_idea_title_key" UNIQUE ("idea_title");



ALTER TABLE ONLY "public"."kinks"
    ADD CONSTRAINT "kinks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location_areas"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_assignees"
    ADD CONSTRAINT "marketing_assignees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."munches"
    ADD CONSTRAINT "munches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizers"
    ADD CONSTRAINT "organizers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."print_runs"
    ADD CONSTRAINT "print_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promo_code_event"
    ADD CONSTRAINT "promo_code_event_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_notifications"
    ADD CONSTRAINT "push_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scrape_jobs"
    ADD CONSTRAINT "scrape_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scrape_tasks"
    ADD CONSTRAINT "scrape_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."swipe_mode_choices"
    ADD CONSTRAINT "swipe_mode_choices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_entity_type_key" UNIQUE ("name", "entity", "type");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "unique_auth_user_id" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."classifications"
    ADD CONSTRAINT "unique_event_id" UNIQUE ("event_id");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "unique_organizer_code" UNIQUE ("organizer_id", "promo_code");



ALTER TABLE ONLY "public"."organizers"
    ADD CONSTRAINT "unique_organizer_name" UNIQUE ("name");



ALTER TABLE ONLY "public"."user_deep_links"
    ADD CONSTRAINT "user_deep_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_deep_links"
    ADD CONSTRAINT "user_deep_links_unique_user_deep_link" UNIQUE ("auth_user_id", "deep_link_id");



ALTER TABLE ONLY "public"."user_events"
    ADD CONSTRAINT "user_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "communities_one_public_per_organizer" ON "public"."communities" USING "btree" ("organizer_id") WHERE (("organizer_id" IS NOT NULL) AND ("type" = 'organizer_public_community'::"text"));



CREATE INDEX "deep_link_branch_stats_deep_link_id_idx" ON "public"."deep_link_branch_stats" USING "btree" ("deep_link_id");



CREATE UNIQUE INDEX "deep_link_branch_stats_unique_range" ON "public"."deep_link_branch_stats" USING "btree" ("deep_link_id", "range_start_date", "range_end_date");



CREATE INDEX "idx_event_location" ON "public"."events" USING "btree" ("location_area_id");



CREATE INDEX "idx_event_popups_event_id" ON "public"."event_popups" USING "btree" ("event_id");



CREATE INDEX "idx_event_popups_status_published_at" ON "public"."event_popups" USING "btree" ("status", "published_at" DESC);



CREATE INDEX "idx_events_end_date" ON "public"."events" USING "btree" ("end_date");



CREATE INDEX "idx_events_organizer_id" ON "public"."events" USING "btree" ("organizer_id");



CREATE INDEX "idx_events_start_date" ON "public"."events" USING "btree" ("start_date");



CREATE INDEX "idx_facilitator_alias" ON "public"."facilitator_aliases" USING "btree" ("alias");



CREATE INDEX "idx_follows_target" ON "public"."follows" USING "btree" ("followee_type", "followee_id");



CREATE INDEX "idx_follows_user" ON "public"."follows" USING "btree" ("auth_user_id");



CREATE INDEX "idx_location_area_name" ON "public"."location_areas" USING "btree" ("name");



CREATE INDEX "idx_push_notifications_event_id" ON "public"."push_notifications" USING "btree" ("event_id");



CREATE INDEX "idx_push_notifications_send_at" ON "public"."push_notifications" USING "btree" ("send_at");



CREATE INDEX "idx_push_notifications_status" ON "public"."push_notifications" USING "btree" ("status");



CREATE INDEX "organizers_fetlife_handles_gin" ON "public"."organizers" USING "gin" ("fetlife_handles");



CREATE UNIQUE INDEX "push_tokens_token_key" ON "public"."push_tokens" USING "btree" ("token");



CREATE INDEX "scrape_jobs_created_at_idx" ON "public"."scrape_jobs" USING "btree" ("created_at");



CREATE INDEX "scrape_jobs_status_idx" ON "public"."scrape_jobs" USING "btree" ("status");



CREATE INDEX "scrape_tasks_job_id_idx" ON "public"."scrape_tasks" USING "btree" ("job_id");



CREATE INDEX "scrape_tasks_status_idx" ON "public"."scrape_tasks" USING "btree" ("status");



CREATE INDEX "user_deep_links_deep_link_idx" ON "public"."user_deep_links" USING "btree" ("deep_link_id");



CREATE INDEX "user_deep_links_user_idx" ON "public"."user_deep_links" USING "btree" ("auth_user_id");



CREATE UNIQUE INDEX "users_name_lower_unique" ON "public"."users" USING "btree" ("lower"("name"));



CREATE OR REPLACE TRIGGER "trg_import_sources_sync_excluded" BEFORE INSERT OR UPDATE ON "public"."import_sources" FOR EACH ROW EXECUTE FUNCTION "public"."import_sources_sync_excluded"();



CREATE OR REPLACE TRIGGER "update_classifications_updated_at" BEFORE UPDATE ON "public"."classifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_event_popups_updated_at" BEFORE UPDATE ON "public"."event_popups" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



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
    ADD CONSTRAINT "community_memberships_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deep_link_branch_stats"
    ADD CONSTRAINT "deep_link_branch_stats_deep_link_id_fkey" FOREIGN KEY ("deep_link_id") REFERENCES "public"."deep_links"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deep_link_promo_codes"
    ADD CONSTRAINT "deep_link_promo_codes_deep_link_id_fkey" FOREIGN KEY ("deep_link_id") REFERENCES "public"."deep_links"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deep_link_promo_codes"
    ADD CONSTRAINT "deep_link_promo_codes_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deep_links"
    ADD CONSTRAINT "deep_links_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."deep_links"
    ADD CONSTRAINT "deep_links_facilitator_id_fkey" FOREIGN KEY ("facilitator_id") REFERENCES "public"."facilitators"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deep_links"
    ADD CONSTRAINT "deep_links_featured_event_id_fkey" FOREIGN KEY ("featured_event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."deep_links"
    ADD CONSTRAINT "deep_links_featured_promo_code_id_fkey" FOREIGN KEY ("featured_promo_code_id") REFERENCES "public"."promo_codes"("id");



ALTER TABLE ONLY "public"."deep_links"
    ADD CONSTRAINT "deep_links_marketing_assignee_id_fkey" FOREIGN KEY ("marketing_assignee_id") REFERENCES "public"."marketing_assignees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."deep_links"
    ADD CONSTRAINT "deep_links_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."deep_links"
    ADD CONSTRAINT "deep_links_print_run_id_fkey" FOREIGN KEY ("print_run_id") REFERENCES "public"."print_runs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_communities"
    ADD CONSTRAINT "event_communities_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_communities"
    ADD CONSTRAINT "event_communities_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_media"
    ADD CONSTRAINT "event_media_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_media"
    ADD CONSTRAINT "event_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_popups"
    ADD CONSTRAINT "event_popups_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_wishlist"
    ADD CONSTRAINT "event_wishlist_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_wishlist"
    ADD CONSTRAINT "event_wishlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_wishlist"
    ADD CONSTRAINT "event_wishlist_user_id_fkey1" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_munch_id_fkey" FOREIGN KEY ("munch_id") REFERENCES "public"."munches"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facilitator_aliases"
    ADD CONSTRAINT "facilitator_aliases_facilitator_id_fkey" FOREIGN KEY ("facilitator_id") REFERENCES "public"."facilitators"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facilitator_events"
    ADD CONSTRAINT "facilitator_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facilitator_events"
    ADD CONSTRAINT "facilitator_events_facilitator_id_fkey" FOREIGN KEY ("facilitator_id") REFERENCES "public"."facilitators"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facilitator_followers"
    ADD CONSTRAINT "facilitator_followers_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facilitator_followers"
    ADD CONSTRAINT "facilitator_followers_facilitator_id_fkey" FOREIGN KEY ("facilitator_id") REFERENCES "public"."facilitators"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facilitator_media"
    ADD CONSTRAINT "facilitator_media_facilitator_id_fkey" FOREIGN KEY ("facilitator_id") REFERENCES "public"."facilitators"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facilitator_media"
    ADD CONSTRAINT "facilitator_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facilitator_notifications"
    ADD CONSTRAINT "facilitator_notifications_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facilitator_notifications"
    ADD CONSTRAINT "facilitator_notifications_facilitator_id_fkey" FOREIGN KEY ("facilitator_id") REFERENCES "public"."facilitators"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facilitator_tags"
    ADD CONSTRAINT "facilitator_tags_facilitator_id_fkey" FOREIGN KEY ("facilitator_id") REFERENCES "public"."facilitators"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facilitator_tags"
    ADD CONSTRAINT "facilitator_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facilitators"
    ADD CONSTRAINT "facilitators_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."deep_link_events"
    ADD CONSTRAINT "fk_dle_deep_link" FOREIGN KEY ("deep_link_id") REFERENCES "public"."deep_links"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deep_link_events"
    ADD CONSTRAINT "fk_dle_event" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deep_link_events"
    ADD CONSTRAINT "fk_dle_promo_code" FOREIGN KEY ("featured_promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."swipe_mode_choices"
    ADD CONSTRAINT "fk_event" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "fk_event_location_area" FOREIGN KEY ("location_area_id") REFERENCES "public"."location_areas"("id");



ALTER TABLE ONLY "public"."facilitator_events"
    ADD CONSTRAINT "fk_fe_event" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "public"."users"("user_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."munches"
    ADD CONSTRAINT "munches_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."print_runs"
    ADD CONSTRAINT "print_runs_marketing_assignee_id_fkey" FOREIGN KEY ("marketing_assignee_id") REFERENCES "public"."marketing_assignees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."promo_code_event"
    ADD CONSTRAINT "promo_code_event_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."promo_code_event"
    ADD CONSTRAINT "promo_code_event_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."push_notifications"
    ADD CONSTRAINT "push_notifications_created_by_auth_user_id_fkey" FOREIGN KEY ("created_by_auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."push_notifications"
    ADD CONSTRAINT "push_notifications_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scrape_jobs"
    ADD CONSTRAINT "scrape_jobs_created_by_auth_user_id_fkey" FOREIGN KEY ("created_by_auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scrape_tasks"
    ADD CONSTRAINT "scrape_tasks_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scrape_tasks"
    ADD CONSTRAINT "scrape_tasks_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."scrape_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."swipe_mode_choices"
    ADD CONSTRAINT "swipe_mode_choices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_deep_links"
    ADD CONSTRAINT "user_deep_links_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_deep_links"
    ADD CONSTRAINT "user_deep_links_deep_link_id_fkey" FOREIGN KEY ("deep_link_id") REFERENCES "public"."deep_links"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_events"
    ADD CONSTRAINT "user_events_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "public"."users"("user_id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_initial_deep_link_id_fkey" FOREIGN KEY ("initial_deep_link_id") REFERENCES "public"."deep_links"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_selected_community_id_fkey" FOREIGN KEY ("selected_community_id") REFERENCES "public"."communities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_selected_location_area_id_fkey" FOREIGN KEY ("selected_location_area_id") REFERENCES "public"."location_areas"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."buddies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."buddy_list_buddies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."buddy_lists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."classifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."communities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_curators" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deep_link_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deep_link_promo_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deep_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_communities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_wishlist" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."facilitator_aliases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."facilitator_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."facilitator_followers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."facilitator_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."facilitator_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."facilitator_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."facilitators" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."import_sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kinks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."location_areas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketing_assignees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."munches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."print_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."promo_code_event" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."promo_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scrape_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scrape_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."swipe_mode_choices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_deep_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


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



GRANT ALL ON FUNCTION "public"."import_sources_sync_excluded"() TO "anon";
GRANT ALL ON FUNCTION "public"."import_sources_sync_excluded"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."import_sources_sync_excluded"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_job_completed"("p_job_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_job_completed"("p_job_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_job_completed"("p_job_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_job_failed"("p_job_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_job_failed"("p_job_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_job_failed"("p_job_id" "uuid") TO "service_role";



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



GRANT ALL ON TABLE "public"."deep_link_branch_stats" TO "anon";
GRANT ALL ON TABLE "public"."deep_link_branch_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."deep_link_branch_stats" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."deep_link_branch_stats" TO "retool_user";



GRANT ALL ON SEQUENCE "public"."deep_link_branch_stats_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."deep_link_branch_stats_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."deep_link_branch_stats_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."deep_link_events" TO "anon";
GRANT ALL ON TABLE "public"."deep_link_events" TO "authenticated";
GRANT ALL ON TABLE "public"."deep_link_events" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."deep_link_events" TO "retool_user";



GRANT ALL ON TABLE "public"."deep_link_promo_codes" TO "anon";
GRANT ALL ON TABLE "public"."deep_link_promo_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."deep_link_promo_codes" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."deep_link_promo_codes" TO "retool_user";



GRANT ALL ON TABLE "public"."deep_links" TO "anon";
GRANT ALL ON TABLE "public"."deep_links" TO "authenticated";
GRANT ALL ON TABLE "public"."deep_links" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."deep_links" TO "retool_user";



GRANT ALL ON TABLE "public"."event_communities" TO "anon";
GRANT ALL ON TABLE "public"."event_communities" TO "authenticated";
GRANT ALL ON TABLE "public"."event_communities" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."event_communities" TO "retool_user";



GRANT ALL ON TABLE "public"."event_media" TO "anon";
GRANT ALL ON TABLE "public"."event_media" TO "authenticated";
GRANT ALL ON TABLE "public"."event_media" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."event_media" TO "retool_user";



GRANT ALL ON TABLE "public"."event_popups" TO "anon";
GRANT ALL ON TABLE "public"."event_popups" TO "authenticated";
GRANT ALL ON TABLE "public"."event_popups" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."event_popups" TO "retool_user";



GRANT ALL ON TABLE "public"."event_wishlist" TO "anon";
GRANT ALL ON TABLE "public"."event_wishlist" TO "authenticated";
GRANT ALL ON TABLE "public"."event_wishlist" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."event_wishlist" TO "retool_user";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."events" TO "retool_user";



GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."facilitator_aliases" TO "anon";
GRANT ALL ON TABLE "public"."facilitator_aliases" TO "authenticated";
GRANT ALL ON TABLE "public"."facilitator_aliases" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."facilitator_aliases" TO "retool_user";



GRANT ALL ON TABLE "public"."facilitator_events" TO "anon";
GRANT ALL ON TABLE "public"."facilitator_events" TO "authenticated";
GRANT ALL ON TABLE "public"."facilitator_events" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."facilitator_events" TO "retool_user";



GRANT ALL ON TABLE "public"."facilitator_followers" TO "anon";
GRANT ALL ON TABLE "public"."facilitator_followers" TO "authenticated";
GRANT ALL ON TABLE "public"."facilitator_followers" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."facilitator_followers" TO "retool_user";



GRANT ALL ON TABLE "public"."facilitator_media" TO "anon";
GRANT ALL ON TABLE "public"."facilitator_media" TO "authenticated";
GRANT ALL ON TABLE "public"."facilitator_media" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."facilitator_media" TO "retool_user";



GRANT ALL ON TABLE "public"."facilitator_notifications" TO "anon";
GRANT ALL ON TABLE "public"."facilitator_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."facilitator_notifications" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."facilitator_notifications" TO "retool_user";



GRANT ALL ON TABLE "public"."facilitator_tags" TO "anon";
GRANT ALL ON TABLE "public"."facilitator_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."facilitator_tags" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."facilitator_tags" TO "retool_user";



GRANT ALL ON TABLE "public"."facilitators" TO "anon";
GRANT ALL ON TABLE "public"."facilitators" TO "authenticated";
GRANT ALL ON TABLE "public"."facilitators" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."facilitators" TO "retool_user";



GRANT ALL ON TABLE "public"."follows" TO "anon";
GRANT ALL ON TABLE "public"."follows" TO "authenticated";
GRANT ALL ON TABLE "public"."follows" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."follows" TO "retool_user";



GRANT ALL ON TABLE "public"."import_sources" TO "anon";
GRANT ALL ON TABLE "public"."import_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."import_sources" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."import_sources" TO "retool_user";



GRANT ALL ON SEQUENCE "public"."import_sources_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."import_sources_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."import_sources_id_seq" TO "service_role";



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



GRANT ALL ON TABLE "public"."marketing_assignees" TO "anon";
GRANT ALL ON TABLE "public"."marketing_assignees" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_assignees" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."marketing_assignees" TO "retool_user";



GRANT ALL ON SEQUENCE "public"."marketing_assignees_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."marketing_assignees_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."marketing_assignees_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."media" TO "anon";
GRANT ALL ON TABLE "public"."media" TO "authenticated";
GRANT ALL ON TABLE "public"."media" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."media" TO "retool_user";



GRANT ALL ON TABLE "public"."munches" TO "anon";
GRANT ALL ON TABLE "public"."munches" TO "authenticated";
GRANT ALL ON TABLE "public"."munches" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."munches" TO "retool_user";



GRANT ALL ON SEQUENCE "public"."munches_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."munches_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."munches_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."organizers" TO "anon";
GRANT ALL ON TABLE "public"."organizers" TO "authenticated";
GRANT ALL ON TABLE "public"."organizers" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."organizers" TO "retool_user";



GRANT ALL ON SEQUENCE "public"."organizers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."organizers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."organizers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."print_runs" TO "anon";
GRANT ALL ON TABLE "public"."print_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."print_runs" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."print_runs" TO "retool_user";



GRANT ALL ON SEQUENCE "public"."print_runs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."print_runs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."print_runs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."promo_code_event" TO "anon";
GRANT ALL ON TABLE "public"."promo_code_event" TO "authenticated";
GRANT ALL ON TABLE "public"."promo_code_event" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."promo_code_event" TO "retool_user";



GRANT ALL ON TABLE "public"."promo_codes" TO "anon";
GRANT ALL ON TABLE "public"."promo_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."promo_codes" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."promo_codes" TO "retool_user";



GRANT ALL ON TABLE "public"."push_notifications" TO "anon";
GRANT ALL ON TABLE "public"."push_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."push_notifications" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."push_notifications" TO "retool_user";



GRANT ALL ON TABLE "public"."push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tokens" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."push_tokens" TO "retool_user";



GRANT ALL ON TABLE "public"."scrape_jobs" TO "anon";
GRANT ALL ON TABLE "public"."scrape_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."scrape_jobs" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."scrape_jobs" TO "retool_user";



GRANT ALL ON TABLE "public"."scrape_tasks" TO "anon";
GRANT ALL ON TABLE "public"."scrape_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."scrape_tasks" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."scrape_tasks" TO "retool_user";



GRANT ALL ON TABLE "public"."swipe_mode_choices" TO "anon";
GRANT ALL ON TABLE "public"."swipe_mode_choices" TO "authenticated";
GRANT ALL ON TABLE "public"."swipe_mode_choices" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."swipe_mode_choices" TO "retool_user";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tags" TO "retool_user";



GRANT ALL ON TABLE "public"."user_deep_links" TO "anon";
GRANT ALL ON TABLE "public"."user_deep_links" TO "authenticated";
GRANT ALL ON TABLE "public"."user_deep_links" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_deep_links" TO "retool_user";



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
