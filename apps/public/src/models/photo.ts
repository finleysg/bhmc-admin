import { z } from "zod"

import { serverBaseUrl } from "../utils/app-config"
import { Tag } from "./tag"

export const examplePhotoResponse = {
	id: 121,
	year: 2018,
	caption: "Nobody likes corporate scrambles",
	mobile_url:
		"https://bhmc.s3.amazonaws.com/media/CACHE/images/photos/2018/20180623_084441/dfd84a531c9db7b4d90534b5a004a4c7.jpg",
	web_url:
		"https://bhmc.s3.amazonaws.com/media/CACHE/images/photos/2018/20180623_084441/b3b1b5b72909e9b680d3edd25dd54d2e.jpg",
	image_url: "https://bhmc.s3.amazonaws.com/media/photos/2018/20180623_084441.jpg",
	raw_image: "https://bhmc.s3.amazonaws.com/media/photos/2018/20180623_084441.jpg",
	player_id: null,
	created_by: "Stuart Finley",
	last_update: "2021-11-21T18:03:21.481940-06:00",
	tags: [
		{
			id: 57,
			tag: "Weekend Golf",
		},
	],
}
const PhotoTagSchema = z.object({
	id: z.number(),
	tag: z.string(),
})

export const PhotoApiSchema = z.object({
	id: z.number(),
	year: z.number(),
	caption: z.string().nullish(),
	mobile_url: z.string(),
	web_url: z.string(),
	image_url: z.string(),
	raw_image: z.string(),
	player_id: z.number().nullish(),
	created_by: z.string(),
	last_update: z.coerce.date(),
	tags: z.array(PhotoTagSchema).nullish(),
})

export type PhotoData = z.infer<typeof PhotoApiSchema>

export class Photo {
	id: number
	year: number
	caption: string | undefined
	rawMobileUrl: string
	rawWebUrl: string
	rawImageUrl: string
	playerId: number | undefined
	createdBy: string
	lastUpdate: Date
	tags: Tag[]

	constructor(data: PhotoData) {
		this.id = data.id
		this.year = data.year
		this.caption = data.caption ?? ""
		this.rawMobileUrl = data.mobile_url
		this.rawWebUrl = data.web_url
		this.rawImageUrl = data.image_url
		this.playerId = data.player_id ?? 0
		this.createdBy = data.created_by
		this.lastUpdate = data.last_update
		this.tags = data.tags?.map((t) => new Tag({ id: t.id, name: t.tag })) ?? []
	}

	static getPagedPhotosUrl(tag: string) {
		if (tag) {
			return `photos/?page=1&tags=${tag}`
		} else {
			return "photos/?page=1"
		}
	}

	imageUrl() {
		if (this.rawImageUrl.startsWith("http")) {
			return this.rawImageUrl // production (from Amazon storage)
		}
		return `${serverBaseUrl}${this.rawImageUrl}`
	}

	webImageUrl() {
		if (this.rawWebUrl.startsWith("http")) {
			return this.rawWebUrl // production (from Amazon storage)
		}
		return `${serverBaseUrl}${this.rawWebUrl}`
	}

	mobileImageUrl() {
		if (this.rawMobileUrl.startsWith("http")) {
			return this.rawMobileUrl // production (from Amazon storage)
		}
		return `${serverBaseUrl}${this.rawMobileUrl}`
	}
}

export interface PhotoProps {
	photo: Photo
}
