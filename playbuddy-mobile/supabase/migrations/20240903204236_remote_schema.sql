create sequence "public"."events_id_seq";

create sequence "public"."kinks_id_seq";

create sequence "public"."organizers_id_seq";

create table "public"."events" (
    "id" integer not null default nextval('events_id_seq'::regclass),
    "original_id" character varying(255),
    "organizer_id" integer,
    "name" character varying(255) not null,
    "start_date" timestamp with time zone not null,
    "end_date" timestamp with time zone not null,
    "ticket_url" character varying(255),
    "image_url" character varying(255),
    "location" character varying(255),
    "price" character varying(50),
    "description" text,
    "tags" text[],
    "timestamp_scraped" timestamp without time zone,
    "source_url" character varying(255),
    "source_origination_group_id" character varying(255),
    "source_origination_group_name" character varying(255),
    "source_origination_platform" character varying(50),
    "source_ticketing_platform" character varying(50),
    "dataset" character varying(50),
    "event_url" text
);


alter table "public"."events" enable row level security;

create table "public"."kinks" (
    "id" integer not null default nextval('kinks_id_seq'::regclass),
    "idea_title" text not null,
    "level" text,
    "materials_required" text,
    "idea_description" text,
    "categories" jsonb,
    "recommended" boolean default false,
    "status" text,
    "to_do_priority" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."kinks" enable row level security;

create table "public"."organizers" (
    "id" integer not null default nextval('organizers_id_seq'::regclass),
    "name" character varying(255) not null,
    "url" character varying(255) not null,
    "original_id" text,
    "aliases" text[]
);


alter table "public"."organizers" enable row level security;

alter sequence "public"."events_id_seq" owned by "public"."events"."id";

alter sequence "public"."kinks_id_seq" owned by "public"."kinks"."id";

alter sequence "public"."organizers_id_seq" owned by "public"."organizers"."id";

CREATE UNIQUE INDEX events_pkey ON public.events USING btree (id);

CREATE INDEX idx_events_end_date ON public.events USING btree (end_date);

CREATE INDEX idx_events_organizer_id ON public.events USING btree (organizer_id);

CREATE INDEX idx_events_start_date ON public.events USING btree (start_date);

CREATE UNIQUE INDEX kinks_idea_title_key ON public.kinks USING btree (idea_title);

CREATE UNIQUE INDEX kinks_pkey ON public.kinks USING btree (id);

CREATE UNIQUE INDEX organizers_pkey ON public.organizers USING btree (id);

CREATE UNIQUE INDEX unique_organizer_name ON public.organizers USING btree (name);

alter table "public"."events" add constraint "events_pkey" PRIMARY KEY using index "events_pkey";

alter table "public"."kinks" add constraint "kinks_pkey" PRIMARY KEY using index "kinks_pkey";

alter table "public"."organizers" add constraint "organizers_pkey" PRIMARY KEY using index "organizers_pkey";

alter table "public"."events" add constraint "events_dataset_check" CHECK (((dataset)::text = ANY ((ARRAY['Kink'::character varying, 'Whatsapp POC'::character varying])::text[]))) not valid;

alter table "public"."events" validate constraint "events_dataset_check";

alter table "public"."events" add constraint "events_organizer_id_fkey" FOREIGN KEY (organizer_id) REFERENCES organizers(id) ON DELETE CASCADE not valid;

alter table "public"."events" validate constraint "events_organizer_id_fkey";

alter table "public"."events" add constraint "events_source_origination_platform_check" CHECK (((source_origination_platform)::text = ANY ((ARRAY['WhatsApp'::character varying, 'organizer_api'::character varying])::text[]))) not valid;

alter table "public"."events" validate constraint "events_source_origination_platform_check";

alter table "public"."events" add constraint "events_source_ticketing_platform_check" CHECK (((source_ticketing_platform)::text = ANY ((ARRAY['Eventbrite'::character varying, 'Plura'::character varying, 'Partiful'::character varying])::text[]))) not valid;

alter table "public"."events" validate constraint "events_source_ticketing_platform_check";

alter table "public"."kinks" add constraint "kinks_idea_title_key" UNIQUE using index "kinks_idea_title_key";

alter table "public"."organizers" add constraint "unique_organizer_name" UNIQUE using index "unique_organizer_name";

grant delete on table "public"."events" to "anon";

grant insert on table "public"."events" to "anon";

grant references on table "public"."events" to "anon";

grant select on table "public"."events" to "anon";

grant trigger on table "public"."events" to "anon";

grant truncate on table "public"."events" to "anon";

grant update on table "public"."events" to "anon";

grant delete on table "public"."events" to "authenticated";

grant insert on table "public"."events" to "authenticated";

grant references on table "public"."events" to "authenticated";

grant select on table "public"."events" to "authenticated";

grant trigger on table "public"."events" to "authenticated";

grant truncate on table "public"."events" to "authenticated";

grant update on table "public"."events" to "authenticated";

grant delete on table "public"."events" to "service_role";

grant insert on table "public"."events" to "service_role";

grant references on table "public"."events" to "service_role";

grant select on table "public"."events" to "service_role";

grant trigger on table "public"."events" to "service_role";

grant truncate on table "public"."events" to "service_role";

grant update on table "public"."events" to "service_role";

grant delete on table "public"."kinks" to "anon";

grant insert on table "public"."kinks" to "anon";

grant references on table "public"."kinks" to "anon";

grant select on table "public"."kinks" to "anon";

grant trigger on table "public"."kinks" to "anon";

grant truncate on table "public"."kinks" to "anon";

grant update on table "public"."kinks" to "anon";

grant delete on table "public"."kinks" to "authenticated";

grant insert on table "public"."kinks" to "authenticated";

grant references on table "public"."kinks" to "authenticated";

grant select on table "public"."kinks" to "authenticated";

grant trigger on table "public"."kinks" to "authenticated";

grant truncate on table "public"."kinks" to "authenticated";

grant update on table "public"."kinks" to "authenticated";

grant delete on table "public"."kinks" to "service_role";

grant insert on table "public"."kinks" to "service_role";

grant references on table "public"."kinks" to "service_role";

grant select on table "public"."kinks" to "service_role";

grant trigger on table "public"."kinks" to "service_role";

grant truncate on table "public"."kinks" to "service_role";

grant update on table "public"."kinks" to "service_role";

grant delete on table "public"."organizers" to "anon";

grant insert on table "public"."organizers" to "anon";

grant references on table "public"."organizers" to "anon";

grant select on table "public"."organizers" to "anon";

grant trigger on table "public"."organizers" to "anon";

grant truncate on table "public"."organizers" to "anon";

grant update on table "public"."organizers" to "anon";

grant delete on table "public"."organizers" to "authenticated";

grant insert on table "public"."organizers" to "authenticated";

grant references on table "public"."organizers" to "authenticated";

grant select on table "public"."organizers" to "authenticated";

grant trigger on table "public"."organizers" to "authenticated";

grant truncate on table "public"."organizers" to "authenticated";

grant update on table "public"."organizers" to "authenticated";

grant delete on table "public"."organizers" to "service_role";

grant insert on table "public"."organizers" to "service_role";

grant references on table "public"."organizers" to "service_role";

grant select on table "public"."organizers" to "service_role";

grant trigger on table "public"."organizers" to "service_role";

grant truncate on table "public"."organizers" to "service_role";

grant update on table "public"."organizers" to "service_role";


