import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const adapter = new PrismaLibSQL(libsql)

// libSQL 适配器会把原始 SQL 查询里的整数返回为 BigInt，
// 导致 JSON 序列化失败（NextResponse.json 直接报错）和算术运算出错。
// 统一把原始查询结果里的 BigInt 转回普通 number，保持与原 SQLite 行为一致，
// 这样所有 $queryRaw/$queryRawUnsafe 调用点都无需改动。
function deBigInt(v: unknown): unknown {
  if (typeof v === 'bigint') return Number(v)
  if (Array.isArray(v)) return v.map(deBigInt)
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    for (const k of Object.keys(o)) o[k] = deBigInt(o[k])
    return o
  }
  return v
}

function makeClient(): PrismaClient {
  const client = new PrismaClient({ adapter })
  const rawUnsafe = client.$queryRawUnsafe.bind(client)
  const raw = client.$queryRaw.bind(client)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client.$queryRawUnsafe = (async (...a: any[]) => deBigInt(await (rawUnsafe as any)(...a))) as typeof client.$queryRawUnsafe
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client.$queryRaw = (async (...a: any[]) => deBigInt(await (raw as any)(...a))) as typeof client.$queryRaw
  return client
}

export const prisma = globalForPrisma.prisma ?? makeClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
