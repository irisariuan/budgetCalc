import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
	supabase,
	isOnline,
	mapRoom,
	mapMember,
	mapExpense,
	mapBudgetAddition,
	uploadReceiptFile,
	fileToDataUrl,
} from "@/lib/supabase";
import type { DbMember, DbExpense, DbBudgetAddition } from "@/lib/supabase";
import type {
	AppAction,
	AppState,
	BudgetAddition,
	Expense,
	Member,
	Room,
} from "@/lib/types";

// ─── Local-storage schema ─────────────────────────────────────────────────────

interface LocalRoomData {
	room: Room;
	members: Member[];
	expenses: Expense[];
	budgetAdditions: BudgetAddition[];
	lastUpdated: string;
}

interface LocalData {
	[roomId: string]: LocalRoomData;
}

// ─── Actions interface ────────────────────────────────────────────────────────

interface StoreActions {
	createRoom: (name: string, currency?: string) => Promise<void>;
	/** Returns false if the room was not found. */
	joinRoom: (roomId: string) => Promise<boolean>;
	leaveRoom: () => void;
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
		receiptFile?: File | null;
	}) => Promise<void>;
	removeExpense: (expenseId: string) => Promise<void>;
	addBudgetAddition: (data: {
		description: string;
		amount: number;
		date: string;
	}) => Promise<void>;
	removeBudgetAddition: (id: string) => Promise<void>;
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
	expenses: [],
	budgetAdditions: [],
	error: null,
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
			return { ...initialState, status: isOnline ? "idle" : "offline" };
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
		case "SET_EXPENSES":
			return { ...state, expenses: action.payload };
		case "ADD_EXPENSE":
			return { ...state, expenses: [...state.expenses, action.payload] };
		case "REMOVE_EXPENSE":
			return {
				...state,
				expenses: state.expenses.filter((e) => e.id !== action.payload),
			};
		case "SET_BUDGET_ADDITIONS":
			return { ...state, budgetAdditions: action.payload };
		case "ADD_BUDGET_ADDITION":
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
		default:
			return state;
	}
}

// ─── Context ──────────────────────────────────────────────────────────────────

const StoreContext = createContext<StoreContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: React.ReactNode }) {
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

			const [membersRes, expensesRes, budgetRes] = await Promise.all([
				supabase.from("members").select("*").eq("room_id", roomId),
				supabase.from("expenses").select("*").eq("room_id", roomId),
				supabase
					.from("budget_additions")
					.select("*")
					.eq("room_id", roomId),
			]);

			dispatch({ type: "SET_ROOM", payload: mapRoom(roomRow) });
			dispatch({
				type: "SET_MEMBERS",
				payload: (membersRes.data ?? []).map(mapMember),
			});
			dispatch({
				type: "SET_EXPENSES",
				payload: (expensesRes.data ?? []).map(mapExpense),
			});
			dispatch({
				type: "SET_BUDGET_ADDITIONS",
				payload: (budgetRes.data ?? []).map(mapBudgetAddition),
			});
			dispatch({ type: "SET_STATUS", payload: "synced" });

			return true;
		},
		[],
	);

	// ── Mount: read room from URL ─────────────────────────────────────────────

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const roomId = params.get("room");

		if (!roomId) {
			dispatch({
				type: "SET_STATUS",
				payload: isOnline ? "idle" : "offline",
			});
			return;
		}

		if (isOnline) {
			loadRoomFromSupabase(roomId).then((found) => {
				if (found) subscribeToRoom(roomId);
			});
		} else {
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
				dispatch({ type: "SET_STATUS", payload: "offline" });
			}
		}

		return () => {
			if (supabase && channelRef.current) {
				supabase.removeChannel(channelRef.current);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// ── Actions ───────────────────────────────────────────────────────────────

	const actions = useMemo<StoreActions>(
		() => ({
			// ── createRoom ─────────────────────────────────────────────────────────
			createRoom: async (name, currency = "USD") => {
				const id = generateRoomId();
				const now = new Date().toISOString();
				const room: Room = { id, name, currency, createdAt: now };

				if (supabase) {
					dispatch({ type: "SET_STATUS", payload: "loading" });

					const { error } = await supabase
						.from("rooms")
						.insert({ id, name, currency });

					if (error) {
						dispatch({ type: "SET_ERROR", payload: error.message });
						dispatch({ type: "SET_STATUS", payload: "error" });
						return;
					}

					dispatch({ type: "SET_ROOM", payload: room });
					dispatch({ type: "SET_MEMBERS", payload: [] });
					dispatch({ type: "SET_EXPENSES", payload: [] });
					dispatch({ type: "SET_BUDGET_ADDITIONS", payload: [] });
					dispatch({ type: "SET_STATUS", payload: "synced" });
					subscribeToRoom(id);
				} else {
					dispatch({ type: "SET_ROOM", payload: room });
					dispatch({ type: "SET_MEMBERS", payload: [] });
					dispatch({ type: "SET_EXPENSES", payload: [] });
					dispatch({ type: "SET_BUDGET_ADDITIONS", payload: [] });
					dispatch({ type: "SET_STATUS", payload: "offline" });

					const data = readLocalData();
					data[id] = {
						room,
						members: [],
						expenses: [],
						budgetAdditions: [],
						lastUpdated: now,
					};
					writeLocalData(data);
				}

				pushRoomToUrl(id);
			},

			// ── joinRoom ───────────────────────────────────────────────────────────
			joinRoom: async (roomId) => {
				if (supabase) {
					const found = await loadRoomFromSupabase(roomId);
					if (!found) return false;
					subscribeToRoom(roomId);
					pushRoomToUrl(roomId);
					return true;
				}

				// localStorage path
				const data = readLocalData();
				const roomData = data[roomId];
				if (!roomData) return false;

				dispatch({ type: "SET_ROOM", payload: roomData.room });
				dispatch({ type: "SET_MEMBERS", payload: roomData.members });
				dispatch({ type: "SET_EXPENSES", payload: roomData.expenses });
				dispatch({
					type: "SET_BUDGET_ADDITIONS",
					payload: roomData.budgetAdditions,
				});
				dispatch({ type: "SET_STATUS", payload: "offline" });
				pushRoomToUrl(roomId);
				return true;
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

			// ── updateMember ───────────────────────────────────────────────────────
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
				let receiptUrl: string | null = null;
				if (expenseData.receiptFile) {
					if (supabase) {
						// Upload to Supabase Storage
						receiptUrl = await uploadReceiptFile(
							room.id,
							id,
							expenseData.receiptFile,
						);
					} else {
						// Offline: store as base64 data URL in localStorage
						try {
							receiptUrl = await fileToDataUrl(
								expenseData.receiptFile,
							);
						} catch {
							// skip receipt if conversion fails
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
					receiptUrl,
					createdAt: now,
				};

				if (supabase) {
					const { error } = await supabase.from("expenses").insert({
						id,
						room_id: room.id,
						description: expense.description,
						amount: expense.amount,
						date: expense.date,
						source: expense.source,
						paid_by_id: expense.paidById,
						split_among: expense.splitAmong,
						receipt_url: receiptUrl,
					});
					if (error)
						dispatch({ type: "SET_ERROR", payload: error.message });
					// Real-time INSERT handler will dispatch ADD_EXPENSE.
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
					const { error } = await supabase
						.from("expenses")
						.delete()
						.eq("id", expenseId);
					if (error)
						dispatch({ type: "SET_ERROR", payload: error.message });
					// Real-time DELETE handler will dispatch REMOVE_EXPENSE.
				} else {
					dispatch({ type: "REMOVE_EXPENSE", payload: expenseId });
					saveRoomToLocalStorage(room.id, {
						expenses: expenses.filter((e) => e.id !== expenseId),
					});
				}
			},

			// ── addBudgetAddition ──────────────────────────────────────────────────
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
					// Real-time INSERT handler will dispatch ADD_BUDGET_ADDITION.
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
					const { error } = await supabase
						.from("budget_additions")
						.delete()
						.eq("id", id);
					if (error)
						dispatch({ type: "SET_ERROR", payload: error.message });
					// Real-time DELETE handler will dispatch REMOVE_BUDGET_ADDITION.
				} else {
					dispatch({ type: "REMOVE_BUDGET_ADDITION", payload: id });
					saveRoomToLocalStorage(room.id, {
						budgetAdditions: budgetAdditions.filter(
							(b) => b.id !== id,
						),
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
