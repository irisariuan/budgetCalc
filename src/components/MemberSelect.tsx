import type { Member } from "@/lib/types";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "./ui/label";
import type { Dispatch, SetStateAction } from "react";
import { Checkbox } from "./ui/checkbox";

interface MemberSelectProps {
	members: Member[];
	value: string;
	onValueChange: (val: string) => void;
	placeholder?: string;
}

export function MemberSelect({
	members,
	value,
	onValueChange,
	placeholder = "Select member…",
}: MemberSelectProps) {
	if (members.length === 0) {
		return (
			<div className="text-sm text-muted-foreground">
				No members found
			</div>
		);
	}
	return (
		<Select value={value} onValueChange={onValueChange}>
			<SelectTrigger className="w-full">
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{members.map((m) => (
					<SelectItem key={m.id} value={m.id}>
						<span
							className="inline-block size-2 rounded-full shrink-0 mr-1.5"
							style={{ backgroundColor: m.color }}
						/>
						{m.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

export function MemberMultiSelect({
	members,
	setSelectedMemberIds,
	selectedMemberIds,
}: {
	setSelectedMemberIds: Dispatch<SetStateAction<string[]>>;
	selectedMemberIds: string[];
	members: Member[];
}) {
	const allSelected =
		members.length > 0 && selectedMemberIds.length === members.length;
	const toggleAll = () => {
		if (allSelected) {
			setSelectedMemberIds([]);
		} else {
			setSelectedMemberIds(members.map((m) => m.id));
		}
	};
	const toggleMember = (memberId: string) => {
		if (selectedMemberIds.includes(memberId)) {
			setSelectedMemberIds((prev) =>
				prev.filter((id) => id !== memberId),
			);
		} else {
			setSelectedMemberIds((prev) => [...prev, memberId]);
		}
	};
	return (
		<div>
			{/* Member checkboxes */}
			<div className="rounded-lg border border-input divide-y divide-border overflow-hidden">
				{members.length === 0 ? (
					<p className="px-3 py-2.5 text-muted-foreground text-center">
						No members in this room yet.
					</p>
				) : (
					members.map((m) => {
						const checked = selectedMemberIds.includes(m.id);
						return (
							<label
								key={m.id}
								className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
							>
								<Checkbox
									checked={checked}
									onCheckedChange={() => toggleMember(m.id)}
								/>
								<span
									className="inline-block size-2.5 rounded-full shrink-0"
									style={{
										backgroundColor: m.color,
									}}
								/>
								<span className="flex-1">{m.name}</span>
							</label>
						);
					})
				)}
			</div>
			<button
				type="button"
				onClick={toggleAll}
				className="text-sm text-primary hover:underline underline-offset-2 transition-colors ml-auto block mt-1"
			>
				{allSelected ? "Deselect all" : "Select all"}
			</button>
		</div>
	);
}
