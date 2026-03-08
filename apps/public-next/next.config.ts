import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	output: "standalone",
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "bhmc.s3.amazonaws.com",
				pathname: "/media/**",
			},
			{
				protocol: "http",
				hostname: "localhost",
				port: "8000",
				pathname: "/media/**",
			},
		],
	},
}

export default nextConfig
