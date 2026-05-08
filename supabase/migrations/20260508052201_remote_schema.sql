drop extension if exists "pg_net";

drop policy "balance_adjustments: allow all" on "public"."balance_adjustments";

drop policy "budget_additions: allow all" on "public"."budget_additions";

drop policy "expenses: allow all" on "public"."expenses";

drop policy "members: allow all" on "public"."members";

drop policy "rooms: allow all" on "public"."rooms";

revoke delete on table "public"."balance_adjustments" from "anon";

revoke insert on table "public"."balance_adjustments" from "anon";

revoke references on table "public"."balance_adjustments" from "anon";

revoke select on table "public"."balance_adjustments" from "anon";

revoke trigger on table "public"."balance_adjustments" from "anon";

revoke truncate on table "public"."balance_adjustments" from "anon";

revoke update on table "public"."balance_adjustments" from "anon";

revoke delete on table "public"."balance_adjustments" from "authenticated";

revoke insert on table "public"."balance_adjustments" from "authenticated";

revoke references on table "public"."balance_adjustments" from "authenticated";

revoke select on table "public"."balance_adjustments" from "authenticated";

revoke trigger on table "public"."balance_adjustments" from "authenticated";

revoke truncate on table "public"."balance_adjustments" from "authenticated";

revoke update on table "public"."balance_adjustments" from "authenticated";

revoke delete on table "public"."balance_adjustments" from "service_role";

revoke insert on table "public"."balance_adjustments" from "service_role";

revoke references on table "public"."balance_adjustments" from "service_role";

revoke select on table "public"."balance_adjustments" from "service_role";

revoke trigger on table "public"."balance_adjustments" from "service_role";

revoke truncate on table "public"."balance_adjustments" from "service_role";

revoke update on table "public"."balance_adjustments" from "service_role";

revoke delete on table "public"."budget_additions" from "anon";

revoke insert on table "public"."budget_additions" from "anon";

revoke references on table "public"."budget_additions" from "anon";

revoke select on table "public"."budget_additions" from "anon";

revoke trigger on table "public"."budget_additions" from "anon";

revoke truncate on table "public"."budget_additions" from "anon";

revoke update on table "public"."budget_additions" from "anon";

revoke delete on table "public"."budget_additions" from "authenticated";

revoke insert on table "public"."budget_additions" from "authenticated";

revoke references on table "public"."budget_additions" from "authenticated";

revoke select on table "public"."budget_additions" from "authenticated";

revoke trigger on table "public"."budget_additions" from "authenticated";

revoke truncate on table "public"."budget_additions" from "authenticated";

revoke update on table "public"."budget_additions" from "authenticated";

revoke delete on table "public"."budget_additions" from "service_role";

revoke insert on table "public"."budget_additions" from "service_role";

revoke references on table "public"."budget_additions" from "service_role";

revoke select on table "public"."budget_additions" from "service_role";

revoke trigger on table "public"."budget_additions" from "service_role";

revoke truncate on table "public"."budget_additions" from "service_role";

revoke update on table "public"."budget_additions" from "service_role";

revoke delete on table "public"."expenses" from "anon";

revoke insert on table "public"."expenses" from "anon";

revoke references on table "public"."expenses" from "anon";

revoke select on table "public"."expenses" from "anon";

revoke trigger on table "public"."expenses" from "anon";

revoke truncate on table "public"."expenses" from "anon";

revoke update on table "public"."expenses" from "anon";

revoke delete on table "public"."expenses" from "authenticated";

revoke insert on table "public"."expenses" from "authenticated";

revoke references on table "public"."expenses" from "authenticated";

revoke select on table "public"."expenses" from "authenticated";

revoke trigger on table "public"."expenses" from "authenticated";

revoke truncate on table "public"."expenses" from "authenticated";

revoke update on table "public"."expenses" from "authenticated";

revoke delete on table "public"."expenses" from "service_role";

revoke insert on table "public"."expenses" from "service_role";

revoke references on table "public"."expenses" from "service_role";

revoke select on table "public"."expenses" from "service_role";

revoke trigger on table "public"."expenses" from "service_role";

revoke truncate on table "public"."expenses" from "service_role";

revoke update on table "public"."expenses" from "service_role";

revoke delete on table "public"."members" from "anon";

revoke insert on table "public"."members" from "anon";

revoke references on table "public"."members" from "anon";

revoke select on table "public"."members" from "anon";

revoke trigger on table "public"."members" from "anon";

revoke truncate on table "public"."members" from "anon";

revoke update on table "public"."members" from "anon";

revoke delete on table "public"."members" from "authenticated";

revoke insert on table "public"."members" from "authenticated";

revoke references on table "public"."members" from "authenticated";

revoke select on table "public"."members" from "authenticated";

revoke trigger on table "public"."members" from "authenticated";

revoke truncate on table "public"."members" from "authenticated";

revoke update on table "public"."members" from "authenticated";

revoke delete on table "public"."members" from "service_role";

revoke insert on table "public"."members" from "service_role";

revoke references on table "public"."members" from "service_role";

revoke select on table "public"."members" from "service_role";

revoke trigger on table "public"."members" from "service_role";

revoke truncate on table "public"."members" from "service_role";

revoke update on table "public"."members" from "service_role";

revoke delete on table "public"."rooms" from "anon";

revoke insert on table "public"."rooms" from "anon";

revoke references on table "public"."rooms" from "anon";

revoke select on table "public"."rooms" from "anon";

revoke trigger on table "public"."rooms" from "anon";

revoke truncate on table "public"."rooms" from "anon";

revoke update on table "public"."rooms" from "anon";

revoke delete on table "public"."rooms" from "authenticated";

revoke insert on table "public"."rooms" from "authenticated";

revoke references on table "public"."rooms" from "authenticated";

revoke select on table "public"."rooms" from "authenticated";

revoke trigger on table "public"."rooms" from "authenticated";

revoke truncate on table "public"."rooms" from "authenticated";

revoke update on table "public"."rooms" from "authenticated";

revoke delete on table "public"."rooms" from "service_role";

revoke insert on table "public"."rooms" from "service_role";

revoke references on table "public"."rooms" from "service_role";

revoke select on table "public"."rooms" from "service_role";

revoke trigger on table "public"."rooms" from "service_role";

revoke truncate on table "public"."rooms" from "service_role";

revoke update on table "public"."rooms" from "service_role";

alter table "public"."balance_adjustments" drop constraint "balance_adjustments_member_id_fkey";

alter table "public"."balance_adjustments" drop constraint "balance_adjustments_room_id_fkey";

alter table "public"."budget_additions" drop constraint "budget_additions_amount_check";

alter table "public"."budget_additions" drop constraint "budget_additions_room_id_fkey";

alter table "public"."expenses" drop constraint "expenses_amount_check";

alter table "public"."expenses" drop constraint "expenses_paid_by_id_fkey";

alter table "public"."expenses" drop constraint "expenses_room_id_fkey";

alter table "public"."expenses" drop constraint "expenses_source_check";

alter table "public"."members" drop constraint "members_room_id_fkey";

alter table "public"."balance_adjustments" drop constraint "balance_adjustments_pkey";

alter table "public"."budget_additions" drop constraint "budget_additions_pkey";

alter table "public"."expenses" drop constraint "expenses_pkey";

alter table "public"."members" drop constraint "members_pkey";

alter table "public"."rooms" drop constraint "rooms_pkey";

drop index if exists "public"."balance_adjustments_date_idx";

drop index if exists "public"."balance_adjustments_member_id_idx";

drop index if exists "public"."balance_adjustments_pkey";

drop index if exists "public"."balance_adjustments_room_id_idx";

drop index if exists "public"."budget_additions_date_idx";

drop index if exists "public"."budget_additions_pkey";

drop index if exists "public"."budget_additions_room_id_idx";

drop index if exists "public"."expenses_date_idx";

drop index if exists "public"."expenses_paid_by_id_idx";

drop index if exists "public"."expenses_pkey";

drop index if exists "public"."expenses_room_id_idx";

drop index if exists "public"."members_pkey";

drop index if exists "public"."members_room_id_idx";

drop index if exists "public"."rooms_pkey";

drop table "public"."balance_adjustments";

drop table "public"."budget_additions";

drop table "public"."expenses";

drop table "public"."members";

drop table "public"."rooms";

drop policy "receipts: allow public delete" on "storage"."objects";

drop policy "receipts: allow public read" on "storage"."objects";

drop policy "receipts: allow public upload" on "storage"."objects";


