// json-server with login + token checks, run with `npm run server` (replaces `npx json-server db.json`).
//
// The json-server CLI has no hook for custom routes or middleware, so this builds the same app the CLI does
// (createApp over a lowdb file) and puts a small auth layer in front of it:
//   POST /login   { username, password } -> { user, token }
//   POST /users   { username, password } -> { user, token }  (register; also signs in)
//   GET           open to everyone (like the MSW mocks)
//   POST/PUT/PATCH/DELETE on anything else need "Authorization: Bearer <token>"  -> 401 otherwise
//   DELETE /posts/:id additionally needs the caller to own the post               -> 403 otherwise
// Users live in the `users` collection of db.json with a scrypt password hash, and are never readable over HTTP.
import { createServer } from 'node:http'
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { createApp } from 'json-server/lib/app.js'
import { NormalizedAdapter } from 'json-server/lib/adapters/normalized-adapter.js'
import { randomId } from 'json-server/lib/random-id.js'

const PORT = Number(process.env.PORT ?? 3000)
const DB_FILE = fileURLToPath(new URL('../db.json', import.meta.url))
// Dev-only fallback so saved logins survive a server restart. Set TOKEN_SECRET for anything shared.
const TOKEN_SECRET = process.env.TOKEN_SECRET ?? 'friendface-dev-secret-change-me'
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7
const MAX_BODY_BYTES = 10 * 1024

const db = new Low(new NormalizedAdapter(new JSONFile(DB_FILE)), {})
await db.read()
if (!Array.isArray(db.data.users)) {
    db.data.users = []
    await db.write()
}
const app = createApp(db, { logger: false })

// ---- tokens: "<base64url payload>.<base64url hmac>" (a minimal JWT-alike) ----
const sign = (payload) => createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url')

function issueToken(user) {
    const payload = Buffer.from(JSON.stringify({
        sub: user.id,
        username: user.username,
        exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    })).toString('base64url')
    return `${payload}.${sign(payload)}`
}

// returns the payload for a valid, unexpired token, otherwise undefined
function verifyToken(token) {
    const [payload, signature, ...rest] = token.split('.')
    if (!payload || !signature || rest.length) return undefined
    const expected = Buffer.from(sign(payload))
    const given = Buffer.from(signature)
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return undefined
    try {
        const claims = JSON.parse(Buffer.from(payload, 'base64url').toString())
        return typeof claims.sub === 'string' && claims.exp > Date.now() / 1000 ? claims : undefined
    } catch {
        return undefined
    }
}

function requestUser(req) {
    const header = req.headers.authorization ?? ''
    return header.startsWith('Bearer ') ? verifyToken(header.slice('Bearer '.length)) : undefined
}

// ---- passwords ----
function hashPassword(password) {
    const salt = randomBytes(16)
    return `${salt.toString('hex')}:${scryptSync(password, salt, 64).toString('hex')}`
}

function passwordMatches(password, stored) {
    const [saltHex, hashHex] = String(stored).split(':')
    if (!saltHex || !hashHex) return false
    const expected = Buffer.from(hashHex, 'hex')
    const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length)
    return timingSafeEqual(expected, actual)
}

// ---- helpers ----
function send(res, status, body) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
    res.end(JSON.stringify(body))
}

function readJson(req) {
    return new Promise((resolve, reject) => {
        const chunks = []
        let size = 0
        req.on('data', (chunk) => {
            size += chunk.length
            if (size > MAX_BODY_BYTES) {
                reject(new Error('too large'))
                req.destroy()
            } else {
                chunks.push(chunk)
            }
        })
        req.on('end', () => {
            try {
                const body = JSON.parse(Buffer.concat(chunks).toString() || '{}')
                resolve(typeof body === 'object' && body !== null && !Array.isArray(body) ? body : {})
            } catch (err) {
                reject(err)
            }
        })
        req.on('error', reject)
    })
}

const authResponse = (user) => ({ token: issueToken(user), user: { id: user.id, username: user.username } })

async function handleAuth(req, res, route) {
    let body
    try {
        body = await readJson(req)
    } catch {
        return send(res, 400, { message: 'Request body must be valid JSON' })
    }
    const { username, password } = body
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
        return send(res, 400, { message: 'Username and password are required' })
    }

    if (route === '/login') {
        const user = db.data.users.find((u) => u.username === username)
        // hash even for unknown users so response time doesn't reveal which usernames exist
        const ok = passwordMatches(password, user?.passwordHash ?? ':')
        if (!user || !ok) return send(res, 401, { message: 'Invalid username or password' })
        return send(res, 200, authResponse(user))
    }

    if (db.data.users.some((u) => u.username === username)) {
        return send(res, 409, { message: 'That username is already taken' })
    }
    const user = { id: randomId(), username, passwordHash: hashPassword(password) }
    db.data.users.push(user)
    await db.write()
    return send(res, 201, authResponse(user))
}

const server = createServer(async (req, res) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost')
    const route = pathname.replace(/\/+$/, '') || '/'
    const method = req.method ?? 'GET'

    if (method === 'OPTIONS') return app.attach(req, res) // CORS preflight, handled by json-server

    if (method === 'POST' && (route === '/login' || route === '/users')) {
        return handleAuth(req, res, route)
    }
    // the users collection holds password hashes, so it is not exposed through json-server's generic routes
    if (route === '/users' || route.startsWith('/users/')) {
        return send(res, 404, { error: 'Not Found' })
    }

    if (method !== 'GET' && method !== 'HEAD') {
        const user = requestUser(req)
        if (!user) return send(res, 401, { message: 'You must be logged in' })

        const deleteMatch = method === 'DELETE' && route.match(/^\/posts\/([^/]+)$/)
        if (deleteMatch) {
            const post = db.data.posts?.find((p) => p.id === decodeURIComponent(deleteMatch[1]))
            // posts with no authorId (legacy seed data) stay deletable by any logged in user, as in the mocks
            if (post?.authorId && post.authorId !== user.sub) {
                return send(res, 403, { message: 'You can only delete your own posts' })
            }
        }
    }

    return app.attach(req, res)
})

server.listen(PORT, () => {
    console.log(`Friendface API (json-server + auth) on http://localhost:${PORT}`)
    console.log(`Data: ${DB_FILE}`)
    if (!process.env.TOKEN_SECRET) console.log('Using the built-in dev TOKEN_SECRET; set TOKEN_SECRET to override.')
})
