import { createClient } from "@supabase/supabase-js";
import type {
	Room,
	Member,
	BudgetAddition,
	BalanceAdjustment,
	Expense,
} from "./types";

export type DbRoom = {
	id: string;
	name: string;
	currency: string;
	created_at: string;
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
		Functions: Record<string, never>;
	};
};

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY as string | undefined;

export const supabase =
	supabaseUrl && supabaseKey
		? createClient<Database>(supabaseUrl, supabaseKey)
		: null;

export const isOnline = supabase !== null;

export function mapRoom(row: DbRoom): Room {
	return {
		id: row.id,
		name: row.name,
		currency: row.currency,
		createdAt: row.created_at,
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
	files: File[],
): Promise<string[] | null> {
	if (!supabase) return null;
	const urls = [];
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
		// Use index to ensure unique filenames for multiple receipts
		const path = `${roomId}/${expenseId}_${i}.${ext}`;

		const { error } = await supabase.storage
			.from(RECEIPTS_BUCKET)
			.upload(path, file, { upsert: true, contentType: file.type });
		if (error) {
			console.error("Receipt upload failed:", error.message);
			continue;
		}
		const {
			data: { publicUrl },
		} = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(path);
		urls.push(publicUrl);
	}

	return urls;
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
