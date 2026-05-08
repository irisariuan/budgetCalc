export const MEMBER_COLORS = [
	"#FF6B6B",
	"#4ECDC4",
	"#45B7D1",
	"#96CEB4",
	"#FECA57",
	"#FF9FF3",
	"#54A0FF",
	"#5F27CD",
	"#FF9F43",
	"#1DD1A1",
	"#00D2D3",
	"#C8D6E5",
];

export interface Room {
	id: string;
	name: string;
	currency: string;
	createdAt: string;
	/** Whether this room is shown in the public room list on the join screen. */
	listed: boolean;
	/** If true, only users with an invite link or admin invitation can join. */
	inviteOnly: boolean;
	/** Unique 8-character alphanumeric code for joining via invite link. */
	inviteCode: string;
}

export interface Member {
	id: string;
	roomId: string;
	name: string;
	color: string;
	createdAt: string;
	role?: "admin" | "member";
}

export type ExpenseSource = "group" | "personal";

export interface Expense {
	id: string;
	roomId: string;
	description: string;
	amount: number;
	date: string;
	source: ExpenseSource;
	paidById: string | null; // member id if personal, null if from group budget
	splitAmong: string[]; // array of member ids who share this expense
	receiptUrl: string[] | null;
	createdAt: string;
}

export interface BudgetAddition {
	id: string;
	roomId: string;
	description: string;
	amount: number;
	date: string;
	createdAt: string;
}

export interface BalanceAdjustment {
	id: string;
	roomId: string;
	memberId: string;
	amount: number; // positive = credit (adds to balance), negative = debit (subtracts)
	description: string;
	date: string;
	createdAt: string;
}

export interface BudgetDataPoint {
	date: string;
	added: number; // cumulative budget added up to this date
	spent: number; // cumulative group expenses up to this date
	remaining: number; // added - spent
}

export interface BalanceDataPoint {
	date: string;
	[memberId: string]: number | string; // member balance at this date
}

export type StoreStatus = "idle" | "loading" | "synced" | "error" | "offline";

export interface AuthUser {
	id: string;
	email: string | null;
	fullName: string | null;
	avatarUrl: string | null;
	isAnonymous: boolean;
}

export interface AppState {
	status: StoreStatus;
	room: Room | null;
	members: Member[];
	expenses: Expense[];
	budgetAdditions: BudgetAddition[];
	balanceAdjustments: BalanceAdjustment[];
	error: string | null;
	user: AuthUser | null;
	/** True while the initial Supabase session check is in flight. */
	authLoading: boolean;
	/** The current user's role within the room (admin | member). */
	userRole: "admin" | "member" | null;
}

export type AppAction =
	| { type: "SET_STATUS"; payload: StoreStatus }
	| { type: "SET_ERROR"; payload: string | null }
	| { type: "SET_ROOM"; payload: Room }
	| { type: "CLEAR_ROOM" }
	| { type: "REMOVE_ROOM"; payload: string }
	| { type: "SET_MEMBERS"; payload: Member[] }
	| { type: "ADD_MEMBER"; payload: Member }
	| { type: "REMOVE_MEMBER"; payload: string }
	| { type: "UPDATE_MEMBER"; payload: Member }
	| { type: "SET_EXPENSES"; payload: Expense[] }
	| { type: "ADD_EXPENSE"; payload: Expense }
	| { type: "REMOVE_EXPENSE"; payload: string }
	| { type: "UPDATE_EXPENSE"; payload: Expense }
	| { type: "SET_BUDGET_ADDITIONS"; payload: BudgetAddition[] }
	| { type: "ADD_BUDGET_ADDITION"; payload: BudgetAddition }
	| { type: "REMOVE_BUDGET_ADDITION"; payload: string }
	| { type: "SET_BALANCE_ADJUSTMENTS"; payload: BalanceAdjustment[] }
	| { type: "ADD_BALANCE_ADJUSTMENT"; payload: BalanceAdjustment }
	| { type: "REMOVE_BALANCE_ADJUSTMENT"; payload: string }
	| { type: "UPDATE_BALANCE_ADJUSTMENT"; payload: BalanceAdjustment }
	| { type: "SET_USER"; payload: AuthUser | null }
	| { type: "SET_AUTH_LOADING"; payload: boolean }
	| { type: "SET_USER_ROLE"; payload: "admin" | "member" | null };
