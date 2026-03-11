import mysql from "mysql2/promise"

export async function queryDb<T>(sql: string, params: unknown[] = []): Promise<T[]> {
	const conn = await mysql.createConnection({
		host: "localhost",
		port: 25060,
		user: "gg",
		password: "integration",
		database: "bhmc-data",
	})
	const [rows] = await conn.execute(sql, params)
	await conn.end()
	return rows as T[]
}
