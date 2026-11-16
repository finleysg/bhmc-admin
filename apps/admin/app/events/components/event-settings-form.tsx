"use client"

import Link from "next/link"
import { startTransition, useActionState, useState } from "react"
import { toast } from "sonner"

import { getEventTypeName, getRegistrationTypeName, getStartTypeName } from "@repo/domain/functions"
import {
	AgeRestrictionTypeChoices,
	EventStatusChoices,
	EventTypeChoices,
	RegistrationTypeChoices,
	SkinTypeChoices,
	StartTypeChoices,
	type ClubEvent,
	type ContentTag,
} from "@repo/domain/types"

import { ContentEditor } from "@/components/content-editor"
import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import { Checkbox } from "@/components/shadcn/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/shadcn/field"
import { Input } from "@/components/shadcn/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/shadcn/select"
import { toClubLocalInput } from "@/lib/club-time"
import type { FormState } from "@/lib/form-state"

import { NONE, type SettingsField } from "../event-settings"

type Option = { value: string; label: string }
const options = (values: Record<string, string>, label: (v: string) => string): Option[] =>
	Object.values(values).map((value) => ({ value, label: label(value) }))

const EVENT_TYPES = options(EventTypeChoices, getEventTypeName)
const STATUSES: Option[] = [
	{ value: EventStatusChoices.SCHEDULED, label: "Scheduled" },
	{ value: EventStatusChoices.TENTATIVE, label: "Tentative" },
	{ value: EventStatusChoices.CANCELED, label: "Canceled" },
]
const START_TYPES = options(StartTypeChoices, getStartTypeName)
const REGISTRATION_TYPES = options(RegistrationTypeChoices, getRegistrationTypeName)
const SKINS_TYPES: Option[] = [
	{ value: SkinTypeChoices.INDIVIDUAL, label: "Individual" },
	{ value: SkinTypeChoices.TEAM, label: "Team" },
	{ value: SkinTypeChoices.NONE, label: "No skins" },
]
const AGE_RESTRICTIONS: Option[] = [
	{ value: AgeRestrictionTypeChoices.NONE, label: "None" },
	{ value: AgeRestrictionTypeChoices.OVER, label: "Over" },
	{ value: AgeRestrictionTypeChoices.UNDER, label: "Under" },
]

const TAB_FIELDS = {
	event: [
		"name",
		"eventType",
		"status",
		"startDate",
		"startTime",
		"season",
		"rounds",
		"startType",
		"skinsType",
		"groupSize",
		"totalGroups",
		"teeTimeSplits",
		"starterTimeInterval",
		"teamSize",
		"seasonPoints",
	],
	registration: [
		"registrationType",
		"canChoose",
		"ghinRequired",
		"minimumSignupGroupSize",
		"maximumSignupGroupSize",
		"registrationMaximum",
		"signupWaves",
		"ageRestrictionType",
		"ageRestriction",
	],
	dates: ["prioritySignupStart", "signupStart", "signupEnd", "paymentsEnd"],
	links: ["portalUrl", "externalUrl", "defaultTagId"],
	notes: ["notes"],
} satisfies Record<string, SettingsField[]>

type Tab = keyof typeof TAB_FIELDS
const TABS = Object.keys(TAB_FIELDS) as Tab[]
const TAB_LABELS: Record<Tab, string> = {
	event: "Event",
	registration: "Registration",
	dates: "Dates",
	links: "Links",
	notes: "Notes",
}

// Matches the tab bar on the public site's policies page.
const TAB_LIST_CLASS =
	"flex w-full flex-wrap justify-start gap-1 rounded-lg border bg-muted p-1 group-data-[orientation=horizontal]/tabs:h-auto"
const TAB_TRIGGER_CLASS =
	"h-auto flex-none border-0 px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground data-[state=active]:shadow-sm"

function tabHasError(tab: Tab, errors: Partial<Record<SettingsField, string>>): boolean {
	return TAB_FIELDS[tab].some((f: SettingsField) => errors[f])
}

/** Settings a new event starts with. */
const NEW_EVENT: Partial<ClubEvent> = {
	eventType: EventTypeChoices.WEEKNIGHT,
	registrationType: RegistrationTypeChoices.MEMBER,
	status: EventStatusChoices.SCHEDULED,
	startType: StartTypeChoices.TEETIMES,
	ageRestrictionType: AgeRestrictionTypeChoices.NONE,
	season: new Date().getFullYear() + 1,
	starterTimeInterval: 0,
	teamSize: 1,
	canChoose: false,
	ghinRequired: false,
}

type SettingsAction = (
	prev: FormState<SettingsField>,
	formData: FormData,
) => Promise<FormState<SettingsField>>

/** A tab with its own content and forms, shown after the settings tabs. */
export interface ExtraTab {
	value: string
	label: string
	content: React.ReactNode
}

export function EventSettingsForm({
	event,
	newEventDefaults,
	action,
	submitLabel,
	cancelHref,
	extraTabs = [],
	copyFromEventId,
	tags = [],
}: {
	event?: ClubEvent
	/** For a new event (no `event`): values that replace the built-in starting values, such as the season. */
	newEventDefaults?: Partial<ClubEvent>
	action: SettingsAction
	submitLabel: string
	cancelHref?: string
	extraTabs?: ExtraTab[]
	/** Submitted with the form, so creating the event also copies this event's courses, fees, and sessions. */
	copyFromEventId?: number
	/** Choices for the photo tag. */
	tags?: ContentTag[]
}) {
	const [state, formAction, isPending] = useActionState(
		async (prev: FormState<SettingsField>, formData: FormData) => {
			const result = await action(prev, formData)
			if (result.status === "success") toast.success(result.message)
			const withError = TABS.find((t) => tabHasError(t, result.fieldErrors ?? {}))
			if (withError) setTab(withError)
			return result
		},
		{ status: "idle" },
	)
	const [selected, setTab] = useState<string>("event")
	// A tab that is no longer shown (e.g. Fees after turning registration off) falls back to Event.
	const tab =
		TABS.includes(selected as Tab) || extraTabs.some((t) => t.value === selected)
			? selected
			: "event"
	const onSettingsTab = TABS.includes(tab as Tab)
	const [notes, setNotes] = useState(event?.notes ?? "")
	const values = event ?? { ...NEW_EVENT, ...newEventDefaults }
	const errors = state.fieldErrors ?? {}

	const field = (name: SettingsField) => ({ name, errors })

	return (
		<Tabs value={tab} onValueChange={setTab} className="space-y-4">
			<TabsList className={TAB_LIST_CLASS}>
				{TABS.map((t) => (
					<TabsTrigger key={t} value={t} className={TAB_TRIGGER_CLASS}>
						{TAB_LABELS[t]}
						{tabHasError(t, errors) && (
							<>
								<span className="size-2 rounded-full bg-destructive" aria-hidden="true" />
								<span className="sr-only">(has errors)</span>
							</>
						)}
					</TabsTrigger>
				))}
				{extraTabs.map((t) => (
					<TabsTrigger key={t.value} value={t.value} className={TAB_TRIGGER_CLASS}>
						{t.label}
					</TabsTrigger>
				))}
			</TabsList>
			<form
				// onSubmit rather than action: an action-prop submission resets the form (ADR 0005).
				onSubmit={(e) => {
					e.preventDefault()
					const formData = new FormData(e.currentTarget)
					startTransition(() => formAction(formData))
				}}
				className="space-y-8"
				// Hidden, not unmounted, on the other tabs: unsaved settings survive switching tabs.
				hidden={!onSettingsTab}
				noValidate
			>
				{state.status === "error" && (
					<Alert variant="destructive">
						<AlertDescription>{state.message}</AlertDescription>
					</Alert>
				)}

				{copyFromEventId && <input type="hidden" name="copyFromEventId" value={copyFromEventId} />}
				<fieldset disabled={isPending}>
					{/* Every panel stays mounted so its fields are always submitted. */}
					<TabsContent
						value="event"
						forceMount
						className="space-y-4 pt-4 data-[state=inactive]:hidden"
					>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<TextField {...field("name")} label="Name" value={values.name} required wide />
							<ChoiceField
								{...field("eventType")}
								label="Event type"
								value={values.eventType}
								options={EVENT_TYPES}
							/>
							<ChoiceField
								{...field("status")}
								label="Status"
								value={values.status}
								options={STATUSES}
							/>
							<NumberField {...field("season")} label="Season" value={values.season} required />
							<TextField
								{...field("startDate")}
								label="Date"
								type="date"
								value={values.startDate}
								required
							/>
							<TextField
								{...field("startTime")}
								label="Start time"
								value={values.startTime}
								description='For example "3:00 PM" or "8:00 AM Shotgun"'
							/>
							<NumberField {...field("rounds")} label="Rounds" value={values.rounds} />
							<ChoiceField
								{...field("startType")}
								label="Start type"
								value={values.startType}
								options={START_TYPES}
								optional
							/>
							<ChoiceField
								{...field("skinsType")}
								label="Skins"
								value={values.skinsType}
								options={SKINS_TYPES}
								optional
							/>
							<NumberField
								{...field("teamSize")}
								label="Team size"
								value={values.teamSize}
								required
							/>
							<NumberField {...field("groupSize")} label="Group size" value={values.groupSize} />
							<NumberField
								{...field("totalGroups")}
								label="Groups per course"
								value={values.totalGroups}
								description="Tee times per course, when players choose tee times"
							/>
							<TextField
								{...field("teeTimeSplits")}
								label="Tee time splits"
								value={values.teeTimeSplits}
								description='Minutes between tee times, for example "9" or "8,9"'
							/>
							<NumberField
								{...field("starterTimeInterval")}
								label="Starter time interval"
								value={values.starterTimeInterval}
								required
								description="Leave a gap after this many tee times (0 for none)"
							/>
							<NumberField
								{...field("seasonPoints")}
								label="Season points"
								value={values.seasonPoints}
							/>
						</div>
					</TabsContent>
					<TabsContent
						value="registration"
						forceMount
						className="space-y-4 pt-4 data-[state=inactive]:hidden"
					>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:gap-8">
								<CheckboxField
									name="canChoose"
									label="Players choose their tee time or starting hole"
									checked={values.canChoose}
								/>
								<CheckboxField
									name="ghinRequired"
									label="GHIN required"
									checked={values.ghinRequired}
								/>
							</div>
							<ChoiceField
								{...field("registrationType")}
								label="Registration type"
								value={values.registrationType}
								options={REGISTRATION_TYPES}
							/>
							<NumberField
								{...field("registrationMaximum")}
								label="Registration maximum"
								value={values.registrationMaximum}
							/>
							<NumberField
								{...field("minimumSignupGroupSize")}
								label="Minimum signup group size"
								value={values.minimumSignupGroupSize}
							/>
							<NumberField
								{...field("maximumSignupGroupSize")}
								label="Maximum signup group size"
								value={values.maximumSignupGroupSize}
							/>
							<ChoiceField
								{...field("ageRestrictionType")}
								label="Age restriction"
								value={values.ageRestrictionType}
								options={AGE_RESTRICTIONS}
							/>
							<NumberField {...field("ageRestriction")} label="Age" value={values.ageRestriction} />
							<NumberField
								{...field("signupWaves")}
								label="Signup waves"
								value={values.signupWaves}
							/>
						</div>
					</TabsContent>
					<TabsContent
						value="dates"
						forceMount
						className="space-y-4 pt-4 data-[state=inactive]:hidden"
					>
						<FieldDescription>Club time (Central).</FieldDescription>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<DateTimeField
								{...field("prioritySignupStart")}
								label="Priority signup start"
								value={values.prioritySignupStart}
							/>
							<DateTimeField
								{...field("signupStart")}
								label="Signup start"
								value={values.signupStart}
							/>
							<DateTimeField {...field("signupEnd")} label="Signup end" value={values.signupEnd} />
							<DateTimeField
								{...field("paymentsEnd")}
								label="Payments end"
								value={values.paymentsEnd}
							/>
						</div>
					</TabsContent>
					<TabsContent
						value="links"
						forceMount
						className="space-y-4 pt-4 data-[state=inactive]:hidden"
					>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<TextField
								{...field("portalUrl")}
								label="Golf Genius portal URL"
								value={values.portalUrl}
								type="url"
							/>
							<TextField
								{...field("externalUrl")}
								label="External URL"
								value={values.externalUrl}
								type="url"
							/>
							<ChoiceField
								{...field("defaultTagId")}
								label="Photo tag"
								value={values.defaultTagId == null ? null : String(values.defaultTagId)}
								options={tags.map((t) => ({ value: String(t.id), label: t.name }))}
								optional
								description="The public event page shows photos with this tag."
							/>
						</div>
					</TabsContent>
					<TabsContent
						value="notes"
						forceMount
						className="space-y-4 pt-4 data-[state=inactive]:hidden"
					>
						<Field data-invalid={!!errors.notes}>
							<FieldLabel>Notes</FieldLabel>
							<ContentEditor
								value={notes}
								onChange={setNotes}
								disabled={isPending}
								minHeight="160px"
							/>
							<input type="hidden" name="notes" value={notes} />
							<FieldError>{errors.notes}</FieldError>
						</Field>
					</TabsContent>
				</fieldset>

				<div className="flex justify-end gap-2">
					{cancelHref && (
						<Button variant="outline" asChild>
							<Link href={cancelHref}>Cancel</Link>
						</Button>
					)}
					<Button type="submit" disabled={isPending}>
						{isPending ? "Saving..." : submitLabel}
					</Button>
				</div>
			</form>
			{extraTabs.map((t) => (
				<TabsContent key={t.value} value={t.value}>
					{t.content}
				</TabsContent>
			))}
		</Tabs>
	)
}

interface FieldProps {
	name: SettingsField
	label: string
	errors: Partial<Record<SettingsField, string>>
	description?: string
	required?: boolean
}

function Label({ name, label, required }: Pick<FieldProps, "name" | "label" | "required">) {
	return (
		<FieldLabel htmlFor={name}>
			{label}
			{required && <span className="text-destructive">*</span>}
		</FieldLabel>
	)
}

function TextField({
	name,
	label,
	errors,
	description,
	required,
	value,
	type = "text",
	wide,
}: FieldProps & { value?: string | null; type?: string; wide?: boolean }) {
	return (
		<Field
			data-invalid={!!errors[name]}
			className={wide ? "sm:col-span-2 lg:col-span-3" : undefined}
		>
			<Label name={name} label={label} required={required} />
			<Input
				id={name}
				name={name}
				type={type}
				defaultValue={value ?? ""}
				aria-invalid={!!errors[name]}
			/>
			{description && <FieldDescription>{description}</FieldDescription>}
			<FieldError>{errors[name]}</FieldError>
		</Field>
	)
}

function NumberField({
	name,
	label,
	errors,
	description,
	required,
	value,
}: FieldProps & { value?: number | null }) {
	return (
		<Field data-invalid={!!errors[name]}>
			<Label name={name} label={label} required={required} />
			<Input
				id={name}
				name={name}
				type="number"
				inputMode="numeric"
				min={0}
				step={1}
				defaultValue={value ?? ""}
				aria-invalid={!!errors[name]}
			/>
			{description && <FieldDescription>{description}</FieldDescription>}
			<FieldError>{errors[name]}</FieldError>
		</Field>
	)
}

function DateTimeField({ name, label, errors, value }: FieldProps & { value?: string | null }) {
	return (
		<Field data-invalid={!!errors[name]}>
			<Label name={name} label={label} />
			<Input
				id={name}
				name={name}
				type="datetime-local"
				defaultValue={toClubLocalInput(value)}
				aria-invalid={!!errors[name]}
			/>
			<FieldError>{errors[name]}</FieldError>
		</Field>
	)
}

function ChoiceField({
	name,
	label,
	errors,
	value,
	options: choices,
	optional,
	description,
}: FieldProps & { value?: string | null; options: Option[]; optional?: boolean }) {
	return (
		<Field data-invalid={!!errors[name]}>
			<Label name={name} label={label} />
			<Select name={name} defaultValue={value ?? (optional ? NONE : undefined)}>
				<SelectTrigger id={name} className="w-full" aria-invalid={!!errors[name]}>
					<SelectValue placeholder="Choose..." />
				</SelectTrigger>
				<SelectContent>
					{optional && <SelectItem value={NONE}>Not set</SelectItem>}
					{choices.map((o) => (
						<SelectItem key={o.value} value={o.value}>
							{o.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{description && <FieldDescription>{description}</FieldDescription>}
			<FieldError>{errors[name]}</FieldError>
		</Field>
	)
}

function CheckboxField({
	name,
	label,
	checked,
}: {
	name: string
	label: string
	checked?: boolean
}) {
	return (
		<Field orientation="horizontal" className="w-auto">
			<Checkbox id={name} name={name} defaultChecked={checked} />
			<FieldLabel htmlFor={name}>{label}</FieldLabel>
		</Field>
	)
}
