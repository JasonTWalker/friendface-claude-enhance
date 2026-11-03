// Drives friendface-ui end to end in a real (headless) Edge via playwright-core.
// Usage (from friendface-ui/): node .claude/skills/run-friendface-ui/driver.mjs [screenshotDir]
// Starts `npm run dev` itself if nothing is listening on the port, and stops it again afterwards.
import { chromium } from "playwright-core";
import { spawn, execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const PORT = Number(process.env.PORT ?? 5173);
const BASE = `http://localhost:${PORT}`;
const UNIT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../.."); // friendface-ui/
const SHOT_DIR = resolve(process.argv[2] ?? "screenshots");
mkdirSync(SHOT_DIR, { recursive: true });

const USERNAME = "driver-user";
const PASSWORD = "driver-pass";
const POST_TEXT = "Hello from the driver";

function portOpen() {
    return new Promise((res) => {
        // "localhost", not 127.0.0.1: Vite on Windows can bind only ::1
        const s = net.connect(PORT, "localhost");
        s.on("connect", () => { s.destroy(); res(true); });
        s.on("error", () => res(false));
    });
}

async function startVite() {
    if (await portOpen()) {
        console.log(`dev server already running on ${PORT}, reusing it`);
        return null;
    }
    console.log("starting `npm run dev`...");
    // shell:true so Windows resolves npm.cmd
    const proc = spawn(`npm run dev -- --port ${PORT} --strictPort`, {
        cwd: UNIT_DIR, shell: true, stdio: "ignore",
    });
    for (let i = 0; i < 60; i++) {
        if (await portOpen()) return proc;
        await new Promise((r) => setTimeout(r, 500));
    }
    stopVite(proc);
    throw new Error("dev server did not open its port within 30s");
}

function stopVite(proc) {
    if (!proc) return;
    try {
        // npm spawns node as a child, so kill the whole tree
        if (process.platform === "win32") execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "ignore" });
        else process.kill(-proc.pid);
    } catch { /* already gone */ }
}

let step = 0;
async function shot(page, name) {
    const file = resolve(SHOT_DIR, `${String(++step).padStart(2, "0")}-${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`  screenshot: ${file}`);
}

function check(condition, message) {
    if (!condition) throw new Error("FAILED: " + message);
    console.log("  ok: " + message);
}

const vite = await startVite();
let browser;
let failed = false;
try {
    // system Edge, so no browser download is needed on Windows
    browser = await chromium.launch({ channel: "msedge", headless: true });
    const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
    page.on("pageerror", (err) => console.log("  [pageerror] " + err.message));
    // the dialog handler would catch any alert() from validation
    page.on("dialog", (d) => { console.log("  [dialog] " + d.message()); d.dismiss(); });

    const articles = page.locator("article.post");

    console.log("1. logged-out home");
    await page.goto(BASE);
    await articles.first().waitFor(); // posts only render once MSW is up and /posts is answered
    check((await articles.count()) === 4, "4 seeded mock posts rendered (MSW is answering /posts)");
    check((await page.getByRole("button", { name: "Like post" }).count()) === 0, "no Like buttons when logged out");
    check((await page.getByRole("button", { name: "Delete" }).count()) === 0, "no Delete buttons when logged out");
    await shot(page, "logged-out-home");

    console.log("2. register");
    await page.getByRole("link", { name: "Register" }).click();
    await page.locator("input[name=username]").fill(USERNAME);
    await page.locator("input[name=password]").fill(PASSWORD);
    await shot(page, "register-form");
    await page.getByRole("button", { name: "Register" }).click();
    await page.getByText(`Logged in as ${USERNAME}`).waitFor();
    await articles.first().waitFor();
    check(page.url() === BASE + "/", "redirected home after registering");
    await shot(page, "logged-in-home");

    console.log("3. create a post");
    await page.getByRole("button", { name: "Create Postt" }).click(); // sic, the label has a typo in the app
    await page.locator("input[name=content]").fill(POST_TEXT);
    await page.getByRole("button", { name: "Create Post", exact: true }).click();
    const mine = articles.filter({ hasText: POST_TEXT });
    await mine.waitFor();
    check((await mine.locator(".post__author").innerText()) === USERNAME, "new post is authored by the logged in user");
    await shot(page, "post-created");

    console.log("4. like it");
    await mine.getByRole("button", { name: "Like post" }).click();
    await mine.getByText("1 like", { exact: true }).waitFor();
    check(true, "like count went 0 -> 1");

    console.log("5. only own posts are deletable");
    check((await page.getByRole("button", { name: "Delete" }).count()) === 1, "exactly one Delete button (the new post); seeded posts belong to others");
    await shot(page, "liked");
    await mine.getByRole("button", { name: "Delete" }).click();
    await mine.waitFor({ state: "detached" });
    check((await articles.count()) === 4, "post deleted, back to 4 posts");

    console.log("6. refresh keeps the login, resets the mock data");
    // the form stays open after submitting and "Create Postt" is a toggle, so only click it if the form is closed
    if (!(await page.locator("input[name=content]").isVisible())) {
        await page.getByRole("button", { name: "Create Postt" }).click();
    }
    await page.locator("input[name=content]").fill("Will vanish on refresh");
    await page.getByRole("button", { name: "Create Post", exact: true }).click();
    await articles.filter({ hasText: "Will vanish on refresh" }).waitFor();
    await page.reload();
    await articles.first().waitFor();
    check(await page.getByText(`Logged in as ${USERNAME}`).isVisible(), "still logged in after refresh");
    check((await articles.count()) === 4, "mock posts reset to the 4 defaults after refresh");
    await shot(page, "after-refresh");

    console.log("7. log out");
    await page.getByRole("button", { name: "Log out" }).click();
    await page.getByRole("link", { name: "Log in" }).waitFor();
    check((await page.getByRole("button", { name: "Like post" }).count()) === 0, "Like hidden again after logout");
    await shot(page, "logged-out-again");

    console.log("8. log in as a seeded user, owner-only delete");
    await page.getByRole("link", { name: "Log in" }).click();
    await page.locator("input[name=username]").fill("mockuser1");
    await page.locator("input[name=password]").fill("password1");
    await page.getByRole("button", { name: "Log in" }).click();
    await page.getByText("Logged in as mockuser1").waitFor();
    await articles.first().waitFor();
    check((await page.getByRole("button", { name: "Delete" }).count()) === 2, "mockuser1 sees Delete on exactly its 2 posts");
    await shot(page, "mockuser1");

    console.log("\nALL CHECKS PASSED");
} catch (err) {
    failed = true;
    console.error("\n" + (err instanceof Error ? err.message : err));
} finally {
    await browser?.close();
    stopVite(vite);
}
process.exit(failed ? 1 : 0);
