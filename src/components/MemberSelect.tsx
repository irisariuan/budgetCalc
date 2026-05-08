import type { Member } from "@/lib/types";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

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
