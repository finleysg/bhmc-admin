export class EventReportQueryDto {
	sort?: "team" | "ghin" | "age" | "fullName" = "team"
	dir?: "asc" | "desc" = "asc"
	filterGhin?: string
	filterTee?: string
	filterFirstName?: string
	filterLastName?: string
	filterEmail?: string
	filterSignedUpBy?: string
}
