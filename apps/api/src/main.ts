import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"

async function bootstrap() {
	const app = await NestFactory.create(AppModule)
	const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001
	const webOrigin = process.env.WEB_ORIGIN || "http://localhost:3000"

	// Enable CORS for the web app origin (credentials allowed for cookie/session forwarding)
	app.enableCors({ origin: webOrigin, credentials: true })

	await app.listen(port)
	// eslint-disable-next-line no-console
	console.log(`API listening on http://localhost:${port}`)
}
void bootstrap()
