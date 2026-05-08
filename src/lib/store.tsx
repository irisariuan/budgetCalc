import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	type ReactNode,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
	supabase,
	isOnline,
	mapRoom,
	mapUser,
	mapMember,
	mapExpense,
	mapBudgetAddition,
	mapBalanceAdjustment,
	mapRoomParticipant,
	uploadReceiptFile,
	deleteReceiptFile,
} from "@/lib/supabase";
import type {
	DbRoom,
	DbMember,
	DbExpense,
	DbBudgetAddition,
	DbBalanceAdjustment,
	DbRoomMember,
} from "@/lib/supabase";
import type {
	AppAction,
	AppState,
	AuthUser,
	BalanceAdjustment,
	BudgetAddition,
	Expense,
	Member,
	Room,
	RoomParticipant,
} from "@/lib/types";
import type { Receipt } from "@/components/ReceiptEditor";

// ─── Local-storage schema ─────────────────────────────────────────────────────

interface LocalRoomData {
	room: Room;
	members: Member[];
	expenses: Expense[];
	budgetAdditions: BudgetAddition[];
	balanceAdjustments: BalanceAdjustment[];
	lastUpdated: string;
}

interface LocalData {
	[roomId: string]: LocalRoomData;
}

// ─── Actions interface ────────────────────────────────────────────────────────

interface StoreActions {
	createRoom: (name: string, currency?: string) => Promise<void>;
	/** Returns false if the room was not found, "invite_only" if the room requires invite-only access, or true on success. */
	joinRoom: (roomId: string) => Promise<boolean | "invite_only">;
	/** Leave room view */
	leaveRoom: () => void;
	/** Remove user from room */
	quitRoom: (roomId: string) => Promise<void>;
	deleteRoom: (roomId: string) => Promise<void>;
	signInWithGoogle: () => Promise<void>;
	signInWithGitHub: () => Promise<void>;
	signInAnonymously: (OAuthToken: string) => Promise<void>;
	signOut: () => Promise<void>;
	addMember: (name: string, color: string) => Promise<void>;
	removeMember: (memberId: string) => Promise<void>;
	updateMember: (
		memberId: string,
		name: string,
		color: string,
	) => Promise<void>;
	addExpense: (data: {
		description: string;
		amount: number;
		date: string;
		source: "group" | "personal";
		paidById?: string | null;
		splitAmong: string[];
		receipts: Receipt[];
	}) => Promise<void>;
	removeExpense: (expenseId: string) => Promise<void>;
	updateExpense: (
		expenseId: string,
		data: {
			description: string;
			amount: number;
			date: string;
			source: "group" | "personal";
			paidById: string | null;
			splitAmong: string[];
			receipts: Receipt[];
		},
	) => Promise<void>;
	restoreExpense: (expense: Expense) => Promise<void>;
	addBudgetAddition: (data: {
		description: string;
		amount: number;
		date: string;
	}) => Promise<void>;
	removeBudgetAddition: (id: string) => Promise<void>;
	addBalanceAdjustment: (data: {
		memberId: string;
		amount: number;
		description: string;
		date: string;
	}) => Promise<void>;
	removeBalanceAdjustment: (id: string) => Promise<void>;
	updateBalanceAdjustment: (
		adjustmentId: string,
		data: {
			memberId: string;
			amount: number;
			description: string;
			date: string;
		},
	) => Promise<void>;
	restoreBalanceAdjustment: (adjustment: BalanceAdjustment) => Promise<void>;
	updateRoom: (data: {
		name?: string;
		listed?: boolean;
		inviteOnly?: boolean;
		inviteCode?: string;
	}) => Promise<void>;
	kickParticipant: (userId: string) => Promise<void>;
	/** Update the current user's display name in every room they belong to. */
	updateNickname: (nickname: string) => Promise<void>;
}

interface StoreContextValue {
	state: AppState;
	actions: StoreActions;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = "budget_calc_v1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generates a 6-character uppercase alphanumeric room code. */
function generateRoomId(): string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	return Array.from(
		{ length: 6 },
		() => chars[Math.floor(Math.random() * chars.length)],
	).join("");
}

/** Generates an 8-character uppercase alphanumeric invite code. */
function generateInviteCode(): string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	return Array.from(
		{ length: 8 },
		() => chars[Math.floor(Math.random() * chars.length)],
	).join("");
}

function readLocalData(): LocalData {
	if (typeof window === "undefined") return {};
	try {
		const raw = localStorage.getItem(LS_KEY);
		return raw ? (JSON.parse(raw) as LocalData) : {};
	} catch {
		return {};
	}
}

function writeLocalData(data: LocalData): void {
	if (typeof window === "undefined") return;
	localStorage.setItem(LS_KEY, JSON.stringify(data));
}

function saveRoomToLocalStorage(
	roomId: string,
	updates: Partial<Omit<LocalRoomData, "lastUpdated">>,
): void {
	const data = readLocalData();
	if (!data[roomId]) return;
	data[roomId] = {
		...data[roomId],
		...updates,
		lastUpdated: new Date().toISOString(),
	};
	writeLocalData(data);
}

/**
 * Pushes the current room ID to the URL as a query parameter without reloading the page,
 */
function pushRoomToUrl(roomId: string): void {
	const url = new URL(window.location.href);
	url.searchParams.set("room", roomId);
	window.history.pushState({}, "", url.toString());
}

function clearRoomFromUrl(): void {
	const url = new URL(window.location.href);
	url.searchParams.delete("room");
	window.history.pushState({}, "", url.toString());
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

const initialState: AppState = {
	status: "idle",
	room: null,
	members: [],
	roomParticipants: [],
	expenses: [],
	budgetAdditions: [],
	balanceAdjustments: [],
	error: null,
	user: null,
	// Start as loading so the app waits for getSession() before rendering.
	// Set to false immediately when Supabase is unavailable.
	authLoading: isOnline,
	userRole: null,
};

function reducer(state: AppState, action: AppAction): AppState {
	switch (action.type) {
		case "SET_STATUS":
			return { ...state, status: action.payload };
		case "SET_ERROR":
			return { ...state, error: action.payload };
		case "SET_ROOM":
			return { ...state, room: action.payload };
		case "CLEAR_ROOM":
			return {
				...initialState,
				status: isOnline ? "idle" : "offline",
				// Keep the user signed in when leaving a room.
				user: state.user,
				authLoading: false,
			};
		case "REMOVE_ROOM":
			return {
				...initialState,
				status: isOnline ? "idle" : "offline",
				user: state.user,
				authLoading: false,
			};
		case "SET_MEMBERS":
			return { ...state, members: action.payload };
		case "ADD_MEMBER":
			return { ...state, members: [...state.members, action.payload] };
		case "REMOVE_MEMBER":
			return {
				...state,
				members: state.members.filter((m) => m.id !== action.payload),
			};
		case "UPDATE_MEMBER":
			return {
				...state,
				members: state.members.map((m) =>
					m.id === action.payload.id ? action.payload : m,
				),
			};
		case "SET_ROOM_PARTICIPANTS":
			return { ...state, roomParticipants: action.payload };
		case "ADD_ROOM_PARTICIPANT":
			if (
				state.roomParticipants.some(
					(p) => p.userId === action.payload.userId,
				)
			) {
				return state;
			}
			return {
				...state,
				roomParticipants: [...state.roomParticipants, action.payload],
			};
		case "REMOVE_ROOM_PARTICIPANT":
			return {
				...state,
				roomParticipants: state.roomParticipants.filter(
					(p) => p.userId !== action.payload,
				),
			};
		case "UPDATE_ROOM_PARTICIPANT":
			return {
				...state,
				roomParticipants: state.roomParticipants.map((p) =>
					p.userId === action.payload.userId ? action.payload : p,
				),
			};
		case "SET_EXPENSES":
			return { ...state, expenses: action.payload };
		case "ADD_EXPENSE":
			// Prevent duplicate additions (e.g., from both local optimistic update and realtime)
			if (state.expenses.some((e) => e.id === action.payload.id)) {
				return state;
			}
			return { ...state, expenses: [...state.expenses, action.payload] };
		case "REMOVE_EXPENSE":
			return {
				...state,
				expenses: state.expenses.filter((e) => e.id !== action.payload),
			};
		case "UPDATE_EXPENSE":
			return {
				...state,
				expenses: state.expenses.map((e) =>
					e.id === action.payload.id ? action.payload : e,
				),
			};
		case "SET_BUDGET_ADDITIONS":
			return { ...state, budgetAdditions: action.payload };
		case "ADD_BUDGET_ADDITION":
			// Prevent duplicate additions (e.g., from both local optimistic update and realtime)
			if (state.budgetAdditions.some((a) => a.id === action.payload.id)) {
				return state;
			}
			return {
				...state,
				budgetAdditions: [...state.budgetAdditions, action.payload],
			};
		case "REMOVE_BUDGET_ADDITION":
			return {
				...state,
				budgetAdditions: state.budgetAdditions.filter(
					(b) => b.id !== action.payload,
				),
			};
		case "SET_BALANCE_ADJUSTMENTS":
			return { ...state, balanceAdjustments: action.payload };
		case "ADD_BALANCE_ADJUSTMENT":
			// Prevent duplicate additions (e.g., from both local optimistic update and realtime)
			if (
				state.balanceAdjustments.some((a) => a.id === action.payload.id)
			) {
				return state;
			}
			return {
				...state,
				balanceAdjustments: [
					...state.balanceAdjustments,
					action.payload,
				],
			};
		case "REMOVE_BALANCE_ADJUSTMENT":
			return {
				...state,
				balanceAdjustments: state.balanceAdjustments.filter(
					(b) => b.id !== action.payload,
				),
			};
		case "UPDATE_BALANCE_ADJUSTMENT":
			return {
				...state,
				balanceAdjustments: state.balanceAdjustments.map((a) =>
					a.id === action.payload.id ? action.payload : a,
				),
			};
		case "SET_USER":
			return { ...state, user: action.payload };
		case "SET_AUTH_LOADING":
			return { ...state, authLoading: action.payload };
		case "SET_USER_ROLE":
			return { ...state, userRole: action.payload };
		default:
			return state;
	}
}

// ─── Context ──────────────────────────────────────────────────────────────────

const StoreContext = createContext<StoreContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: ReactNode }) {
	const [state, dispatch] = useReducer(reducer, {
		...initialState,
		status: isOnline ? "idle" : "offline",
	});

	/**
	 * A ref that always points to the latest state so that async callbacks and
	 * stable action functions can read the current state without stale closures.
	 */
	const stateRef = useRef(state);
	stateRef.current = state;

	/** Holds the active Supabase Realtime channel so it can be cleaned up. */
	const channelRef = useRef<RealtimeChannel | null>(null);

	// ── Real-time subscription ────────────────────────────────────────────────

	const subscribeToRoom = useCallback((roomId: string) => {
		if (!supabase) return;

		// Remove any previous subscription before creating a new one.
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current);
			channelRef.current = null;
		}

		const channel = supabase
			.channel(`room:${roomId}`)
			// ── members ──────────────────────────────────────────────────────────
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "members",
					filter: `room_id=eq.${roomId}`,
				},
				(payload) => {
					dispatch({
						type: "ADD_MEMBER",
						payload: mapMember(payload.new as DbMember),
					});
				},
			)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "members",
					filter: `room_id=eq.${roomId}`,
				},
				(payload) => {
					dispatch({
						type: "UPDATE_MEMBER",
						payload: mapMember(payload.new as DbMember),
					});
				},
			)
			.on(
				"postgres_changes",
				{
					event: "DELETE",
					schema: "public",
					table: "members",
					filter: `room_id=eq.${roomId}`,
				},
				(payload) => {
					dispatch({
						type: "REMOVE_MEMBER",
						payload: (payload.old as { id: string }).id,
					});
				},
			)
			// ── room_members ──────────────────────────────────────────────────────────
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "room_members",
					filter: `room_id=eq.${roomId}`,
				},
				(payload) => {
					dispatch({
						type: "ADD_ROOM_PARTICIPANT",
						payload: mapRoomParticipant(
							payload.new as DbRoomMember,
						),
					});
				},
			)
			.on(
				"postgres_changes",
				{
					event: "DELETE",
					schema: "public",
					table: "room_members",
					filter: `room_id=eq.${roomId}`,
				},
				(payload) => {
					dispatch({
						type: "REMOVE_ROOM_PARTICIPANT",
						payload: (payload.old as DbRoomMember).user_id,
					});
				},
			)
			// ── expenses ─────────────────────────────────────────────────────────
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "expenses",
					filter: `room_id=eq.${roomId}`,
				},
				(payload) => {
					dispatch({
						type: "ADD_EXPENSE",
						payload: mapExpense(payload.new as DbExpense),
					});
				},
			)
			.on(
				"postgres_changes",
				{
					event: "DELETE",
					schema: "public",
					table: "expenses",
					filter: `room_id=eq.${roomId}`,
				},
				(payload) => {
					dispatch({
						type: "REMOVE_EXPENSE",
						payload: (payload.old as { id: string }).id,
					});
				},
			)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "expenses",
					filter: `room_id=eq.${roomId}`,
				},
				(payload) => {
					dispatch({
						type: "UPDATE_EXPENSE",
						payload: mapExpense(payload.new as DbExpense),
					});
				},
			)
			// ── budget_additions ──────────────────────────────────────────────────
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "budget_additions",
					filter: `room_id=eq.${roomId}`,
				},
				(payload) => {
					dispatch({
						type: "ADD_BUDGET_ADDITION",
						payload: mapBudgetAddition(
							payload.new as DbBudgetAddition,
						),
					});
				},
			)
			.on(
				"postgres_changes",
				{
					event: "DELETE",
					schema: "public",
					table: "budget_additions",
					filter: `room_id=eq.${roomId}`,
				},
				(payload) => {
					dispatch({
						type: "REMOVE_BUDGET_ADDITION",
						payload: (payload.old as { id: string }).id,
					});
				},
			)
			// ── balance_adjustments ───────────────────────────────────────────────────
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "balance_adjustments",
					filter: `room_id=eq.${roomId}`,
				},
				(payload) => {
					dispatch({
						type: "ADD_BALANCE_ADJUSTMENT",
						payload: mapBalanceAdjustment(
							payload.new as DbBalanceAdjustment,
						),
					});
				},
			)
			.on(
				"postgres_changes",
				{
					event: "DELETE",
					schema: "public",
					table: "balance_adjustments",
					filter: `room_id=eq.${roomId}`,
				},
				(payload) => {
					dispatch({
						type: "REMOVE_BALANCE_ADJUSTMENT",
						payload: (payload.old as { id: string }).id,
					});
				},
			)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "balance_adjustments",
					filter: `room_id=eq.${roomId}`,
				},
				(payload) => {
					dispatch({
						type: "UPDATE_BALANCE_ADJUSTMENT",
						payload: mapBalanceAdjustment(
							payload.new as DbBalanceAdjustment,
						),
					});
				},
			)
			.subscribe();

		channelRef.current = channel;
	}, []);

	// ── Supabase room loader ──────────────────────────────────────────────────

	const loadRoomFromSupabase = useCallback(
		async (roomId: string): Promise<boolean> => {
			if (!supabase) return false;

			dispatch({ type: "SET_STATUS", payload: "loading" });

			const { data: roomRow, error: roomError } = await supabase
				.from("rooms")
				.select("*")
				.eq("id", roomId)
				.single();

			if (roomError || !roomRow) {
				dispatch({
					type: "SET_STATUS",
					payload: isOnline ? "idle" : "offline",
				});
				return false;
			}

			// Verify user is a member of this room before fetching data.
			const userId = stateRef.current.user?.id;
			let userRole: "admin" | "member" | null = null;
			if (userId) {
				const { data: rm } = await supabase
					.from("room_members")
					.select("role")
					.eq("room_id", roomId)
					.eq("user_id", userId)
					.single();
				if (!rm) {
					dispatch({
						type: "SET_STATUS",
						payload: isOnline ? "idle" : "offline",
					});
					return false;
				}
				userRole = rm?.role ?? null;
			}

			const [
				membersRes,
				expensesRes,
				budgetRes,
				adjustmentsRes,
				roomMembersRes,
			] = await Promise.all([
				supabase.from("members").select("*").eq("room_id", roomId),
				supabase.from("expenses").select("*").eq("room_id", roomId),
				supabase
					.from("budget_additions")
					.select("*")
					.eq("room_id", roomId),
				supabase
					.from("balance_adjustments")
					.select("*")
					.eq("room_id", roomId),
				supabase.from("room_members").select("*").eq("room_id", roomId),
			]);

			if (membersRes.error)
				console.error(
					"[loadRoom] members query failed:",
					membersRes.error,
				);
			if (expensesRes.error)
				console.error(
					"[loadRoom] expenses query failed:",
					expensesRes.error,
				);
			if (budgetRes.error)
				console.error(
					"[loadRoom] budget_additions query failed:",
					budgetRes.error,
				);
			if (adjustmentsRes.error)
				console.error(
					"[loadRoom] balance_adjustments query failed:",
					adjustmentsRes.error,
				);
			if (roomMembersRes.error)
				console.error(
					"[loadRoom] room_members query failed:",
					roomMembersRes.error,
				);

			dispatch({ type: "SET_ROOM", payload: mapRoom(roomRow) });
			dispatch({
				type: "SET_MEMBERS",
				payload: (membersRes.data ?? []).map(mapMember),
			});
			dispatch({
				type: "SET_ROOM_PARTICIPANTS",
				payload: (roomMembersRes.data ?? []).map(mapRoomParticipant),
			});
			dispatch({
				type: "SET_EXPENSES",
				payload: (expensesRes.data ?? []).map(mapExpense),
			});
			dispatch({
				type: "SET_BUDGET_ADDITIONS",
				payload: (budgetRes.data ?? []).map(mapBudgetAddition),
			});
			dispatch({
				type: "SET_BALANCE_ADJUSTMENTS",
				payload: (adjustmentsRes.data ?? []).map(mapBalanceAdjustment),
			});
			dispatch({ type: "SET_USER_ROLE", payload: userRole });
			dispatch({ type: "SET_STATUS", payload: "synced" });

			return true;
		},
		[],
	);

	// ── Join room helper (used by mount effect and actions) ────────────────────

	const joinRoomInternal = useCallback(
		async (code: string): Promise<boolean | "invite_only"> => {
			if (supabase) {
				let resolvedRoomId: string | null = null;
				let inviteOnlyError = false;

				if (code.length === 6) {
					const { data: result, error: rpcError } =
						await supabase.rpc("join_room", {
							p_room_id: code,
							p_invite_code: "",
						});
					if (!rpcError) {
						if (result?.error === "invite_only") {
							inviteOnlyError = true;
						} else if (result?.found) {
							resolvedRoomId = result.room_id ?? code;
						}
					}
				}

				if (!resolvedRoomId && !inviteOnlyError) {
					const { data: result, error: rpcError } =
						await supabase.rpc("join_room", {
							p_room_id: "",
							p_invite_code: code,
						});
					if (!rpcError && result?.found) {
						resolvedRoomId = result.room_id ?? code;
					}
				}

				if (!resolvedRoomId) {
					if (inviteOnlyError) {
						dispatch({
							type: "SET_ERROR",
							payload:
								"This room is invite-only. Use the invite link instead.",
						});
						return "invite_only";
					}
					return false;
				}

				const found = await loadRoomFromSupabase(resolvedRoomId);
				if (!found) return false;
				subscribeToRoom(resolvedRoomId);
				pushRoomToUrl(resolvedRoomId);
				return true;
			}

			// localStorage path
			const data = readLocalData();
			const roomData = data[code];
			if (!roomData) return false;

			dispatch({ type: "SET_ROOM", payload: roomData.room });
			dispatch({ type: "SET_MEMBERS", payload: roomData.members });
			dispatch({ type: "SET_ROOM_PARTICIPANTS", payload: [] });
			dispatch({ type: "SET_EXPENSES", payload: roomData.expenses });
			dispatch({
				type: "SET_BUDGET_ADDITIONS",
				payload: roomData.budgetAdditions,
			});
			dispatch({
				type: "SET_BALANCE_ADJUSTMENTS",
				payload: roomData.balanceAdjustments ?? [],
			});
			dispatch({ type: "SET_STATUS", payload: "offline" });
			pushRoomToUrl(code);
			return true;
		},
		[loadRoomFromSupabase, subscribeToRoom],
	);

	// ── Mount: auth check → then room from URL ───────────────────────────────

	useEffect(() => {
		// ── Offline / no Supabase ──────────────────────────────────────────────
		if (!supabase) {
			dispatch({ type: "SET_AUTH_LOADING", payload: false });
			const params = new URLSearchParams(window.location.search);
			const roomId = params.get("room");
			if (!roomId) {
				dispatch({ type: "SET_STATUS", payload: "offline" });
				return;
			}
			const data = readLocalData();
			const roomData = data[roomId];
			if (roomData) {
				dispatch({ type: "SET_ROOM", payload: roomData.room });
				dispatch({ type: "SET_MEMBERS", payload: roomData.members });
				dispatch({ type: "SET_EXPENSES", payload: roomData.expenses });
				dispatch({
					type: "SET_BUDGET_ADDITIONS",
					payload: roomData.budgetAdditions,
				});
				dispatch({
					type: "SET_BALANCE_ADJUSTMENTS",
					payload: roomData.balanceAdjustments ?? [],
				});
				dispatch({ type: "SET_STATUS", payload: "offline" });
			}
			return;
		}

		// ── Online: check session first, then load room ─────────────────────────
		supabase.auth.getSession().then(({ data: { session } }) => {
			dispatch({
				type: "SET_USER",
				payload: session?.user ? mapUser(session.user) : null,
			});
			dispatch({ type: "SET_AUTH_LOADING", payload: false });

			if (session?.user) {
				const params = new URLSearchParams(window.location.search);
				const roomId = params.get("room");
				const inviteCode = params.get("invite");
				if (roomId) {
					loadRoomFromSupabase(roomId).then((found) => {
						if (found) subscribeToRoom(roomId);
					});
				} else if (inviteCode) {
					// Join via invite link
					joinRoomInternal(inviteCode).then((success) => {
						if (success) {
							// Clear the invite param from URL
							const url = new URL(window.location.href);
							url.searchParams.delete("invite");
							window.history.replaceState({}, "", url.toString());
						}
					});
				} else {
					dispatch({ type: "SET_STATUS", payload: "idle" });
				}
			}
		});

		// Listen for sign-in / sign-out events after initial load.
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			dispatch({
				type: "SET_USER",
				payload: session?.user ? mapUser(session.user) : null,
			});
			if (event === "SIGNED_OUT") {
				dispatch({ type: "CLEAR_ROOM" });
				clearRoomFromUrl();
			}
		});

		return () => {
			subscription.unsubscribe();
			if (supabase && channelRef.current) {
				supabase.removeChannel(channelRef.current);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// ── Actions ───────────────────────────────────────────────────────────────

	const actions = useMemo<StoreActions>(
		() => ({
			// ── signInWithGoogle ─────────────────────────────────────────────────────────
			signInWithGoogle: async () => {
				if (!supabase) return;
				await supabase.auth.signInWithOAuth({
					provider: "google",
					options: { redirectTo: window.location.origin },
				});
			},

			// ── signInWithGitHub ─────────────────────────────────────────────────────────
			signInWithGitHub: async () => {
				if (!supabase) return;
				await supabase.auth.signInWithOAuth({
					provider: "github",
					options: { redirectTo: window.location.origin },
				});
			},

			// ── signInAnonymously ───────────────────────────────────────────────────────
			signInAnonymously: async (token: string) => {
				if (!supabase) return;
				const { error } = await supabase.auth.signInAnonymously({
					options: { captchaToken: token },
				});
				console.log(error);
				if (error)
					dispatch({ type: "SET_ERROR", payload: error.message });
			},

			// ── signOut ───────────────────────────────────────────────────────────────────
			signOut: async () => {
				if (!supabase) return;
				// onAuthStateChange handles CLEAR_ROOM + SET_USER(null)
				await supabase.auth.signOut();
			},

			// ── createRoom ─────────────────────────────────────────────────────────
			createRoom: async (name, currency = "USD") => {
				const id = generateRoomId();
				const now = new Date().toISOString();
				const room: Room = {
					id,
					name,
					currency,
					createdAt: now,
					listed: true,
					inviteOnly: false,
					inviteCode: "",
				};

				if (supabase) {
					dispatch({ type: "SET_STATUS", payload: "loading" });

					const { error } = await supabase.from("rooms").insert({
						id,
						name,
						currency,
						listed: true,
						invite_only: false,
						invite_code: generateInviteCode(),
					});

					if (error) {
						dispatch({ type: "SET_ERROR", payload: error.message });
						dispatch({ type: "SET_STATUS", payload: "error" });
						throw new Error(error.message);
					}

					// Register the creator as admin of this room.
					const userId = stateRef.current.user?.id;
					if (userId) {
						await supabase.from("room_members").insert({
							room_id: id,
							user_id: userId,
							role: "admin",
						});
					}

					dispatch({ type: "SET_ROOM", payload: room });
					dispatch({ type: "SET_MEMBERS", payload: [] });
					dispatch({
						type: "SET_ROOM_PARTICIPANTS",
						payload: userId
							? [
									{
										userId,
										role: "admin",
										joinedAt: new Date().toISOString(),
										displayName:
											stateRef.current.user?.fullName ??
											stateRef.current.user?.email?.split(
												"@",
											)[0] ??
											"Anonymous",
									},
								]
							: [],
					});
					dispatch({ type: "SET_EXPENSES", payload: [] });
					dispatch({ type: "SET_BUDGET_ADDITIONS", payload: [] });
					dispatch({ type: "SET_BALANCE_ADJUSTMENTS", payload: [] });
					dispatch({ type: "SET_STATUS", payload: "synced" });
					subscribeToRoom(id);
				} else {
					dispatch({ type: "SET_ROOM", payload: room });
					dispatch({ type: "SET_MEMBERS", payload: [] });
					dispatch({ type: "SET_ROOM_PARTICIPANTS", payload: [] });
					dispatch({ type: "SET_EXPENSES", payload: [] });
					dispatch({ type: "SET_BUDGET_ADDITIONS", payload: [] });
					dispatch({ type: "SET_BALANCE_ADJUSTMENTS", payload: [] });
					dispatch({ type: "SET_STATUS", payload: "offline" });

					const data = readLocalData();
					// For offline mode, generate a local invite code.
					const inviteCode = generateInviteCode();
					data[id] = {
						room: { ...room, inviteCode },
						members: [],
						expenses: [],
						budgetAdditions: [],
						balanceAdjustments: [],
						lastUpdated: now,
					};
					writeLocalData(data);
				}

				pushRoomToUrl(id);
			},

			// ── joinRoom ─────────────────────────────────────────────────────────
			joinRoom: async (code) => {
				return joinRoomInternal(code);
			},

			// ── leaveRoom ──────────────────────────────────────────────────────────
			leaveRoom: () => {
				if (supabase && channelRef.current) {
					supabase.removeChannel(channelRef.current);
					channelRef.current = null;
				}
				dispatch({ type: "CLEAR_ROOM" });
				clearRoomFromUrl();
			},

			// ── quitRoom (remove self from room via Supabase) ──────────────────
			quitRoom: async (roomId: string) => {
				if (!supabase) return;
				const { error } = await supabase.rpc("quit_room", {
					p_room_id: roomId,
				});
				if (error) {
					dispatch({ type: "SET_ERROR", payload: error.message });
					throw error;
				}
				// Clean up real-time subscription
				if (channelRef.current) {
					supabase.removeChannel(channelRef.current);
					channelRef.current = null;
				}
				dispatch({ type: "REMOVE_ROOM", payload: roomId });
				clearRoomFromUrl();
			},

			// ── deleteRoom (admin-only, via Supabase) ──────────────────────────
			deleteRoom: async (roomId: string) => {
				if (!supabase) return;
				const { error } = await supabase.rpc("delete_room", {
					p_room_id: roomId,
				});
				if (error) {
					dispatch({ type: "SET_ERROR", payload: error.message });
					throw error;
				}
				// Clean up real-time subscription
				if (channelRef.current) {
					supabase.removeChannel(channelRef.current);
					channelRef.current = null;
				}
				dispatch({ type: "REMOVE_ROOM", payload: roomId });
				clearRoomFromUrl();
			},

			// ── addMember ──────────────────────────────────────────────────────────
			addMember: async (name, color) => {
				const { room, members } = stateRef.current;
				if (!room) return;

				const id = crypto.randomUUID();
				const now = new Date().toISOString();
				const member: Member = {
					id,
					roomId: room.id,
					name,
					color,
					createdAt: now,
				};

				if (supabase) {
					const { error } = await supabase
						.from("members")
						.insert({ id, room_id: room.id, name, color });
					if (error)
						dispatch({ type: "SET_ERROR", payload: error.message });
					// Real-time INSERT handler will dispatch ADD_MEMBER.
				} else {
					dispatch({ type: "ADD_MEMBER", payload: member });
					saveRoomToLocalStorage(room.id, {
						members: [...members, member],
					});
				}
			},

			// ── removeMember ───────────────────────────────────────────────────────
			removeMember: async (memberId) => {
				const { room, members } = stateRef.current;
				if (!room) return;

				if (supabase) {
					const { error } = await supabase
						.from("members")
						.delete()
						.eq("id", memberId);
					if (error)
						dispatch({ type: "SET_ERROR", payload: error.message });
					// Real-time DELETE handler will dispatch REMOVE_MEMBER.
				} else {
					dispatch({ type: "REMOVE_MEMBER", payload: memberId });
					saveRoomToLocalStorage(room.id, {
						members: members.filter((m) => m.id !== memberId),
					});
				}
			},

			// ── kickParticipant ───────────────────────────────────────────────────────
			kickParticipant: async (userId) => {
				const { room } = stateRef.current;
				if (!room || !supabase) return;
				const { error } = await supabase
					.from("room_members")
					.delete()
					.eq("room_id", room.id)
					.eq("user_id", userId);
				if (error) {
					dispatch({ type: "SET_ERROR", payload: error.message });
					return;
				}
				// Realtime DELETE listener will handle state, but dispatch manually as fallback
				dispatch({ type: "REMOVE_ROOM_PARTICIPANT", payload: userId });
			},

			// ── updateMember ─────────────────────────────────────────────────────
			updateMember: async (memberId, name, color) => {
				const { room, members } = stateRef.current;
				if (!room) return;

				if (supabase) {
					const { error } = await supabase
						.from("members")
						.update({ name, color })
						.eq("id", memberId);
					if (error)
						dispatch({ type: "SET_ERROR", payload: error.message });
					// Real-time UPDATE handler will dispatch UPDATE_MEMBER.
				} else {
					const existing = members.find((m) => m.id === memberId);
					if (!existing) return;
					const updated: Member = { ...existing, name, color };
					dispatch({ type: "UPDATE_MEMBER", payload: updated });
					saveRoomToLocalStorage(room.id, {
						members: members.map((m) =>
							m.id === memberId ? updated : m,
						),
					});
				}
			},

			// ── addExpense ─────────────────────────────────────────────────────────
			addExpense: async (expenseData) => {
				const { room, expenses } = stateRef.current;
				if (!room) return;

				const id = crypto.randomUUID();
				const now = new Date().toISOString();

				// ── Handle receipt file ─────────────────────────────────────────
				let receiptUrls: string[] = [];
				if (supabase && expenseData.receipts.length > 0) {
					// Separate existing URLs from new files
					const existingReceipts: Array<{ id: string; url: string }> =
						[];
					const newReceipts: Array<{ id: string; file: File }> = [];

					for (const receipt of expenseData.receipts) {
						if (receipt.file) {
							// New file to upload
							newReceipts.push({
								id: receipt.id,
								file: receipt.file,
							});
						} else if (
							receipt.url &&
							!receipt.url.startsWith("blob:")
						) {
							// Existing URL from database (when copying)
							existingReceipts.push({
								id: receipt.id,
								url: receipt.url,
							});
						}
					}

					// Start with existing URLs
					receiptUrls = existingReceipts.map((r) => r.url);

					// Upload new files
					if (newReceipts.length > 0) {
						const uploadedReceipts = await uploadReceiptFile(
							room.id,
							id,
							newReceipts,
						);
						if (uploadedReceipts) {
							receiptUrls = [
								...receiptUrls,
								...uploadedReceipts.map((r) => r.url),
							];
						}
					}
				}

				const expense: Expense = {
					id,
					roomId: room.id,
					description: expenseData.description,
					amount: expenseData.amount,
					date: expenseData.date,
					source: expenseData.source,
					paidById: expenseData.paidById ?? null,
					splitAmong: expenseData.splitAmong,
					receiptUrl: receiptUrls.length > 0 ? receiptUrls : null,
					createdAt: now,
				};

				if (supabase) {
					// Update local state immediately for instant UI feedback
					dispatch({ type: "ADD_EXPENSE", payload: expense });

					// Then insert into database
					const { error } = await supabase.from("expenses").insert({
						id,
						room_id: room.id,
						description: expense.description,
						amount: expense.amount,
						date: expense.date,
						source: expense.source,
						paid_by_id: expense.paidById,
						split_among: expense.splitAmong,
						receipt_url:
							receiptUrls.length > 0 ? receiptUrls : null,
					});
					if (error)
						dispatch({ type: "SET_ERROR", payload: error.message });
					// Real-time INSERT handler will also dispatch ADD_EXPENSE, but that's okay
				} else {
					dispatch({ type: "ADD_EXPENSE", payload: expense });
					saveRoomToLocalStorage(room.id, {
						expenses: [...expenses, expense],
					});
				}
			},

			// ── removeExpense ──────────────────────────────────────────────────────
			removeExpense: async (expenseId) => {
				const { room, expenses } = stateRef.current;
				if (!room) return;

				if (supabase) {
					// Optimistic update for instant UI feedback.
					dispatch({ type: "REMOVE_EXPENSE", payload: expenseId });
					const { error } = await supabase
						.from("expenses")
						.delete()
						.eq("id", expenseId);
					if (error)
						dispatch({ type: "SET_ERROR", payload: error.message });
					// Real-time DELETE handler will also dispatch REMOVE_EXPENSE,
					// but filtering an already-removed item is a safe no-op.
				} else {
					dispatch({ type: "REMOVE_EXPENSE", payload: expenseId });
					saveRoomToLocalStorage(room.id, {
						expenses: expenses.filter((e) => e.id !== expenseId),
					});
				}
			},

			// ── restoreExpense (undo delete) ───────────────────────────────────────────
			restoreExpense: async (expense) => {
				const { room, expenses } = stateRef.current;
				if (!room) return;

				if (supabase) {
					const { error } = await supabase.from("expenses").upsert({
						id: expense.id,
						room_id: expense.roomId,
						description: expense.description,
						amount: expense.amount,
						date: expense.date,
						source: expense.source,
						paid_by_id: expense.paidById,
						split_among: expense.splitAmong,
						receipt_url: expense.receiptUrl,
						created_at: expense.createdAt,
					});
					if (error)
						dispatch({ type: "SET_ERROR", payload: error.message });
					// Real-time INSERT handler will dispatch ADD_EXPENSE.
				} else {
					// Only restore if not already present
					if (expenses.find((e) => e.id === expense.id)) return;
					dispatch({ type: "ADD_EXPENSE", payload: expense });
					saveRoomToLocalStorage(room.id, {
						expenses: [...expenses, expense],
					});
				}
			},

			// ── updateExpense ───────────────────────────────────────────────────────
			updateExpense: async (expenseId, data) => {
				const { room, expenses } = stateRef.current;
				if (!room) return;

				const existing = expenses.find((e) => e.id === expenseId);
				if (!existing) return;

				// ── Handle receipt changes ──────────────────────────────────────
				let receiptUrls: string[] = [];

				if (supabase) {
					// Identify existing URLs vs new files
					const existingReceipts: Array<{ id: string; url: string }> =
						[];
					const newReceipts: Array<{ id: string; file: File }> = [];

					for (const receipt of data.receipts) {
						if (receipt.file) {
							// New file to upload
							newReceipts.push({
								id: receipt.id,
								file: receipt.file,
							});
						} else if (
							receipt.url &&
							!receipt.url.startsWith("blob:")
						) {
							// Existing URL from database
							existingReceipts.push({
								id: receipt.id,
								url: receipt.url,
							});
						}
					}

					// Delete receipts that were removed
					if (existing.receiptUrl) {
						const existingUrls = existingReceipts.map((r) => r.url);
						for (const oldUrl of existing.receiptUrl) {
							if (!existingUrls.includes(oldUrl)) {
								await deleteReceiptFile(oldUrl);
							}
						}
					}

					// Upload new files
					if (newReceipts.length > 0) {
						const uploadedReceipts = await uploadReceiptFile(
							room.id,
							expenseId,
							newReceipts,
						);
						if (uploadedReceipts) {
							receiptUrls = [
								...existingReceipts.map((r) => r.url),
								...uploadedReceipts.map((r) => r.url),
							];
						} else {
							receiptUrls = existingReceipts.map((r) => r.url);
						}
					} else {
						receiptUrls = existingReceipts.map((r) => r.url);
					}
				}

				const updated: Expense = {
					...existing,
					description: data.description,
					amount: data.amount,
					date: data.date,
					source: data.source,
					paidById: data.paidById,
					splitAmong: data.splitAmong,
					receiptUrl: receiptUrls.length > 0 ? receiptUrls : null,
				};

				if (supabase) {
					// Update local state immediately for instant UI feedback
					dispatch({ type: "UPDATE_EXPENSE", payload: updated });

					// Then update database
					const { error } = await supabase
						.from("expenses")
						.update({
							description: updated.description,
							amount: updated.amount,
							date: updated.date,
							source: updated.source,
							paid_by_id: updated.paidById,
							split_among: updated.splitAmong,
							receipt_url: updated.receiptUrl,
						})
						.eq("id", expenseId);
					if (error)
						dispatch({ type: "SET_ERROR", payload: error.message });
					// Realtime UPDATE handler will also dispatch UPDATE_EXPENSE, but that's okay
				} else {
					dispatch({ type: "UPDATE_EXPENSE", payload: updated });
					saveRoomToLocalStorage(room.id, {
						expenses: expenses.map((e) =>
							e.id === expenseId ? updated : e,
						),
					});
				}
			},

			// ── addBudgetAddition ──────────────────────────────────────
			addBudgetAddition: async (additionData) => {
				const { room, budgetAdditions } = stateRef.current;
				if (!room) return;

				const id = crypto.randomUUID();
				const now = new Date().toISOString();
				const addition: BudgetAddition = {
					id,
					roomId: room.id,
					description: additionData.description,
					amount: additionData.amount,
					date: additionData.date,
					createdAt: now,
				};

				if (supabase) {
					// Update local state immediately for instant UI feedback
					dispatch({
						type: "ADD_BUDGET_ADDITION",
						payload: addition,
					});

					// Then insert into database
					const { error } = await supabase
						.from("budget_additions")
						.insert({
							id,
							room_id: room.id,
							description: addition.description || null,
							amount: addition.amount,
							date: addition.date,
						});
					if (error)
						dispatch({ type: "SET_ERROR", payload: error.message });
					// Real-time INSERT handler will also dispatch ADD_BUDGET_ADDITION, but duplicate prevention handles it
				} else {
					dispatch({
						type: "ADD_BUDGET_ADDITION",
						payload: addition,
					});
					saveRoomToLocalStorage(room.id, {
						budgetAdditions: [...budgetAdditions, addition],
					});
				}
			},

			// ── removeBudgetAddition ───────────────────────────────────────────────
			removeBudgetAddition: async (id) => {
				const { room, budgetAdditions } = stateRef.current;
				if (!room) return;

				if (supabase) {
					// Optimistic update for instant UI feedback.
					dispatch({ type: "REMOVE_BUDGET_ADDITION", payload: id });
					const { error } = await supabase
						.from("budget_additions")
						.delete()
						.eq("id", id);
					if (error)
						dispatch({ type: "SET_ERROR", payload: error.message });
					// Real-time DELETE handler will also dispatch REMOVE_BUDGET_ADDITION,
					// but filtering an already-removed item is a safe no-op.
				} else {
					dispatch({ type: "REMOVE_BUDGET_ADDITION", payload: id });
					saveRoomToLocalStorage(room.id, {
						budgetAdditions: budgetAdditions.filter(
							(b) => b.id !== id,
						),
					});
				}
			},

			// ── addBalanceAdjustment ────────────────────────────────────────────
			addBalanceAdjustment: async (data) => {
				const { room, balanceAdjustments } = stateRef.current;
				if (!room) return;

				const id = crypto.randomUUID();
				const now = new Date().toISOString();
				const adjustment: BalanceAdjustment = {
					id,
					roomId: room.id,
					memberId: data.memberId,
					amount: data.amount,
					description: data.description,
					date: data.date,
					createdAt: now,
				};

				if (supabase) {
					// Update local state immediately for instant UI feedback
					dispatch({
						type: "ADD_BALANCE_ADJUSTMENT",
						payload: adjustment,
					});

					// Then insert into database
					const { error } = await supabase
						.from("balance_adjustments")
						.insert({
							id,
							room_id: room.id,
							member_id: data.memberId,
							amount: data.amount,
							description: data.description,
							date: data.date,
						});
					if (error)
						dispatch({ type: "SET_ERROR", payload: error.message });
					// Real-time INSERT will also dispatch ADD_BALANCE_ADJUSTMENT, but duplicate prevention handles it
				} else {
					dispatch({
						type: "ADD_BALANCE_ADJUSTMENT",
						payload: adjustment,
					});
					saveRoomToLocalStorage(room.id, {
						balanceAdjustments: [...balanceAdjustments, adjustment],
					});
				}
			},

			// ── removeBalanceAdjustment ─────────────────────────────────────────
			removeBalanceAdjustment: async (id) => {
				const { room, balanceAdjustments } = stateRef.current;
				if (!room) return;

				if (supabase) {
					// Optimistic update for instant UI feedback.
					dispatch({
						type: "REMOVE_BALANCE_ADJUSTMENT",
						payload: id,
					});
					const { error } = await supabase
						.from("balance_adjustments")
						.delete()
						.eq("id", id);
					if (error)
						dispatch({ type: "SET_ERROR", payload: error.message });
					// Real-time DELETE will also dispatch REMOVE_BALANCE_ADJUSTMENT,
					// but filtering an already-removed item is a safe no-op.
				} else {
					dispatch({
						type: "REMOVE_BALANCE_ADJUSTMENT",
						payload: id,
					});
					saveRoomToLocalStorage(room.id, {
						balanceAdjustments: balanceAdjustments.filter(
							(b) => b.id !== id,
						),
					});
				}
			},

			// ── restoreBalanceAdjustment (undo delete) ─────────────────────────────────
			restoreBalanceAdjustment: async (adjustment) => {
				const { room, balanceAdjustments } = stateRef.current;
				if (!room) return;

				if (supabase) {
					const { error } = await supabase
						.from("balance_adjustments")
						.upsert({
							id: adjustment.id,
							room_id: adjustment.roomId,
							member_id: adjustment.memberId,
							amount: adjustment.amount,
							description: adjustment.description,
							date: adjustment.date,
							created_at: adjustment.createdAt,
						});
					if (error)
						dispatch({ type: "SET_ERROR", payload: error.message });
					// Real-time INSERT handler will dispatch ADD_BALANCE_ADJUSTMENT.
				} else {
					if (balanceAdjustments.find((a) => a.id === adjustment.id))
						return;
					dispatch({
						type: "ADD_BALANCE_ADJUSTMENT",
						payload: adjustment,
					});
					saveRoomToLocalStorage(room.id, {
						balanceAdjustments: [...balanceAdjustments, adjustment],
					});
				}
			},

			// ── updateBalanceAdjustment ───────────────────────────────────────────
			updateBalanceAdjustment: async (adjustmentId, data) => {
				const { room, balanceAdjustments } = stateRef.current;
				if (!room) return;

				const existing = balanceAdjustments.find(
					(a) => a.id === adjustmentId,
				);
				if (!existing) return;

				const updated: BalanceAdjustment = {
					...existing,
					memberId: data.memberId,
					amount: data.amount,
					description: data.description,
					date: data.date,
				};

				if (supabase) {
					// Update local state immediately for instant UI feedback
					dispatch({
						type: "UPDATE_BALANCE_ADJUSTMENT",
						payload: updated,
					});

					// Then update database
					const { error } = await supabase
						.from("balance_adjustments")
						.update({
							member_id: updated.memberId,
							amount: updated.amount,
							description: updated.description,
							date: updated.date,
						})
						.eq("id", adjustmentId);
					if (error)
						dispatch({ type: "SET_ERROR", payload: error.message });
					// Realtime UPDATE handler will also dispatch UPDATE_BALANCE_ADJUSTMENT, but that's okay
				} else {
					dispatch({
						type: "UPDATE_BALANCE_ADJUSTMENT",
						payload: updated,
					});
					saveRoomToLocalStorage(room.id, {
						balanceAdjustments: balanceAdjustments.map((a) =>
							a.id === adjustmentId ? updated : a,
						),
					});
				}
			},

			// ── updateRoom ─────────────────────────────────────────────────────────
			updateRoom: async (data) => {
				const { room } = stateRef.current;
				if (!room) return;

				const updated: Room = { ...room, ...data };

				// Optimistic update — apply immediately so the UI reacts.
				dispatch({ type: "SET_ROOM", payload: updated });

				if (supabase) {
					const patch: Partial<Omit<DbRoom, "id" | "created_at">> =
						{};
					if (data.name !== undefined) patch.name = data.name;
					if (data.listed !== undefined) patch.listed = data.listed;
					if (data.inviteOnly !== undefined)
						patch.invite_only = data.inviteOnly;
					if (
						data.inviteCode !== undefined &&
						data.inviteCode !== room.inviteCode
					) {
						// Regenerate invite code on the server
						patch.invite_code = data.inviteCode;
					}
					const { error } = await supabase
						.from("rooms")
						.update(patch)
						.eq("id", room.id);
					if (error)
						dispatch({ type: "SET_ERROR", payload: error.message });
				} else {
					saveRoomToLocalStorage(room.id, { room: updated });
				}
			},

			// ── updateNickname ────────────────────────────────────────────────────
			updateNickname: async (nickname) => {
				const { user, roomParticipants } = stateRef.current;
				if (!user) return;

				if (supabase) {
					const { error } = await supabase
						.from("room_members")
						.update({ display_name: nickname })
						.eq("user_id", user.id);
					if (error) {
						dispatch({ type: "SET_ERROR", payload: error.message });
						return;
					}
				}

				// Optimistically update the current participant in local state.
				const participant = roomParticipants.find(
					(p) => p.userId === user.id,
				);
				if (participant) {
					dispatch({
						type: "UPDATE_ROOM_PARTICIPANT",
						payload: { ...participant, displayName: nickname },
					});
				}
			},
		}),
		// Both callbacks are stable (useCallback with [] deps) so this memo only
		// runs once, giving consumers a stable `actions` reference.
		[loadRoomFromSupabase, subscribeToRoom],
	);

	return (
		<StoreContext.Provider value={{ state, actions }}>
			{children}
		</StoreContext.Provider>
	);
}

// ─── Consumer hook ────────────────────────────────────────────────────────────

export function useStore(): StoreContextValue {
	const ctx = useContext(StoreContext);
	if (!ctx) {
		throw new Error("useStore must be used within a <StoreProvider>.");
	}
	return ctx;
}
