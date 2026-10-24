import { SseStream } from "@nestjs/core/router/sse-stream"
import { Workbook } from "exceljs"

describe("Security dependency compatibility", () => {
	it("prevents SSE metadata from injecting additional events", async () => {
		const stream = new SseStream()
		const chunks: string[] = []
		stream.on("data", (chunk: string) => chunks.push(chunk))
		const finished = new Promise<void>((resolve, reject) => {
			stream.on("end", resolve)
			stream.on("error", reject)
		})
		stream.end({ type: "update\n\nevent: forged", id: "1\r\ndata: injected", data: "safe" })
		await finished

		const output = chunks.join("")
		expect(output.match(/^event:/gm)).toHaveLength(1)
		expect(output.match(/^data:/gm)).toHaveLength(1)
		expect(output).toContain("data: safe\n\n")
	})

	it("writes conditional-formatting workbooks with the patched UUID dependency", async () => {
		const workbook = new Workbook()
		const sheet = workbook.addWorksheet("Scores")
		sheet.addRow([72])
		sheet.addConditionalFormatting({
			ref: "A1",
			rules: [{ type: "dataBar", priority: 1, cfvo: [{ type: "min" }, { type: "max" }] }],
		})

		const buffer = await workbook.xlsx.writeBuffer()
		const restored = new Workbook()
		await restored.xlsx.load(buffer)
		expect(restored.getWorksheet("Scores")?.getCell("A1").value).toBe(72)
	})
})
