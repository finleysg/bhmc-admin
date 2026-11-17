import { Module } from "@nestjs/common"

import { PublicSiteService } from "./public-site.service"
import { RevalidatePublicEventsInterceptor } from "./revalidate-public-events.interceptor"

@Module({
	providers: [PublicSiteService, RevalidatePublicEventsInterceptor],
	exports: [PublicSiteService, RevalidatePublicEventsInterceptor],
})
export class PublicSiteModule {}
