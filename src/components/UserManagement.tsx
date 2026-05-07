import {
	Pencil,
	Trash2,
	Plus,
	Check,
	X,
	Users,
	SlidersHorizontal,
	User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardAction,
	CardFooter,
} from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { calculateCurrentBalances } from "@/lib/chartUtils";
import {
	MEMBER_COLORS,
	type Member,
	type BalanceAdjustment,
} from "@/lib/types";
import { useState, useEffect, useMemo, type SubmitEvent } from "react";
import { usePagination, Paginator } from "./Paginator";

const PAGE_SIZE = 8;

// ── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.map((w) => w[0]?.toUpperCase() ?? "")
		.slice(0, 2)
		.join("");
}

function getContrastColor(hex: string): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	// Perceived brightness (YIQ)
	const yiq = (r * 299 + g * 587 + b * 114) / 1000;
	return yiq >= 128 ? "#1a1a1a" : "#ffffff";
}

// ── Color Swatch ───────────────────────────────────────────────────────────

interface ColorSwatchProps {
	color: string;
	selected: boolean;
	onClick: () => void;
}

function ColorSwatch({ color, selected, onClick }: ColorSwatchProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			title={color}
			className="relative size-7 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
			style={{ backgroundColor: color }}
		>
			{selected && (
				<Check
					className="absolute inset-0 m-auto size-3.5"
					style={{ color: getContrastColor(color) }}
				/>
			)}
		</button>
	);
}

// ── Inline Edit Form ────────────────────────────────────────────────────────

interface EditRowProps {
	member: Member;
	onSave: (name: string, color: string) => void;
	onCancel: () => void;
	isBusy: boolean;
}

function EditRow({ member, onSave, onCancel, isBusy }: EditRowProps) {
	const [name, setName] = useState(member.name);
	const [color, setColor] = useState(member.color);

	const handleSubmit = (e: SubmitEvent) => {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) return;
		onSave(trimmed, color);
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-3"
		>
			<div className="flex items-center gap-3">
				{/* Preview avatar */}
				<Avatar>
					<AvatarFallback
						style={{
							backgroundColor: color,
							color: getContrastColor(color),
						}}
						className="text-sm font-semibold"
					>
						{getInitials(name) || "?"}
					</AvatarFallback>
				</Avatar>

				<Input
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Member name"
					disabled={isBusy}
					autoFocus
					className="flex-1"
				/>
			</div>

			{/* Color picker */}
			<div className="flex flex-wrap gap-1.5 px-0.5">
				{MEMBER_COLORS.map((c) => (
					<ColorSwatch
						key={c}
						color={c}
						selected={color === c}
						onClick={() => setColor(c)}
					/>
				))}
			</div>

			<div className="flex justify-end gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={onCancel}
					disabled={isBusy}
				>
					<X className="size-3.5" />
					Cancel
				</Button>
				<Button
					type="submit"
					size="sm"
					disabled={isBusy || !name.trim()}
				>
					<Check className="size-3.5" />
					Save
				</Button>
			</div>
		</form>
	);
}

// ── Delete Confirmation ────────────────────────────────────────────────────

interface DeleteConfirmProps {
	member: Member;
	onConfirm: () => void;
	onCancel: () => void;
	isBusy: boolean;
}

function DeleteConfirm({
	member,
	onConfirm,
	onCancel,
	isBusy,
}: DeleteConfirmProps) {
	return (
		<div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
			<p className="text-foreground">
				Remove <span className="font-medium">{member.name}</span> from
				the trip?
			</p>
			<div className="flex justify-end gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={onCancel}
					disabled={isBusy}
				>
					Cancel
				</Button>
				<Button
					type="button"
					variant="destructive"
					size="sm"
					onClick={onConfirm}
					disabled={isBusy}
				>
					<Trash2 className="size-3.5" />
					Remove
				</Button>
			</div>
		</div>
	);
}

// ── Add Member Form ────────────────────────────────────────────────────────

interface AddMemberFormProps {
	onAdd: (name: string, color: string) => void;
	isBusy: boolean;
	usedColors: string[];
}

function AddMemberForm({ onAdd, isBusy, usedColors }: AddMemberFormProps) {
	// Pick a color not already used, or fall back to first
	const nextColor =
		MEMBER_COLORS.find((c) => !usedColors.includes(c)) ?? MEMBER_COLORS[0];

	const [name, setName] = useState("");
	const [color, setColor] = useState(nextColor);

	// Keep color suggestion fresh when usedColors changes
	useEffect(() => {
		const fresh =
			MEMBER_COLORS.find((c) => !usedColors.includes(c)) ??
			MEMBER_COLORS[0];
		setColor(fresh);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [usedColors.length]);

	const handleSubmit = (e: SubmitEvent) => {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) return;
		onAdd(trimmed, color);
		setName("");
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3"
		>
			<Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
				Add member
			</Label>

			<div className="flex items-center gap-2">
				<Avatar>
					<AvatarFallback
						style={{
							backgroundColor: color,
							color: getContrastColor(color),
						}}
						className="text-sm font-semibold"
					>
						{getInitials(name) || <Plus className="size-3.5" />}
					</AvatarFallback>
				</Avatar>

				<Input
					placeholder="Name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					disabled={isBusy}
					className="flex-1"
				/>

				<Button
					type="submit"
					size="sm"
					disabled={isBusy || !name.trim()}
				>
					<Plus className="size-3.5" />
					Add
				</Button>
			</div>

			{/* Color swatches */}
			<div className="flex flex-wrap gap-1.5 px-0.5">
				{MEMBER_COLORS.map((c) => (
					<ColorSwatch
						key={c}
						color={c}
						selected={color === c}
						onClick={() => setColor(c)}
					/>
				))}
			</div>
		</form>
	);
}

// ── Main Component ─────────────────────────────────────────────────────────

export function UserManagement() {
	const { state, actions } = useStore();
	const { members, status, expenses, balanceAdjustments } = state;
	const currency = state.room?.currency ?? "USD";

	const isBusy = status === "loading";

	// Track which member is being edited, pending deletion, or balance-adjusted
	const [editingId, setEditingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [adjustingId, setAdjustingId] = useState<string | null>(null);

	const handleEdit = (id: string) => {
		setDeletingId(null);
		setAdjustingId(null);
		setEditingId(id);
	};

	const handleSave = async (id: string, name: string, color: string) => {
		await actions.updateMember(id, name, color);
		setEditingId(null);
	};

	const handleDeleteRequest = (id: string) => {
		setEditingId(null);
		setAdjustingId(null);
		setDeletingId(id);
	};

	const handleDeleteConfirm = async (id: string) => {
		await actions.removeMember(id);
		setDeletingId(null);
	};

	const handleAdd = async (name: string, color: string) => {
		await actions.addMember(name, color);
	};

	const {
		page,
		setPage,
		totalPages,
		totalItems,
		paged: pagedMembers,
		pageSize,
	} = usePagination(members as Member[], PAGE_SIZE);

	const handlePageChange = (newPage: number) => {
		setEditingId(null);
		setDeletingId(null);
		setAdjustingId(null);
		setPage(newPage);
	};

	const currentBalances = useMemo(
		() =>
			calculateCurrentBalances(
				members as Member[],
				expenses,
				balanceAdjustments as BalanceAdjustment[],
			),
		[members, expenses, balanceAdjustments],
	);

	const usedColors = (members as Member[]).map((m: Member) => m.color);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Users className="size-4 text-primary" />
					Members
				</CardTitle>
				<CardAction>
					<Badge variant="secondary" className="tabular-nums">
						{members.length}
					</Badge>
				</CardAction>
			</CardHeader>

			<CardContent className="space-y-2">
				{/* Member list */}
				{members.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
						<User className="size-8 opacity-30" />
						<p className="text-sm">No members yet</p>
						<p className="text-xs opacity-60">
							Add members to start tracking expenses and balances
						</p>
					</div>
				) : (
					<ul className="space-y-1">
						{(pagedMembers as Member[]).map((member: Member) => (
							<li key={member.id} className="space-y-1">
								{/* ── Normal row ── */}
								{editingId !== member.id &&
									deletingId !== member.id &&
									adjustingId !== member.id && (
										<div className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors group">
											<Avatar size="default">
												<AvatarFallback
													style={{
														backgroundColor:
															member.color,
														color: getContrastColor(
															member.color,
														),
													}}
													className="text-sm font-semibold"
												>
													{getInitials(member.name)}
												</AvatarFallback>
											</Avatar>

											<span className="flex-1 font-medium leading-none">
												{member.name}
											</span>
											<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
												<Button
													type="button"
													variant="ghost"
													size="icon-sm"
													onClick={() =>
														handleEdit(member.id)
													}
													disabled={isBusy}
													title="Edit member"
												>
													<Pencil className="size-3.5" />
												</Button>
												<Button
													type="button"
													variant="ghost"
													size="icon-sm"
													onClick={() =>
														handleDeleteRequest(
															member.id,
														)
													}
													disabled={isBusy}
													title="Remove member"
													className="text-destructive hover:text-destructive hover:bg-destructive/10"
												>
													<Trash2 className="size-3.5" />
												</Button>
											</div>
											{/* Balance badge */}
											{(() => {
												const bal =
													currentBalances[
														member.id
													] ?? 0;
												if (Math.abs(bal) < 0.005)
													return null;
												const isPositive = bal > 0;
												return (
													<span
														className={`text-sm font-mono font-medium ${isPositive ? "text-emerald-600" : "text-destructive"}`}
													>
														{isPositive ? "+" : ""}
														{new Intl.NumberFormat(
															"en-US",
															{
																style: "currency",
																currency,
																minimumFractionDigits: 0,
																maximumFractionDigits: 0,
															},
														).format(bal)}
													</span>
												);
											})()}
										</div>
									)}

								{/* ── Inline edit ── */}
								{editingId === member.id && (
									<EditRow
										member={member}
										onSave={(name, color) =>
											handleSave(member.id, name, color)
										}
										onCancel={() => setEditingId(null)}
										isBusy={isBusy}
									/>
								)}

								{/* ── Delete confirmation ── */}
								{deletingId === member.id && (
									<DeleteConfirm
										member={member}
										onConfirm={() =>
											handleDeleteConfirm(member.id)
										}
										onCancel={() => setDeletingId(null)}
										isBusy={isBusy}
									/>
								)}
							</li>
						))}
					</ul>
				)}

				{/* Add Member */}
				<AddMemberForm
					onAdd={handleAdd}
					isBusy={isBusy}
					usedColors={usedColors}
				/>
			</CardContent>

			{totalPages > 1 && (
				<CardFooter>
					<Paginator
						page={page}
						totalPages={totalPages}
						totalItems={totalItems}
						pageSize={pageSize}
						onPageChange={handlePageChange}
					/>
				</CardFooter>
			)}
		</Card>
	);
}
