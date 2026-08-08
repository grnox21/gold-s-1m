-- Extensions required by the schema.
-- pgcrypto: gen_random_uuid() for primary keys.
-- btree_gist: lets a GiST exclusion constraint mix an equality column
--   (barber_id) with a range column (the appointment's time span) — this is
--   what makes double-booking protection a database guarantee (see 0004).
create extension if not exists pgcrypto;
create extension if not exists btree_gist;
