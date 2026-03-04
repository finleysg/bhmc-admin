"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

const gifs = [
	"akiHW8qDydkm4",
	"F0HQQ0p3Mp8QM",
	"dOdfxZkkKFgOc",
	"bSuWe6oHfDh28S9hop",
	"uudzUtVcsLAoo",
	"j1gDGxFWrAaRbzbMx5",
	"lsAWu6CohyfS9JpSBh",
	"lP4e1a0tMGKfRdJIuc",
	"ixCowpFMOukIRT0aoU",
	"3oEjHJZT3q9EdNEnAY",
	"xT0GqK04xsopWbJKFi",
	"xT5LMAdfzp0iSqyGFq",
	"fnEgBnP4laVzUj37Js",
	"eNJWU4RPE0W76",
	"xUOwG43OJ9Mzf4exQQ",
	"bIWZ66ltn2DyE",
	"xT0GqHz7dP8eJW8f28",
	"146YfoNq3cuM7u",
	"OPl1CmAfplB1C",
	"jc9oQKgNskjba",
	"QJiuU3d3gvf1u",
	"ZfORfp3xtFL6E",
	"1rPSYA7TX5wyBpwQl8",
	"2XflxzFnvKAN1YVrGmc",
	"2pcoCqjPdQwAU",
	"zz4wwa2Sjpi6s",
	"j1gDGxFWrAaRbzbMx5",
	"ixCowkCVasW8d7YmMo",
	"fxOkhf5sUiK5ST3gWC",
	"S8NJU0joXkkrFw49Gr",
	"Zf2tIG0ZuVhboPLY9I",
	"7EqSP8bbgxYvS",
	"Zn7rsVqBTPAly",
	"13fTigyJHlacwM",
	"zerHFGOr2RTmU",
	"82CRZpV77lIU0QXzmW",
	"0T7PDxZkFAL6eWrpjd",
	"0jpKIoiMVw2ydsW4Ib",
]

interface GiphyResponse {
	data?: {
		images: {
			downsized: {
				url: string
			}
		}
		title: string
	}
}

interface GifData {
	url: string
	title: string
}

function getRandomGifId() {
	return gifs[Math.floor(Math.random() * gifs.length)]
}

export function RandomGif() {
	const [gif, setGif] = useState<GifData | null>(null)

	useEffect(() => {
		const gifId = getRandomGifId()
		const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY
		if (!apiKey) return

		fetch(`https://api.giphy.com/v1/gifs/${gifId}?api_key=${apiKey}`)
			.then((res) => res.json() as Promise<GiphyResponse>)
			.then((result) => {
				if (result.data) {
					setGif({
						url: result.data.images.downsized.url,
						title: result.data.title,
					})
				}
			})
			.catch(() => {
				// Silently fail — the GIF is decorative
			})
	}, [])

	if (!gif) return null

	return (
		<div className="flex flex-col items-center">
			{/* eslint-disable-next-line @next/no-img-element */}
			<img
				className="max-w-full object-contain"
				src={gif.url}
				alt="Random golf gif"
				title={gif.title}
			/>
			<Image
				className="mt-4"
				src="/images/Poweredby_100px-White_VertLogo.png"
				alt="Powered By Giphy"
				title="Powered By Giphy"
				width={100}
				height={26}
			/>
		</div>
	)
}
