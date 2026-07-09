#!/usr/bin/env python3
import os
import base64
import hmac
import json
import secrets
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

app = FastAPI(title="DragonworksAI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Named-account login gate ─────────────────────────────────────────────
# This app calls paid Gemini/OpenAI APIs on every generation. Once deployed
# to a public URL, anyone who has that link could otherwise generate images
# on your account's bill — so every /api/* route (other than login/health)
# requires a logged-in session.
#
# Accounts are configured via the APP_USERS environment variable — a JSON
# array of {"username", "password", "role"} objects, e.g.:
#   [{"username":"maria","password":"changeme1","role":"user"},
#    {"username":"admin","password":"changeme2","role":"admin"}]
# "role" is "user" (default) or "admin". Admin accounts can see every user's
# generation history (who generated what) via /api/admin/history — regular
# "user" accounts only see their own browser's history, same as today.
#
# Leave APP_USERS unset/empty and the whole gate is skipped — that's what
# keeps local dev (`uvicorn main:app`) working with no login prompt.
#
# NOTE: sessions and the admin history log below are held in memory only
# (no database) — both reset whenever the server restarts or redeploys,
# same as the rest of this app's history. That keeps this free to run.
APP_USERS_ENV     = os.getenv("APP_USERS", "")
SESSION_COOKIE     = "dw_session"
SESSION_MAX_AGE_S  = 60 * 60 * 24 * 14   # 14 days
# Modern browsers treat http://localhost as secure enough for "Secure"
# cookies, so this defaults on (matches Render's https in production). If a
# local test ever shows the session not sticking (e.g. testing via
# http://127.0.0.1 instead of http://localhost in an older browser), set
# COOKIE_SECURE=0 in your local environment to work around it.
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "1") != "0"


def _load_app_users():
    raw = APP_USERS_ENV.strip()
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except Exception as e:
        print(f"[auth] APP_USERS is set but isn't valid JSON ({e}) — login gate disabled.")
        return []
    users = []
    for u in parsed if isinstance(parsed, list) else []:
        if not isinstance(u, dict) or not u.get("username") or not u.get("password"):
            continue
        role = str(u.get("role", "user")).strip().lower()
        users.append({
            "username": str(u["username"]),
            "password": str(u["password"]),
            "role": role if role in ("user", "admin") else "user",
        })
    return users


APP_USERS = _load_app_users()

# token -> {"username", "role", "created"} — in-memory only, see note above.
SESSIONS = {}


def _find_user(username: str):
    for u in APP_USERS:
        if hmac.compare_digest(u["username"], username):
            return u
    return None


def _create_session(user: dict) -> str:
    token = secrets.token_urlsafe(32)
    SESSIONS[token] = {"username": user["username"], "role": user["role"], "created": time.time()}
    return token


def _session_from_request(request: Request):
    token = request.cookies.get(SESSION_COOKIE, "")
    session = SESSIONS.get(token)
    if not session:
        return None
    if time.time() - session["created"] > SESSION_MAX_AGE_S:
        SESSIONS.pop(token, None)
        return None
    return session


def current_username(request: Request) -> str:
    """Best-effort attribution for the generation log — 'local-dev' when the
    login gate is disabled (APP_USERS unset), otherwise the logged-in user."""
    user = getattr(request.state, "user", None)
    return user["username"] if user else "local-dev"


# Reachable without a session: logging in, checking whether you're logged in,
# and the health check (used by uptime monitors). Everything else under
# /api/* requires a valid session cookie. Paths outside /api/* (the built
# frontend bundle) are never touched by this middleware, so the React app's
# own Login screen can always load in the browser.
_PUBLIC_API_PATHS = {"/api/login", "/api/logout", "/api/me", "/api/health"}


class SessionAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not APP_USERS:
            return await call_next(request)
        if not request.url.path.startswith("/api/") or request.url.path in _PUBLIC_API_PATHS:
            return await call_next(request)

        session = _session_from_request(request)
        if not session:
            return Response(
                status_code=401,
                content=json.dumps({"detail": "Not authenticated"}),
                media_type="application/json",
            )
        request.state.user = session
        return await call_next(request)


app.add_middleware(SessionAuthMiddleware)


class LoginPayload(BaseModel):
    username: str
    password: str


@app.post("/api/login")
def login(payload: LoginPayload, response: Response):
    if not APP_USERS:
        raise HTTPException(400, detail="Login is not configured on this server (APP_USERS is unset).")
    user = _find_user(payload.username)
    if not user or not hmac.compare_digest(user["password"], payload.password):
        raise HTTPException(401, detail="Invalid username or password.")
    token = _create_session(user)
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        max_age=SESSION_MAX_AGE_S,
        path="/",
    )
    return {"success": True, "username": user["username"], "role": user["role"]}


@app.post("/api/logout")
def logout(request: Request, response: Response):
    SESSIONS.pop(request.cookies.get(SESSION_COOKIE, ""), None)
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"success": True}


@app.get("/api/me")
def me(request: Request):
    if not APP_USERS:
        return {"authenticated": False, "auth_disabled": True}
    session = _session_from_request(request)
    if not session:
        return {"authenticated": False}
    return {"authenticated": True, "username": session["username"], "role": session["role"]}


# ── Shared, in-memory generation log (for the admin view) ───────────────
# Every successful generation across every user is appended here, tagged
# with who made it, so an admin account can see "who generated what" via
# /api/admin/history. Capped to the most recent 200 to bound memory use —
# same in-memory-only, resets-on-restart tradeoff as the rest of this app's
# history (see the login-gate note above for why that's the free option).
GENERATION_LOG = []
GENERATION_LOG_MAX = 200


def log_generation(request: Request, *, source: str, label: str, prompt: str, image_b64: str,
                   provider: str = None, quality: str = None):
    GENERATION_LOG.insert(0, {
        "username": current_username(request),
        "source":   source,
        "label":    label,
        "prompt":   prompt,
        "image":    image_b64,
        "provider": provider,
        "quality":  quality,
        "ts":       datetime.now(timezone.utc).isoformat(),
    })
    del GENERATION_LOG[GENERATION_LOG_MAX:]


@app.get("/api/admin/history")
def admin_history(request: Request):
    if not APP_USERS:
        raise HTTPException(400, detail="Login is not configured on this server (APP_USERS is unset).")
    user = getattr(request.state, "user", None)
    if not user or user.get("role") != "admin":
        raise HTTPException(403, detail="Admin access required.")
    return {"success": True, "history": GENERATION_LOG}

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Which Gemini image model to use for every generation call. Override without
# touching code by setting this env var before launching uvicorn, e.g.:
#   set GEMINI_IMAGE_MODEL=gemini-3.1-flash-image  (cheaper, ~$0.03/image)
#   set GEMINI_IMAGE_MODEL=gemini-2.5-flash-image  (old legacy model, cheapest)
# Default is "gemini-3-pro-image" (Nano Banana Pro) — Google's premium,
# reasoning-driven model for complex compositing/relighting tasks like this
# one. Costs roughly 3.5x more per image than Nano Banana 2 (~$0.13 vs
# ~$0.03 per image at 1K/2K resolution), but is the tier best suited to
# fixing "flat collage" results — drop back to gemini-3.1-flash-image above
# if the quality bump isn't worth the extra cost for your team.
GEMINI_IMAGE_MODEL = os.getenv("GEMINI_IMAGE_MODEL", "gemini-3-pro-image")

# Cheap text model used to "enrich" the thumbnail prompt before it's sent to
# the image model — rewrites vague instructions into concrete, specific
# visual details (actual colors read from the photos, specific realistic
# props, a specific light direction) the way a human creative director (or
# ChatGPT, which does this automatically) would. This is what closes most of
# the gap between "technically correct instructions" and "actually looks
# premium." Text tokens are extremely cheap, so this adds well under a cent
# per generation. Set ENABLE_PROMPT_ENRICHMENT=0 to disable it.
GEMINI_TEXT_MODEL = os.getenv("GEMINI_TEXT_MODEL", "gemini-3.1-flash-lite")
ENABLE_PROMPT_ENRICHMENT = os.getenv("ENABLE_PROMPT_ENRICHMENT", "1") != "0"

# ── OpenAI (gpt-image-2) — alternate image provider ─────────────────────
# Set OPENAI_API_KEY to enable this as a choice. The frontend sends which
# provider to use per-request ("gemini" or "openai"); DEFAULT_IMAGE_PROVIDER
# below only controls the fallback for callers that don't specify one.
OPENAI_API_KEY      = os.getenv("OPENAI_API_KEY", "")
OPENAI_IMAGE_MODEL   = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-2")
# Fallback only — the frontend now sends a "quality" field per request
# (low/medium/high), so this env var just covers callers that don't specify
# one. Defaults to "medium" rather than "high" to avoid surprise cost spikes
# (roughly $0.005 low / $0.041 medium / $0.165 high per portrait image).
OPENAI_IMAGE_QUALITY = os.getenv("OPENAI_IMAGE_QUALITY", "medium")  # "high" | "medium" | "low"
DEFAULT_IMAGE_PROVIDER = os.getenv("IMAGE_PROVIDER", "gemini")  # "gemini" | "openai"

# Which underlying call OpenAI generations use. Confirmed via OpenAI's own
# docs: `images.edit` treats the first input image as a literal edit target
# ("the mask will be applied to the first image") — great for touch-ups, but
# it's why our results kept coming out as a flat copy of the background photo
# no matter how the prompt was worded. The Responses API's image_generation
# tool (action="generate") instead treats every input image as a pure
# creative reference for a brand-new composition — the same mechanism behind
# OpenAI's own "several product photos get fully reimagined into one new
# scene" example, and almost certainly what ChatGPT's UI and tools like
# OpenArt are actually built on. Defaults ON. IMPORTANT COST NOTE: this path
# does NOT have flat, predictable per-image pricing the way images.edit does
# — see OPENAI_RESPONSES_MODEL below for details. Set this to 0 to fall back
# to the legacy images.edit path for fully flat/predictable per-image cost.
OPENAI_USE_RESPONSES_API = os.getenv("OPENAI_USE_RESPONSES_API", "1") != "0"
# The Responses API takes a text-capable "orchestrator" model here (NOT
# gpt-image-2 directly — the docs are explicit that gpt-image-2 isn't a valid
# value for this field); it picks the underlying image model for you when
# the image_generation tool runs.
#
# CORRECTION (this used to default to gpt-5.4-mini with a comment claiming
# "small fraction of a cent" extra cost — that was wrong and shipped without
# being verified against real pricing, sorry). Two things make the Responses
# API path meaningfully pricier than the flat "Low/Medium/High" per-image
# costs shown in the UI (those numbers only ever applied to the legacy
# images.edit path below):
#   1. gpt-5.4-mini isn't cheap: $0.375/M input, $2.25/M output tokens —
#      roughly 6-7x pricier per token than gpt-5-nano.
#   2. OpenAI's own developer community has confirmed the Responses API's
#      image_generation tool bills your reference photos as vision INPUT
#      tokens at the orchestrator's rate, plus reasoning/output tokens for
#      the tool-orchestration step, on top of the image render itself — none
#      of which is itemized or flat-priced the way images.edit is.
# Defaulting to gpt-5-nano now to cut the token-rate portion of that by
# ~6-7x. This does NOT make the per-generation cost fully predictable or
# equal to the old flat estimates — check your OpenAI usage dashboard for
# actual spend, and set OPENAI_USE_RESPONSES_API=0 below if you want fully
# flat, predictable per-image pricing back (at the cost of the flat-paste
# quality issue that path has).
OPENAI_RESPONSES_MODEL = os.getenv("OPENAI_RESPONSES_MODEL", "gpt-5-nano")

# Cheap OpenAI vision-capable text model used ONLY to replicate the invisible
# prompt-rewriting step ChatGPT's own image tool performs before every
# generation (confirmed via OpenAI's own docs/community: ChatGPT always
# rewrites whatever you type into a longer, more detailed, vivid prompt
# before it reaches the image model — that step is why results generated
# through the ChatGPT UI look more polished than the exact same text sent
# raw through the API). gpt-5-nano supports image input and is extremely
# cheap (~$0.05/M input, $0.40/M output tokens), so this adds a small
# fraction of a cent per generation. Set ENABLE_OPENAI_PROMPT_ENRICHMENT=0
# to send presets fully raw again.
OPENAI_TEXT_MODEL = os.getenv("OPENAI_TEXT_MODEL", "gpt-5-nano")
ENABLE_OPENAI_PROMPT_ENRICHMENT = os.getenv("ENABLE_OPENAI_PROMPT_ENRICHMENT", "1") != "0"

# Note: the Gemini prompt-enrichment step further below always uses Gemini's
# cheap text model regardless of which provider generates the final image —
# it's just a text rewrite, and Gemini's flash-lite is cheap enough that
# there's no need to duplicate that logic for OpenAI's Gemini-specific
# guardrail path. This means GEMINI_API_KEY must stay set even if you're
# only using the OpenAI provider for final images.


def build_prompt(data: dict) -> str:
    lines = ["Generate a high-quality image with these specifications:\n"]
    fields = [
        ("description",   "PURPOSE"),
        ("subject",       "SUBJECT"),
        ("object_field",  "OBJECTS/PRODUCTS"),
        ("environment",   "BACKGROUND/ENVIRONMENT"),
        ("action",        "ACTION"),
        ("style",         "VISUAL STYLE"),
        ("camera_angle",  "CAMERA ANGLE"),
        ("lighting",      "LIGHTING"),
        ("mood",          "MOOD/ATMOSPHERE"),
        ("other_details", "ADDITIONAL DETAILS"),
    ]
    for key, label in fields:
        val = (data.get(key) or "").strip()
        if val and val != "-":
            lines.append(f"{label}: {val}")
    ratio = data.get("ratio", "Portrait")
    ratio_map = {
        "Portrait":  "Vertical portrait orientation (9:16 ratio)",
        "Landscape": "Horizontal landscape orientation (16:9 ratio)",
        "Square":    "Square orientation (1:1 ratio)",
    }
    lines.append(f"ORIENTATION: {ratio_map.get(ratio, ratio)}")
    lines.append(
        "\nRequirements: Professional, high-resolution, visually compelling, "
        "suitable as a live-streaming background. Clean and polished composition."
    )
    return "\n".join(lines)


def gemini_generate(prompt: str, ref_bytes: Optional[bytes] = None,
                    ref_mime: str = "image/jpeg") -> bytes:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GEMINI_API_KEY)

    if ref_bytes:
        response = client.models.generate_content(
            model=GEMINI_IMAGE_MODEL,
            contents=[
                types.Part(text="Use this image as a style reference:"),
                types.Part(inline_data=types.Blob(data=ref_bytes, mime_type=ref_mime)),
                types.Part(text=prompt),
            ],
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"]
            ),
        )
    else:
        response = client.models.generate_content(
            model=GEMINI_IMAGE_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"]
            ),
        )

    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            data = part.inline_data.data
            return data if isinstance(data, bytes) else base64.b64decode(data)

    raise RuntimeError("Gemini returned no image. Check your API key and quota.")


def gemini_generate_thumbnail(prompt: str,
                              bg_bytes: bytes, bg_mime: str,
                              base_bytes: bytes, base_mime: str) -> bytes:
    """Composite a thumbnail from a background photo + base (talent) photo."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GEMINI_API_KEY)

    # NOTE: these captions are intentionally neutral labels only — no
    # instructions about what to DO with each image live here. All actual
    # creative direction (what to cut out, what to keep, what to relight,
    # etc.) comes entirely from `prompt`, which differs between the default
    # auto-built flow and a brand preset. Baking instructions into the
    # captions would silently override/contradict whatever a preset says.
    response = client.models.generate_content(
        model=GEMINI_IMAGE_MODEL,
        contents=[
            types.Part(text="BACKGROUND PHOTO (image 1):"),
            types.Part(inline_data=types.Blob(data=bg_bytes, mime_type=bg_mime)),
            types.Part(text="BASE PHOTO (image 2):"),
            types.Part(inline_data=types.Blob(data=base_bytes, mime_type=base_mime)),
            types.Part(text=prompt),
        ],
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"]
        ),
    )

    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            data = part.inline_data.data
            return data if isinstance(data, bytes) else base64.b64decode(data)

    raise RuntimeError("Gemini returned no image. Check your API key and quota.")


def _normalize_image_for_openai(data: bytes) -> bytes:
    """
    Re-encode any input image as a clean, standard RGB/RGBA PNG.

    OpenAI's images.edit endpoint can reject files that decode fine
    everywhere else — CMYK-mode JPEGs (common from Photoshop/Canva exports),
    palette-indexed PNGs, unusual bit depths, or a file whose real encoding
    doesn't match what the browser labeled it as — with a generic
    "Invalid image file or mode" error that doesn't say which of those it
    was. Normalizing through Pillow first sidesteps all of that: whatever
    came in, what goes out is always a well-formed PNG.
    """
    import io
    from PIL import Image

    img = Image.open(io.BytesIO(data))
    img.load()  # force-decode now so any corruption surfaces here, not at OpenAI
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA" if "A" in img.mode or "transparency" in img.info else "RGB")
    out = io.BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()


def openai_generate_thumbnail(prompt: str,
                              bg_bytes: bytes, bg_mime: str,
                              base_bytes: bytes, base_mime: str,
                              quality: str = None) -> bytes:
    """
    Composite a thumbnail from a background/style photo + subject/product
    photo using OpenAI's image models.

    Two call paths, controlled by OPENAI_USE_RESPONSES_API:

    - Responses API + image_generation tool with action="generate" (DEFAULT).
      Confirmed via OpenAI's own docs: this path treats input images as pure
      creative references for a brand-new generation — the same mechanism
      behind OpenAI's own "gift basket" example where several product photos
      get "fully reimagined" into one cohesive new scene, and almost
      certainly what tools like OpenArt and ChatGPT itself are built on.
    - Legacy `images.edit` (fallback / A-B testing only). Docs confirm this
      endpoint treats the FIRST image as a literal edit target/canvas ("the
      mask will be applied to the first image") — this is the mechanism we
      were using before, and is the most likely root cause of the repeated
      "flat paste / literal background copy" results: no amount of prompt
      wording fully overrides an endpoint whose job is to edit existing
      pixels rather than generate a new composition from references.
    """
    if OPENAI_USE_RESPONSES_API:
        return _openai_generate_thumbnail_responses(prompt, bg_bytes, bg_mime, base_bytes, base_mime, quality)
    return _openai_generate_thumbnail_edit(prompt, bg_bytes, bg_mime, base_bytes, base_mime, quality)


def _normalized_quality(quality: str) -> str:
    quality = (quality or OPENAI_IMAGE_QUALITY).strip().lower()
    if quality not in ("low", "medium", "high"):
        quality = OPENAI_IMAGE_QUALITY
    return quality


def _openai_generate_thumbnail_responses(prompt: str,
                                         bg_bytes: bytes, bg_mime: str,
                                         base_bytes: bytes, base_mime: str,
                                         quality: str = None) -> bytes:
    """Generate via the Responses API's image_generation tool (action="generate")."""
    import base64 as _b64
    from openai import OpenAI

    quality = _normalized_quality(quality)
    client = OpenAI(api_key=OPENAI_API_KEY)

    try:
        bg_png   = _normalize_image_for_openai(bg_bytes)
        base_png = _normalize_image_for_openai(base_bytes)
    except Exception as e:
        raise RuntimeError(
            f"Couldn't read one of the uploaded photos as an image ({e}). "
            "Try re-saving/re-exporting it and uploading again."
        )

    def _data_url(data: bytes) -> str:
        return f"data:image/png;base64,{_b64.b64encode(data).decode()}"

    response = client.responses.create(
        model=OPENAI_RESPONSES_MODEL,
        input=[
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {
                        "type": "input_text",
                        "text": "SUBJECT / PRODUCT REFERENCE — keep this recognizable "
                                 "(face/shape/branding), everything else about the scene "
                                 "around it is yours to reimagine:",
                    },
                    {"type": "input_image", "image_url": _data_url(base_png)},
                    {
                        "type": "input_text",
                        "text": "MOOD & STYLE REFERENCE — a color/mood board only, NOT a "
                                 "layout to copy. Draw inspiration from its colors and "
                                 "playful motifs, then invent a real photographed scene:",
                    },
                    {"type": "input_image", "image_url": _data_url(bg_png)},
                ],
            }
        ],
        tools=[{
            "type": "image_generation",
            "size": "1024x1536",
            "quality": quality,
            # Explicitly force full generation rather than letting the tool
            # decide — "auto" can silently fall back to edit-style behavior
            # against the first reference image, which is exactly the "flat
            # paste" failure mode we're trying to avoid.
            "action": "generate",
        }],
    )

    images = [out.result for out in response.output if out.type == "image_generation_call" and out.result]
    if not images:
        raise RuntimeError(
            "OpenAI returned no image via the Responses API. Check your API key, "
            "org verification, and quota. (Set OPENAI_USE_RESPONSES_API=0 to fall "
            "back to the legacy images.edit path if this persists.)"
        )
    return _b64.b64decode(images[0])


def _openai_generate_thumbnail_edit(prompt: str,
                                    bg_bytes: bytes, bg_mime: str,
                                    base_bytes: bytes, base_mime: str,
                                    quality: str = None) -> bytes:
    """Legacy path: raw images.edit call. Kept only for A/B comparison / rollback."""
    import io
    from openai import OpenAI

    quality = _normalized_quality(quality)
    client = OpenAI(api_key=OPENAI_API_KEY)

    try:
        bg_png   = _normalize_image_for_openai(bg_bytes)
        base_png = _normalize_image_for_openai(base_bytes)
    except Exception as e:
        raise RuntimeError(
            f"Couldn't read one of the uploaded photos as an image ({e}). "
            "Try re-saving/re-exporting it and uploading again."
        )

    bg_file = io.BytesIO(bg_png)
    bg_file.name = "background.png"
    base_file = io.BytesIO(base_png)
    base_file.name = "base.png"

    result = client.images.edit(
        model=OPENAI_IMAGE_MODEL,
        image=[base_file, bg_file],
        prompt=prompt,
        size="1024x1536",
        quality=quality,
    )

    if not result.data:
        raise RuntimeError("OpenAI returned no image. Check your API key, org verification, and quota.")

    b64 = result.data[0].b64_json
    if not b64:
        raise RuntimeError("OpenAI returned no image data.")
    return base64.b64decode(b64)


def openai_edit_photo(prompt: str, img_bytes: bytes, img_mime: str,
                       reference_images: list = None) -> bytes:
    """
    Dedicated Edit Photo path — a TRUE single-image edit, not the multi-
    reference "generate" mode used by Thumbnail Creator. Uses `images.edit`
    with the base photo as the FIRST input image, so OpenAI treats it as the
    literal edit target (per OpenAI's own docs: "the mask will be applied to
    the first image") rather than a creative reference for a brand-new
    composition. That literal-edit behavior is exactly what a "adjust/fix
    this specific photo" feature needs — it's the same behavior Thumbnail
    Creator deliberately avoids by using the Responses API instead.

    `reference_images`: optional list of (bytes, mime) tuples — extra photos
    (a logo, an object, a background to swap in) appended AFTER the base
    photo. images.edit accepts multiple input images and can pull elements
    from the later ones while still editing the first — the prompt text is
    what tells it how to use them, since this endpoint (unlike the Responses
    API path) has no way to attach a caption to each individual image.
    Purely additive: omit this and behavior is identical to before it
    existed.

    Hardcoded to `quality="low"` — Edit Photo is meant for small, cheap
    touch-ups, not full recompositions, so it always runs at the lowest
    cost tier regardless of what Thumbnail Creator's quality setting is.
    """
    import io
    from openai import OpenAI

    client = OpenAI(api_key=OPENAI_API_KEY)

    try:
        img_png = _normalize_image_for_openai(img_bytes)
    except Exception as e:
        raise RuntimeError(
            f"Couldn't read the uploaded photo as an image ({e}). "
            "Try re-saving/re-exporting it and uploading again."
        )

    img_file = io.BytesIO(img_png)
    img_file.name = "photo.png"

    images = [img_file]
    for i, (ref_bytes, ref_mime) in enumerate(reference_images or []):
        try:
            ref_png = _normalize_image_for_openai(ref_bytes)
        except Exception as e:
            raise RuntimeError(
                f"Couldn't read reference image {i + 1} ({e}). "
                "Try re-saving/re-exporting it and uploading again."
            )
        ref_file = io.BytesIO(ref_png)
        ref_file.name = f"reference_{i + 1}.png"
        images.append(ref_file)

    result = client.images.edit(
        model=OPENAI_IMAGE_MODEL,
        # Bare file (not a list) when there are no references, to keep this
        # call byte-for-byte identical to before for the common no-reference
        # case — only switch to the list form once there's something to add.
        image=images if len(images) > 1 else images[0],
        prompt=prompt,
        size="auto",
        quality="low",
    )

    if not result.data:
        raise RuntimeError("OpenAI returned no image. Check your API key, org verification, and quota.")

    b64 = result.data[0].b64_json
    if not b64:
        raise RuntimeError("OpenAI returned no image data.")
    return base64.b64decode(b64)


def enrich_openai_prompt(base_prompt: str, headline: str,
                         bg_bytes: bytes, bg_mime: str,
                         base_bytes: bytes, base_mime: str,
                         enabled: bool = True):
    """
    Replicate the invisible prompt-rewriting step ChatGPT's own image tool
    performs before every generation. When you type/paste a brief into
    ChatGPT and it makes an image, ChatGPT's tool-calling layer silently
    rewrites that text into a longer, more detailed, vivid natural-language
    prompt before it ever reaches the image model — this happens on every
    request, even one that's already as detailed as our presets. Calling
    gpt-image-2 directly through the API skips that step entirely, which is
    the most likely reason API results look flatter/less polished than the
    exact same brief run interactively in ChatGPT.

    This is mostly NOT the same as `enrich_thumbnail_prompt()` (the
    Gemini-only enrichment): it's primarily a vividness pass, not a general
    "do not do X" guardrail pass, so the creative direction you already
    wrote stays in charge. It carries exactly ONE deliberate exception,
    added after live A/B testing (same preset, enrichment confirmed running,
    tested at both Low and Medium quality) showed `images.edit` reliably
    reproduces the background reference photo's literal flat illustration
    verbatim instead of treating it as a mood/color reference — a version of
    the same "flat paste" failure mode we fixed for Gemini. That one rule is
    spelled out explicitly in `instruction` below (see the CRITICAL
    background-handling rule) rather than left implicit, since implicit
    wording alone was empirically shown not to be enough.

    Uses OpenAI's own gpt-5-nano (cheap, vision-capable) rather than Gemini,
    so the rewrite is produced in the same "house style" as the model that
    will actually render the image.

    Falls back to the original prompt untouched if anything goes wrong, if
    ENABLE_OPENAI_PROMPT_ENRICHMENT is turned off server-wide, or if the
    caller passes enabled=False for this specific request (the frontend's
    per-generation "Enrich prompt" toggle — lets you flip straight back to
    sending your RAW, completely unmodified preset text with no restart
    needed). Enrichment should never be the reason a generation fails.
    Returns a 3-tuple: (prompt_to_use, enrichment_succeeded,
    error_message_or_None) — the caller surfaces this in the API response
    and prints it server-side, so a silent failure here is never invisible
    again.
    """
    if not enabled:
        return base_prompt, False, "disabled for this request (Enrich prompt toggle was off)"
    if not ENABLE_OPENAI_PROMPT_ENRICHMENT:
        return base_prompt, False, "disabled server-wide (ENABLE_OPENAI_PROMPT_ENRICHMENT=0)"
    if not OPENAI_API_KEY:
        return base_prompt, False, "OPENAI_API_KEY not set"

    import base64 as _b64
    from openai import OpenAI

    client = OpenAI(api_key=OPENAI_API_KEY)

    instruction = (
        "You are the internal prompt-writing step that ChatGPT's image generation "
        "tool runs automatically before calling its image model on every request. "
        "Given a creative brief and two reference photos, rewrite the brief into a "
        "single, detailed, vivid, natural-language image-generation prompt — the "
        "same kind of rewrite ChatGPT performs on every image request, whether the "
        "user's original text was a short request or, like here, an already-detailed "
        "brief.\n\n"
        "FRAMING — read this first: both attached photos are CREATIVE REFERENCES, "
        "not raw material to be literally edited or pasted together. Write the "
        "rewritten prompt so it reads like a brief for creating an entirely NEW, "
        "freshly imagined photograph — not a description of editing photo A with "
        "photo B. The two references exist only to answer two questions: (1) who "
        "or what must stay recognizable [reference 1 — subject/product], and (2) "
        "what color palette, mood, and creative direction to draw from [reference "
        "2 — style]. Everything else about the scene (camera angle, staging, "
        "props, environment, layout) is the rewritten prompt's own creative "
        "invention, loosely inspired by but never a literal copy of either photo.\n\n"
        "Rules:\n"
        "- Preserve every explicit instruction, structure, and hard requirement in "
        "the original brief (output size, headline text, what must stay "
        "recognizable, any brand/product identity constraints). Do not remove, "
        "soften, or reorder the priorities in it.\n"
        "- Do not add new constraints, warnings, or 'do not do X' guardrails beyond "
        "the ones spelled out below — this is a vividness + creative-freedom pass, "
        "not a general rules pass.\n"
        "- Identity lock (the one thing that must NOT be reinvented): ONLY the "
        "subject's face/expression and the product's shape, branding, and markings "
        "from reference 1 carry over. Reference 1's own backdrop/setting (its "
        "walls, windows, railings, furniture, whatever room it happens to have "
        "been photographed in) must be discarded completely and replaced by the "
        "invented environment below — do not let reference 1's original "
        "surroundings leak into the new scene just because it's technically "
        "'the photo you're not supposed to touch'. Pose, camera angle, framing, "
        "and the entire environment around the subject are fair game for fresh "
        "creative invention.\n"
        "- CRITICAL background-handling rule: reference 2 (the background/style "
        "photo) is a MOOD BOARD, not a layout to literally reproduce as the whole "
        "frame — but its color palette must still be UNMISTAKABLY, DOMINANTLY "
        "present in the final image, not just hinted at. Identify the 3-4 actual "
        "dominant colors you see in reference 2 (name them specifically, e.g. hot "
        "pink, sunny yellow, lavender purple, turquoise) and explicitly require "
        "that these exact colors saturate the invented environment's walls, "
        "large surfaces, and lighting gels/color-wash — not merely small props or "
        "accents. If the described scene could just as easily belong to a "
        "generic neutral-toned office with no color story, that's a failure — "
        "re-describe it so reference 2's palette is the first thing a viewer's "
        "eye would notice. Combine this with a real, physically photographed "
        "environment (actual furniture, real props like notebooks/a laptop/a "
        "mug/a plant/sticky notes/pens, natural depth of field, soft photographic "
        "bokeh) — vivid color and photographic realism together, not one instead "
        "of the other. Do NOT describe the scene's walls, furniture, or layout as "
        "literally matching reference 2's flat illustrated shapes.\n"
        "- However, ALSO explicitly call out 3-5 of reference 2's specific "
        "recurring graphic motifs (e.g. hand-drawn hearts, stars, squiggly doodle "
        "lines, sparkle/dot clusters, smiley-face sticky notes) and instruct that "
        "these exact motifs be scattered as a thin decorative sticker/doodle "
        "overlay layer floating on top of the photographed scene — small, "
        "playful, semi-transparent or flat-graphic accents layered over the real "
        "photo, the way stickers are layered over a photograph in a scrapbook or a "
        "premium social thumbnail. This overlay layer is what should carry "
        "reference 2's graphic identity — the base environment underneath it must "
        "still read as a real photograph, never as the flat illustration itself.\n"
        "- Ground the description in what you actually see in the two attached "
        "reference photos: name real colors, textures, and details you can "
        "observe, so the final prompt reads like a concrete photographic "
        "description instead of generic marketing language — but always in the "
        "voice of 'invent a new photo like this', never 'edit this photo to look "
        "like that'.\n"
        "- Do not change the headline text — it must appear verbatim exactly as "
        "given, in quotes, exactly once.\n"
        "- Do not invent new products or people that aren't in the photos.\n"
        "- Output ONLY the rewritten prompt as plain text. No preamble, no "
        "markdown, no headers, no explanation of what you changed."
    )

    def _data_url(data: bytes, mime: str) -> str:
        return f"data:{mime};base64,{_b64.b64encode(data).decode()}"

    try:
        response = client.chat.completions.create(
            model=OPENAI_TEXT_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": instruction},
                        {"type": "text", "text": "BASE / PRODUCT PHOTO (reference 1):"},
                        {"type": "image_url", "image_url": {"url": _data_url(base_bytes, base_mime)}},
                        {"type": "text", "text": "BACKGROUND PHOTO (reference 2):"},
                        {"type": "image_url", "image_url": {"url": _data_url(bg_bytes, bg_mime)}},
                        {"type": "text", "text": f"\nOriginal brief to rewrite:\n\n{base_prompt}"},
                        {"type": "text", "text": f'\nHeadline text that must appear verbatim: "{headline.strip()}"'},
                    ],
                }
            ],
        )
        enriched = (response.choices[0].message.content or "").strip()
        if enriched:
            return enriched, True, None
        return base_prompt, False, "model returned empty output"
    except Exception as e:
        # Enrichment is a nice-to-have, not a hard dependency — fall back to
        # the original prompt rather than failing the request, but ALWAYS
        # print the real error so a silent failure is visible in the server
        # console instead of just quietly no-op'ing every time.
        import traceback
        print(f"[enrich_openai_prompt] enrichment failed, falling back to raw prompt: {e}")
        traceback.print_exc()
        return base_prompt, False, str(e)


def enrich_thumbnail_prompt(base_prompt: str, headline: str,
                            bg_bytes: bytes, bg_mime: str,
                            base_bytes: bytes, base_mime: str) -> str:
    """
    Ask a cheap text model to rewrite the brief into a more concrete, vivid
    version — grounded in what it actually sees in the two reference photos
    (real colors, plausible real-world props, a specific light direction),
    instead of the generic phrasing our presets/build_thumbnail_prompt use.
    This mirrors what tools like ChatGPT do automatically before generating
    an image, and is a big part of why those results can look more premium
    even on an otherwise-similar brief.

    Falls back to the original prompt untouched if anything goes wrong —
    enrichment should never be the reason a generation fails.
    """
    if not ENABLE_PROMPT_ENRICHMENT:
        return base_prompt

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GEMINI_API_KEY)

    instruction = (
        "You are a creative director briefing a photo-compositing AI. Look at the two "
        "reference photos below (a background/campaign template, and a base photo of a "
        "product or talent) and REWRITE the brief that follows into a more vivid, concrete "
        "version of the exact same brief.\n\n"
        "Rules:\n"
        "- Keep every hard requirement and constraint from the original brief (output size, "
        "headline text, what must NOT change, any 'do not do X' warnings).\n"
        "- First, explicitly describe in one sentence exactly which side/angle/view of the "
        "product or subject is visible in the base photo (e.g. 'the back of the device, "
        "screen facing away from camera, hinge on the left') and state that this exact "
        "view must be preserved unchanged — the compositing AI must NOT rotate the object, "
        "reveal a different side, or invent screen/display content that isn't visible here.\n"
        "- Replace vague or generic phrases with specific visual details you can actually see "
        "or reasonably infer from the two photos: name the actual dominant colors, suggest "
        "5-7 specific real-world props that would plausibly sit in this exact scene, spread "
        "across foreground, midground and background so the frame feels richly styled and "
        "full rather than sparse or empty, specify one clear light direction and quality, and "
        "specify camera framing/depth of field.\n"
        "- Explicitly state that any colorful shapes/accents from the background reference must "
        "be rendered as soft, out-of-focus photographic bokeh with feathered edges — never as "
        "flat, hard-edged cartoon/sticker shapes — and that the subject/product must rest on a "
        "specific, clearly named real surface (name the actual surface, e.g. 'a light oak "
        "desk') with a soft contact shadow directly beneath it, so the whole image reads as one "
        "photograph with a single consistent light source and color grade rather than realistic "
        "props layered over a flat graphic backdrop.\n"
        "- Do not change the headline text — it must appear verbatim exactly as given.\n"
        "- Do not invent new products or people that aren't in the photos.\n"
        "- Output ONLY the rewritten brief as plain text. No preamble, no markdown, no "
        "headers, no explanation of what you changed."
    )

    try:
        response = client.models.generate_content(
            model=GEMINI_TEXT_MODEL,
            contents=[
                types.Part(text="BACKGROUND PHOTO (image 1):"),
                types.Part(inline_data=types.Blob(data=bg_bytes, mime_type=bg_mime)),
                types.Part(text="BASE PHOTO (image 2):"),
                types.Part(inline_data=types.Blob(data=base_bytes, mime_type=base_mime)),
                types.Part(text=instruction),
                types.Part(text=f"\nOriginal brief to rewrite:\n\n{base_prompt}"),
                types.Part(text=f'\nHeadline text that must appear verbatim: "{headline.strip()}"'),
            ],
        )
        enriched = (response.text or "").strip()
        return enriched if enriched else base_prompt
    except Exception:
        # Enrichment is a nice-to-have, not a hard dependency — silently
        # fall back to the original prompt rather than failing the request.
        return base_prompt


# Modular "Lock face / subject identity" add-on — OFF by default, toggled per
# request from the Headline & Notes card in the frontend (checkbox sits right
# below Notes). Appended to whichever prompt is about to be sent (preset,
# custom, or the auto-built notes prompt) AFTER any enrichment rewrite, so the
# enrichment step can't dilute/paraphrase it away and it lands as the very
# last thing the model reads. Kept separate from the presets themselves so it
# works uniformly regardless of which preset (or no preset at all) is active.
FACE_LOCK_SNIPPET = (
    "SUBJECT IDENTITY LOCK (strict, non-negotiable): the person in this image must be the "
    "exact same individual shown in the reference/base photo — not a similar-looking new "
    "face. Match their precise facial structure, eye shape and color, nose, mouth, eyebrows, "
    "skin tone and texture, and hairstyle/hair color exactly as photographed. Do not "
    "beautify, slim, de-age, restyle, or reinterpret any facial feature. Treat the reference "
    "photo as the ground truth for identity — if any part of the face is ambiguous, "
    "partially occluded, or at an odd angle, default to copying it as closely as possible "
    "rather than inventing a new interpretation, even if that makes the result look less "
    "'polished' than a fully reimagined face would."
)


def build_thumbnail_prompt(headline: str, notes: str) -> str:
    lines = [
        "Create a social-media video THUMBNAIL by compositing the two images above:",
        "",
        "1. Use IMAGE 1 (the background template) as the full background of the thumbnail.",
        "2. Cut out the person/talent from IMAGE 2 (the base photo) cleanly and place them "
        "prominently on the background. Keep their face, expression, pose, clothing and any "
        "products they are holding exactly as in the original photo — do not alter the person.",
        f'3. Add the headline text: "{headline.strip()}"',
        "   - Large, bold, eye-catching thumbnail-style typography (ALL CAPS).",
        "   - Colorful with strong contrast and a bold outline/drop shadow so it pops.",
        "   - Place the text beside or above the talent. It must NOT cover the talent's face.",
    ]
    notes = (notes or "").strip()
    if notes:
        lines += ["", f"ADDITIONAL INSTRUCTIONS FROM REQUESTOR: {notes}"]
    lines += [
        "",
        "ORIENTATION: Vertical portrait, 1080x1440 pixels (3:4 aspect ratio).",
        "Requirements: Bright, clean, high-resolution, professional social-media thumbnail. "
        "The composition should look natural, with the talent well integrated into the "
        "background (matching lighting and color grade).",
    ]
    return "\n".join(lines)


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "auth_enabled": bool(APP_USERS),
        "user_count": len(APP_USERS),
        "gemini_ready": bool(GEMINI_API_KEY),
        "openai_ready": bool(OPENAI_API_KEY),
        "default_provider": DEFAULT_IMAGE_PROVIDER,
        "openai_call_path": "responses_api (reference-based generation)" if OPENAI_USE_RESPONSES_API
                            else "images.edit (legacy, literal-edit)",
        "openai_responses_model": OPENAI_RESPONSES_MODEL if OPENAI_USE_RESPONSES_API else None,
        "openai_cost_note": (
            "Responses API path: per-image cost is NOT flat/predictable — includes vision "
            "input tokens for both reference photos plus orchestration tokens on top of the "
            "image render, billed at openai_responses_model's rate. Check your OpenAI usage "
            "dashboard for actual spend."
        ) if OPENAI_USE_RESPONSES_API else (
            "images.edit path: flat, predictable per-image pricing (~$0.005 low / ~$0.041 "
            "medium / ~$0.165 high)."
        ),
    }


@app.post("/api/generate")
async def generate_background(
    request: Request,
    description:   str = Form(""),
    subject:       str = Form(""),
    object_field:  str = Form(""),
    environment:   str = Form(""),
    action:        str = Form(""),
    style:         str = Form(""),
    camera_angle:  str = Form(""),
    lighting:      str = Form(""),
    mood:          str = Form(""),
    other_details: str = Form(""),
    ratio:         str = Form("Portrait"),
    reference_image: Optional[UploadFile] = File(None),
):
    if not GEMINI_API_KEY:
        raise HTTPException(500, detail="GEMINI_API_KEY is not set on the server.")
    ref_bytes, ref_mime = None, "image/jpeg"
    if reference_image and reference_image.filename:
        ref_bytes = await reference_image.read()
        ref_mime  = reference_image.content_type or "image/jpeg"
        if not ref_bytes:
            ref_bytes = None
    prompt = build_prompt({
        "description": description, "subject": subject,
        "object_field": object_field, "environment": environment,
        "action": action, "style": style, "camera_angle": camera_angle,
        "lighting": lighting, "mood": mood, "other_details": other_details,
        "ratio": ratio,
    })
    try:
        img_bytes = gemini_generate(prompt, ref_bytes, ref_mime)
    except Exception as e:
        raise HTTPException(500, detail=str(e))
    label = (description or subject or "Generated image")[:60]
    image_b64 = base64.b64encode(img_bytes).decode()
    log_generation(request, source="background", label=label, prompt=prompt, image_b64=image_b64, provider="gemini")
    return {
        "success": True,
        "id":     str(uuid.uuid4())[:8],
        "image":  image_b64,
        "format": "png",
        "label":  label,
        "prompt_used": prompt,
    }


@app.post("/api/thumbnail")
async def generate_thumbnail(
    request: Request,
    headline: str = Form(...),
    notes:    str = Form(""),
    custom_prompt: str = Form(""),
    provider: str = Form(""),
    quality:  str = Form(""),
    enrich_prompt: str = Form("1"),   # OpenAI only: "1"/"0" — per-request enrichment toggle
    preserve_face: str = Form("0"),   # "1"/"0" — appends FACE_LOCK_SNIPPET, off by default
    background_image: UploadFile = File(...),
    base_image:       UploadFile = File(...),
):
    provider = (provider or DEFAULT_IMAGE_PROVIDER).strip().lower()
    if provider not in ("gemini", "openai"):
        raise HTTPException(400, detail=f"Unknown provider '{provider}'. Use 'gemini' or 'openai'.")
    if provider == "gemini" and not GEMINI_API_KEY:
        raise HTTPException(500, detail="GEMINI_API_KEY is not set on the server.")
    if provider == "openai" and not OPENAI_API_KEY:
        raise HTTPException(500, detail="OPENAI_API_KEY is not set on the server.")
    if not headline.strip():
        raise HTTPException(400, detail="Headline is required.")

    bg_bytes  = await background_image.read()
    base_bytes = await base_image.read()
    if not bg_bytes:
        raise HTTPException(400, detail="Background photo is empty or missing.")
    if not base_bytes:
        raise HTTPException(400, detail="Base photo is empty or missing.")

    bg_mime   = background_image.content_type or "image/jpeg"
    base_mime = base_image.content_type or "image/jpeg"

    # Gemini and OpenAI get different prompt treatment on purpose:
    #
    # - Gemini (Nano Banana) needs heavy scaffolding — explicit "do not do X"
    #   guardrails plus an LLM enrichment pass — because left to itself it
    #   tends to flat-paste, invent a different product angle, or render
    #   backgrounds as hard-edged cartoon shapes. That scaffolding was built
    #   specifically to work around those failure modes.
    # - OpenAI (GPT Image 2) presets never get Gemini's full "do not do X" #1/2/3
    #   guardrail wrapper wholesale pasted on top — piling all of that on top
    #   would be noise and could contradict phrasing GPT already follows well.
    #   They DO get their own lighter-touch enrichment pass
    #   (enrich_openai_prompt), because ChatGPT's interactive image tool was
    #   silently doing that to your prompt the whole time you tested there —
    #   so skipping it wasn't actually sending "the same thing that worked in
    #   ChatGPT," it was sending less than that. That enrichment pass carries
    #   exactly one narrow guardrail of its own (background reference = mood
    #   board, not a literal layout to reproduce), added after live testing
    #   showed the background photo's flat illustration gets reproduced
    #   verbatim otherwise — see enrich_openai_prompt()'s docstring.
    enrichment_used = None
    enrichment_error = None
    if provider == "openai":
        prompt = custom_prompt.strip() if custom_prompt.strip() else build_thumbnail_prompt(headline, notes)
        want_enrichment = (enrich_prompt or "1").strip() != "0"
        prompt, enrichment_used, enrichment_error = enrich_openai_prompt(
            prompt, headline, bg_bytes, bg_mime, base_bytes, base_mime,
            enabled=want_enrichment,
        )
        if not enrichment_used:
            print(f"[/api/thumbnail] OpenAI prompt enrichment did NOT run — sent raw prompt. Reason: {enrichment_error}")
    else:
        if custom_prompt.strip():
            prompt = (
                "CRITICAL — DO NOT DO THIS #1: do not simply paste or overlay the product/subject "
                "photo on top of the background photo like a sticker or flat collage. That is a "
                "failure. Both input images are references only — the final image must be a single, "
                "newly rendered photograph where the lighting, shadows, reflections and perspective "
                "on the subject are completely redrawn to match a real photo shoot in the described "
                "environment. The subject's shadow must fall naturally onto the new surface/background, "
                "the color grading of the subject must match the new lighting, and the background must "
                "NOT look like the original flat illustration — it must look like a real, physically "
                "photographed 3D scene whose colors and mood are inspired by the reference image.\n\n"
                "CRITICAL — DO NOT DO THIS #2: do not change WHAT you see of the product/subject. "
                "'Relight' means changing the light source, shadows and color grade only — it does "
                "NOT mean inventing a different camera angle, a different side of the object, a "
                "different screen/display content, or a different pose. If the base photo shows the "
                "BACK of a device, your output must also show the BACK of that device — never invent "
                "a front view, a screen UI, or any surface/markings that are not visible in the "
                "original photo. Copy the product's exact silhouette, angle, and visible surfaces "
                "faithfully; only its lighting and surrounding environment should change.\n\n"
                "CRITICAL — DO NOT DO THIS #3: do not render the background's colorful shapes as "
                "flat, hard-edged, vector/sticker graphics — even after 'restyling' them. Every "
                "colorful shape, glow, or accent in the final image must look like it was captured "
                "by a real camera lens: softly out of focus, with gently feathered edges and natural "
                "light falloff (true photographic bokeh), never a crisp cartoon outline. Also: the "
                "product/subject must be resting on a clearly visible, photographically real surface "
                "(e.g. a wood or light-colored desk/tabletop) with a soft, correctly-angled contact "
                "shadow directly beneath it — do not leave it floating in front of an abstract color "
                "backdrop with no ground plane. The entire image, props included, must share one "
                "consistent warm light source and color grade so it reads as a single photograph, "
                "not photorealistic props layered over a separate graphic background.\n\n"
                "Now follow these detailed instructions:\n\n"
                + custom_prompt.strip()
                + "\n\nFinal reminders: (1) this must read as ONE cohesively lit photograph, not two "
                "images stacked together — re-render, don't paste. (2) the product/subject must show "
                "the exact same side/angle/view as in the base photo — do not rotate it or reveal a "
                "side that wasn't photographed. (3) fill the frame with enough environmental detail "
                "(props, depth, layers) that it doesn't look sparse or empty — aim for a busy, richly "
                "styled desk/lifestyle scene, not a product floating in mostly empty space."
            )
        else:
            prompt = build_thumbnail_prompt(headline, notes)

        # Rewrite the brief into something more concrete/vivid before
        # generating (grounded in the actual photos) — Gemini-only, see note
        # above. Silently falls back to `prompt` unchanged on failure.
        prompt = enrich_thumbnail_prompt(prompt, headline, bg_bytes, bg_mime, base_bytes, base_mime)

    # Modular face/subject identity lock — applied last, after any enrichment
    # rewrite, so it reaches the model verbatim regardless of provider or
    # whether a preset/custom prompt or the plain notes-built prompt was used.
    if (preserve_face or "0").strip() == "1":
        prompt = prompt.rstrip() + "\n\n" + FACE_LOCK_SNIPPET

    try:
        if provider == "openai":
            img_bytes = openai_generate_thumbnail(
                prompt,
                bg_bytes,  bg_mime,
                base_bytes, base_mime,
                quality=quality,
            )
        else:
            img_bytes = gemini_generate_thumbnail(
                prompt,
                bg_bytes,  bg_mime,
                base_bytes, base_mime,
            )
    except Exception as e:
        raise HTTPException(500, detail=str(e))
    label = headline.strip()[:60]
    image_b64 = base64.b64encode(img_bytes).decode()
    log_generation(request, source="thumbnail", label=label, prompt=prompt, image_b64=image_b64,
                    provider=provider, quality=quality if provider == "openai" else None)
    return {
        "success": True,
        "id":     str(uuid.uuid4())[:8],
        "image":  image_b64,
        "format": "png",
        "provider_used": provider,
        "quality_used": quality if provider == "openai" else None,
        "prompt_used": prompt,
        "enrichment_used": enrichment_used,
        "enrichment_error": enrichment_error,
        "label":  label,
    }


@app.post("/api/edit-photo")
async def edit_photo(
    request: Request,
    prompt: str = Form(...),
    image:  UploadFile = File(...),
    reference_images: List[UploadFile] = File(default=[]),
):
    """
    Dedicated Edit Photo endpoint — takes ONE photo plus a plain-language
    instruction and applies a true image edit via OpenAI's `images.edit`
    (see `openai_edit_photo()`). Always OpenAI, always Low quality —
    there's no provider/quality choice here on purpose, this feature exists
    specifically to be the cheap, quick "small adjustment" path.

    `reference_images` (optional, up to 3 from the UI, but not enforced
    here): extra photos — a logo, an object, or a background — the model
    can pull specific elements from while `image` stays the literal edit
    canvas. Omit them entirely and this behaves exactly as before.
    """
    if not OPENAI_API_KEY:
        raise HTTPException(500, detail="OPENAI_API_KEY is not set on the server.")
    if not prompt.strip():
        raise HTTPException(400, detail="Please describe the edit you want.")

    img_bytes = await image.read()
    if not img_bytes:
        raise HTTPException(400, detail="Photo is empty or missing.")

    ref_pairs = []
    for ref in reference_images or []:
        if not ref or not ref.filename:
            continue
        ref_bytes = await ref.read()
        if ref_bytes:
            ref_pairs.append((ref_bytes, ref.content_type or "image/jpeg"))

    # images.edit gets one text prompt for the whole call — there's no way to
    # caption each image individually the way the Responses API allows — so
    # when references are attached, the instructions for how to use them
    # have to be woven into the prompt text itself, ahead of the user's own
    # instruction.
    edit_prompt = prompt.strip()
    if ref_pairs:
        count_word = "an extra reference photo" if len(ref_pairs) == 1 else f"{len(ref_pairs)} extra reference photos"
        edit_prompt = (
            f"You've also been given {count_word} after the base photo. Use "
            "them ONLY as a source for a specific object, logo, brand, or "
            "background style to bring into the edit — do not change the "
            "base photo's main subject, pose, or composition unless the "
            "instruction below explicitly asks for that.\n\n"
            f"Instruction: {edit_prompt}"
        )

    try:
        result_bytes = openai_edit_photo(
            edit_prompt, img_bytes, image.content_type or "image/jpeg",
            reference_images=ref_pairs,
        )
    except Exception as e:
        raise HTTPException(500, detail=str(e))

    label = prompt.strip()[:60]
    image_b64 = base64.b64encode(result_bytes).decode()
    log_generation(request, source="edit-photo", label=label, prompt=edit_prompt, image_b64=image_b64,
                    provider="openai", quality="low")
    return {
        "success": True,
        "id":     str(uuid.uuid4())[:8],
        "image":  image_b64,
        "format": "png",
        "provider_used": "openai",
        "quality_used": "low",
        "prompt_used": edit_prompt,
        "label":  label,
    }


@app.post("/api/quick-generate")
async def quick_generate(
    request: Request,
    prompt: str = Form(...),
    reference_image: Optional[UploadFile] = File(None),
):
    if not GEMINI_API_KEY:
        raise HTTPException(500, detail="GEMINI_API_KEY is not set on the server.")
    ref_bytes, ref_mime = None, "image/jpeg"
    if reference_image and reference_image.filename:
        ref_bytes = await reference_image.read()
        ref_mime  = reference_image.content_type or "image/jpeg"
        if not ref_bytes:
            ref_bytes = None
    full_prompt = (
        f"{prompt}\n\n"
        "Requirements: High-quality, professional, visually compelling image. "
        "High resolution, clean composition."
    )
    try:
        img_bytes = gemini_generate(full_prompt, ref_bytes, ref_mime)
    except Exception as e:
        raise HTTPException(500, detail=str(e))
    label = prompt[:60]
    image_b64 = base64.b64encode(img_bytes).decode()
    log_generation(request, source="quick-generate", label=label, prompt=full_prompt, image_b64=image_b64, provider="gemini")
    return {
        "success": True,
        "id":     str(uuid.uuid4())[:8],
        "image":  image_b64,
        "format": "png",
        "label":  label,
        "prompt_used": full_prompt,
    }


# ── Serve the built frontend (production only) ──────────────────────────
# In local dev, the Vite dev server (`npm run dev`) serves the frontend on
# its own port and proxies /api/* to this backend — this block does nothing
# then, since frontend/dist won't exist yet. In production (e.g. on
# Render), the build step runs `npm run build` first, which produces
# frontend/dist; mounting it here means ONE deployed service serves both
# the UI and the API on the same URL — no separate static site, no CORS
# setup needed. This MUST be the last thing in the file: Starlette matches
# routes in registration order, so every /api/* route above is matched
# first, and only whatever's left over (the actual page requests) falls
# through to this static mount.
_FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if _FRONTEND_DIST.is_dir():
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(_FRONTEND_DIST), html=True), name="frontend")