import { neon } from '@neondatabase/serverless'
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http'

let _db: NeonHttpDatabase | null = null

export function getDb () {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    const sql = neon(url)
    _db = drizzle(sql)
  }
  return _db
}

const dbHandler: ProxyHandler<NeonHttpDatabase> = {
  get (_target, prop: string | symbol) {
    const instance = getDb()
    const value = instance[prop as keyof NeonHttpDatabase]
    if (typeof value === 'function') {
      return (value as (this: NeonHttpDatabase, ...args: never[]) => NeonHttpDatabase).bind(instance)
    }
    return value
  }
}

export const db = new Proxy({} as NeonHttpDatabase, dbHandler)
