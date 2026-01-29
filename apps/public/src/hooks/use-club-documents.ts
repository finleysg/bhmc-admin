import { useState } from "react"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { DocumentUploadData } from "../components/document/document-upload-form"
import {
	ClubDocument,
	ClubDocumentApiSchema,
	ClubDocumentCode,
	ClubDocumentCodeApiSchema,
	ClubDocumentCodeData,
	ClubDocumentData,
} from "../models/document"
import { getMany, getOne, httpClient } from "../utils/api-client"
import { apiUrl } from "../utils/api-utils"

const clubDocumentCodesMapper = (data: ClubDocumentCodeData[] | undefined) =>
	data?.map((code) => new ClubDocumentCode(code))
const clubDocumentMapper = (data: ClubDocumentData | undefined) => new ClubDocument(data!)
const clubDocumentsMapper = (data: ClubDocumentData[] | undefined) =>
	data?.map((doc) => new ClubDocument(doc))

interface ClubDocumentArgs {
	documentId?: number
	formData: FormData
}

export function useClubDocumentCodes() {
	const endpoint = "club-document-codes"
	return useQuery({
		queryKey: ["club-document-codes"],
		queryFn: () => getMany<ClubDocumentCodeData>(endpoint, ClubDocumentCodeApiSchema),
		select: clubDocumentCodesMapper,
	})
}

export function useClubDocument(code: string) {
	const endpoint = `static-documents/?code=${code}`
	return useQuery({
		queryKey: ["club-documents", code],
		queryFn: () => getOne<ClubDocumentData>(endpoint, ClubDocumentApiSchema),
		select: clubDocumentMapper,
	})
}

export function useClubDocuments() {
	const endpoint = "static-documents"
	return useQuery({
		queryKey: ["club-documents"],
		queryFn: () => getMany<ClubDocumentData>(endpoint, ClubDocumentApiSchema),
		select: clubDocumentsMapper,
	})
}

export function useClubDocumentEdit(code: string) {
	const queryClient = useQueryClient()
	const [error, setError] = useState<Error | null>(null)

	const { mutateAsync: createDocument, status: status1 } = useMutation({
		mutationFn: (args: ClubDocumentArgs) =>
			httpClient(apiUrl("documents"), { body: args.formData }),
	})
	const { mutateAsync: updateDocument, status: status2 } = useMutation({
		mutationFn: (args: ClubDocumentArgs) =>
			httpClient(apiUrl(`documents/${args.documentId}`), { body: args.formData, method: "PUT" }),
	})
	const { mutateAsync: createClubDocument, status: status3 } = useMutation({
		mutationFn: (args: ClubDocumentArgs) =>
			httpClient(apiUrl("static-documents"), { body: args.formData }),
	})
	const { mutateAsync: updateClubDocument, status: status4 } = useMutation({
		mutationFn: (args: ClubDocumentArgs) =>
			httpClient(apiUrl(`static-documents/${args.documentId}`), {
				body: args.formData,
				method: "PUT",
			}),
	})

	const handleUpload = async (
		existingDocument: ClubDocument | null,
		documentData: DocumentUploadData,
		file: File,
	) => {
		setError(null)

		// Replace an existing document with a new record if the title has been changed,
		// otherwise we will simply refresh the existing document record.
		const refresh = existingDocument?.document?.title === documentData.title

		const documentForm = new FormData()
		documentForm.append("document_type", documentData.document_type)
		documentForm.append("year", documentData.year.toString())
		documentForm.append("title", documentData.title)
		documentForm.append("file", file, file.name)

		try {
			if (refresh) {
				await updateDocument({ documentId: existingDocument.document.id, formData: documentForm })
			} else {
				const newDocumentData = await createDocument({ formData: documentForm })

				const clubDocumentForm = new FormData()
				clubDocumentForm.append("code", code)
				clubDocumentForm.append("document", newDocumentData.id.toString())
				if (existingDocument) {
					await updateClubDocument({ documentId: existingDocument.id, formData: clubDocumentForm })
				} else {
					await createClubDocument({ formData: clubDocumentForm })
				}
			}
		} catch (err: unknown) {
			setError(err as Error)
		} finally {
			queryClient.invalidateQueries({ queryKey: ["club-documents"] })
		}
	}

	return {
		handleUpload,
		error,
		isBusy:
			status1 === "pending" ||
			status2 === "pending" ||
			status3 === "pending" ||
			status4 === "pending",
	}
}
