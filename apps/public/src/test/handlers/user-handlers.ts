import { http, HttpResponse } from "msw"

import { faker } from "@faker-js/faker"

import {
	ActivateData,
	RegisterData,
	RequestPasswordData,
	ResetPasswordData,
} from "../../models/auth"
import { authUrl } from "../../utils/api-utils"
import { buildUser } from "../data/auth"

export const authHandlers = [
	http.post(authUrl("token/login/"), () => {
		HttpResponse.json({ auth_token: faker.string.alphanumeric(16) })
	}),
	http.get(authUrl("users/me/"), () => {
		return HttpResponse.json(buildUser())
	}),
	http.post(authUrl("users/"), async ({ request }) => {
		const body = (await request.json()) as RegisterData
		return HttpResponse.json({
			id: faker.number.int(),
			first_name: body.first_name,
			last_name: body.last_name,
			email: body.email,
			is_active: false,
			is_authenticated: false,
		})
	}),
	http.post(authUrl("users/activation/"), async ({ request }) => {
		const body = (await request.json()) as ActivateData
		if (body.uid && body.token) {
			return HttpResponse.json(undefined, { status: 204 })
		}
		return HttpResponse.json({ non_field_errors: ["invalid token"] }, { status: 204 })
	}),
	http.post(authUrl("users/reset_password/"), async ({ request }) => {
		const body = (await request.json()) as RequestPasswordData
		if (body.email) {
			return HttpResponse.json(undefined, { status: 204 })
		}
		return HttpResponse.json("no soup for you", { status: 400 })
	}),
	http.post(authUrl("users/reset_password_confirm"), async ({ request }) => {
		const body = (await request.json()) as ResetPasswordData
		if (body.uid && body.token) {
			return HttpResponse.json(undefined, { status: 204 })
		}
		return HttpResponse.json({ non_field_errors: ["invalid token"] }, { status: 204 })
	}),
]
