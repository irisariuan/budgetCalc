import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type {
	Room,
	Member,
	BudgetAddition,
	BalanceAdjustment,
	Expense,
	AuthUser,
	RoomParticipant,
} from "./types";

export type DbRoomMember = {
	room_id: string;
	user_id: string;
	role: "admin" | "member";
	joined_at: string;
	display_name: string | null;
};

export type DbRoom = {
	id: string;
	name: string;
	currency: string;
	created_at: string;
	/** Defaults to true; false hides the room from the public list. */
	listed: boolean;
	/** If true, only users with an invite link or admin invitation can join. */
	invite_only: boolean;
	/** Unique 8-char alphanumeric code for joining via invite link. */
	invite_code: string;
};

export type DbMember = {
	id: string;
	room_id: string;
	name: string;
	color: string;
	created_at: string;
};

export type DbBudgetAddition = {
	id: string;
	room_id: string;
	description: string | null;
	amount: number;
	date: string;
	created_at: string;
};

export type DbBalanceAdjustment = {
	id: string;
	room_id: string;
	member_id: string;
	amount: number;
	description: string;
	date: string;
	created_at: string;
};

export type DbExpense = {
	id: string;
	room_id: string;
	description: string;
	amount: number;
	date: string;
	source: "group" | "personal";
	paid_by_id: string | null;
	split_among: string[];
	receipt_url: string[] | null;
	created_at: string;
};

export type Database = {
	public: {
		Tables: {
			rooms: {
				Row: DbRoom;
				Insert: Omit<DbRoom, "created_at">;
				Update: Partial<Omit<DbRoom, "id" | "created_at">>;
				Relationships: [];
			};
			room_members: {
				Row: DbRoomMember;
				Insert: Omit<DbRoomMember, "joined_at" | "display_name"> & {
					joined_at?: string;
					display_name?: string | null;
				};
				Update: Partial<Pick<DbRoomMember, "display_name">>;
				Relationships: [];
			};
			members: {
				Row: DbMember;
				Insert: Omit<DbMember, "created_at">;
				Update: Partial<
					Omit<DbMember, "id" | "room_id" | "created_at">
				>;
				Relationships: [];
			};
			budget_additions: {
				Row: DbBudgetAddition;
				Insert: Omit<DbBudgetAddition, "created_at">;
				Update: Partial<
					Omit<DbBudgetAddition, "id" | "room_id" | "created_at">
				>;
				Relationships: [];
			};
			balance_adjustments: {
				Row: DbBalanceAdjustment;
				Insert: Omit<DbBalanceAdjustment, "created_at"> & {
					created_at?: string;
				};
				Update: Partial<
					Omit<DbBalanceAdjustment, "id" | "room_id" | "created_at">
				>;
				Relationships: [];
			};
			expenses: {
				Row: DbExpense;
				Insert: Omit<DbExpense, "created_at"> & { created_at?: string };
				Update: Partial<
					Omit<DbExpense, "id" | "room_id" | "created_at">
				>;
				Relationships: [];
			};
		};
		Views: Record<string, never>;
		Functions: {
			set_member_role: {
				Args: {
					p_room_id: string;
					p_target_user_id: string;
					p_role: "admin" | "member";
				};
				Returns: { success: boolean; error?: string };
			};
			join_room: {
				Args: { p_room_id?: string; p_invite_code?: string };
				Returns: { found: boolean; error?: string; room_id?: string };
			};
			quit_room: {
				Args: { p_room_id: string };
				Returns: {
					success: boolean;
					error?: string;
					was_last_admin?: boolean;
				};
			};
			delete_room: {
				Args: { p_room_id: string };
				Returns: { success: boolean; error?: string };
			};
		};
	};
};

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY as string | undefined;

export const supabase =
	supabaseUrl && supabaseKey
		? createClient<Database>(supabaseUrl, supabaseKey)
		: null;

export const isOnline = supabase !== null;

export function mapUser(user: User): AuthUser {
	const meta = user.user_metadata ?? {};
	return {
		id: user.id,
		email: user.email ?? null,
		fullName: (meta.full_name ?? meta.name ?? null) as string | null,
		avatarUrl: (meta.avatar_url ?? null) as string | null,
		isAnonymous: user.is_anonymous ?? false,
	};
}

export function mapRoomParticipant(row: DbRoomMember): RoomParticipant {
	return {
		userId: row.user_id,
		role: row.role,
		joinedAt: row.joined_at,
		displayName: row.display_name ?? "Anonymous",
	};
}

export function mapRoom(row: DbRoom): Room {
	return {
		id: row.id,
		name: row.name,
		currency: row.currency,
		createdAt: row.created_at,
		// Default true so existing rows without the column stay visible.
		listed: row.listed ?? true,
		inviteOnly: row.invite_only ?? false,
		inviteCode: row.invite_code ?? "",
	};
}

export function mapMember(row: DbMember): Member {
	return {
		id: row.id,
		roomId: row.room_id,
		name: row.name,
		color: row.color,
		createdAt: row.created_at,
	};
}

export function mapBudgetAddition(row: DbBudgetAddition): BudgetAddition {
	return {
		id: row.id,
		roomId: row.room_id,
		description: row.description ?? "",
		amount: row.amount,
		date: row.date,
		createdAt: row.created_at,
	};
}

export function mapBalanceAdjustment(
	row: DbBalanceAdjustment,
): BalanceAdjustment {
	return {
		id: row.id,
		roomId: row.room_id,
		memberId: row.member_id,
		amount: row.amount,
		description: row.description,
		date: row.date,
		createdAt: row.created_at,
	};
}

export function mapExpense(row: DbExpense): Expense {
	return {
		id: row.id,
		roomId: row.room_id,
		description: row.description,
		amount: row.amount,
		date: row.date,
		source: row.source,
		paidById: row.paid_by_id,
		splitAmong: row.split_among,
		receiptUrl: row.receipt_url,
		createdAt: row.created_at,
	};
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const RECEIPTS_BUCKET = "receipts";

/**
 * Uploads receipt images to Supabase Storage.
 * Returns the public URL, or null if offline / upload failed.
 */
export async function uploadReceiptFile(
	roomId: string,
	expenseId: string,
	receipts: Array<{ id: string; file: File }>,
): Promise<Array<{ id: string; url: string }> | null> {
	if (!supabase) return null;
	const results = [];
	for (const receipt of receipts) {
		const ext = receipt.file.name.split(".").pop()?.toLowerCase() || "jpg";
		// Use receipt UUID for unique filename
		const path = `${roomId}/${expenseId}_${receipt.id}.${ext}`;

		const { error } = await supabase.storage
			.from(RECEIPTS_BUCKET)
			.upload(path, receipt.file, {
				upsert: true,
				contentType: receipt.file.type,
			});
		if (error) {
			console.error("Receipt upload failed:", error.message);
			continue;
		}
		const {
			data: { publicUrl },
		} = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(path);
		results.push({ id: receipt.id, url: publicUrl });
	}

	return results;
}

/**
 * Deletes a receipt from Supabase Storage by inferring its path from the URL.
 */
export async function deleteReceiptFile(publicUrl: string): Promise<void> {
	if (!supabase) return;
	try {
		const url = new URL(publicUrl);
		const marker = `/object/public/${RECEIPTS_BUCKET}/`;
		const idx = url.pathname.indexOf(marker);
		if (idx === -1) return;
		const path = decodeURIComponent(
			url.pathname.slice(idx + marker.length),
		);
		await supabase.storage.from(RECEIPTS_BUCKET).remove([path]);
	} catch {
		// best-effort
	}
}
