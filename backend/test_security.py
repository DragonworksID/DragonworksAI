import asyncio
import io
import os
import sys
import unittest
from unittest.mock import patch

from fastapi import UploadFile
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(__file__))
import main


class SecurityRegressionTests(unittest.TestCase):
    def setUp(self):
        self.original_auth_required = main.AUTH_REQUIRED
        self.original_users = main.APP_USERS
        self.original_cookie_secure = main.COOKIE_SECURE
        self.original_session_cookie = main.SESSION_COOKIE
        self.original_gemini_key = main.GEMINI_API_KEY
        main.AUTH_REQUIRED = True
        main.COOKIE_SECURE = True
        main.SESSION_COOKIE = "__Host-dw_session"
        main.GEMINI_API_KEY = "test-only-key"
        main.APP_USERS = [
            {
                "username": "admin",
                "password_hash": main.hash_password("correct horse battery staple", iterations=100_000),
                "role": "admin",
            },
            {
                "username": "user",
                "password_hash": main.hash_password("another secure passphrase", iterations=100_000),
                "role": "user",
            },
        ]
        main.SESSIONS.clear()
        main._RATE_BUCKETS.clear()
        main.GENERATION_LOG.clear()
        self.client = TestClient(main.app, base_url="https://testserver")

    def tearDown(self):
        self.client.close()
        main.AUTH_REQUIRED = self.original_auth_required
        main.APP_USERS = self.original_users
        main.COOKIE_SECURE = self.original_cookie_secure
        main.SESSION_COOKIE = self.original_session_cookie
        main.GEMINI_API_KEY = self.original_gemini_key
        main.SESSIONS.clear()
        main._RATE_BUCKETS.clear()
        main.GENERATION_LOG.clear()

    def test_public_health_is_minimal_and_hardened(self):
        response = self.client.get("/api/health", headers={"Origin": "https://evil.example"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True})
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")
        self.assertEqual(response.headers["x-frame-options"], "DENY")
        self.assertIn("no-store", response.headers["cache-control"])
        self.assertNotIn("access-control-allow-origin", response.headers)

    def test_protected_api_requires_a_session(self):
        response = self.client.get("/api/status")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"detail": "Not authenticated"})
        self.assertEqual(response.headers["x-frame-options"], "DENY")

    def test_login_cookie_and_admin_authorization(self):
        response = self.client.post(
            "/api/login",
            json={"username": "admin", "password": "correct horse battery staple"},
        )
        self.assertEqual(response.status_code, 200)
        cookie = response.headers["set-cookie"].lower()
        self.assertIn("httponly", cookie)
        self.assertIn("secure", cookie)
        self.assertIn("samesite=strict", cookie)
        self.assertEqual(self.client.get("/api/admin/history").status_code, 200)

        user_client = TestClient(main.app, base_url="https://testserver")
        try:
            response = user_client.post(
                "/api/login",
                json={"username": "user", "password": "another secure passphrase"},
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(user_client.get("/api/admin/history").status_code, 403)
        finally:
            user_client.close()

    def test_failed_logins_are_rate_limited(self):
        for _ in range(main.LOGIN_RATE_LIMIT):
            response = self.client.post(
                "/api/login", json={"username": "admin", "password": "wrong password"}
            )
            self.assertEqual(response.status_code, 401)
        response = self.client.post(
            "/api/login", json={"username": "admin", "password": "wrong password"}
        )
        self.assertEqual(response.status_code, 429)
        self.assertIn("retry-after", response.headers)

    def test_password_hash_round_trip(self):
        encoded = main.hash_password("a unique long test password", iterations=100_000)
        self.assertTrue(main._verify_password("a unique long test password", encoded))
        self.assertFalse(main._verify_password("wrong", encoded))

    def test_invalid_image_upload_is_rejected(self):
        upload = UploadFile(file=io.BytesIO(b"<svg><script>alert(1)</script></svg>"), filename="photo.png")
        with self.assertRaises(main.HTTPException) as caught:
            asyncio.run(main._read_image_upload(upload, "Photo"))
        self.assertEqual(caught.exception.status_code, 415)

    def test_generation_route_rejects_disguised_non_image(self):
        self.client.post(
            "/api/login",
            json={"username": "admin", "password": "correct horse battery staple"},
        )
        response = self.client.post(
            "/api/quick-generate",
            data={"prompt": "test image"},
            files={"reference_image": ("photo.png", b"<svg><script/></svg>", "image/png")},
        )
        self.assertEqual(response.status_code, 415)

    def test_generation_route_still_returns_a_valid_image(self):
        from PIL import Image

        output = io.BytesIO()
        Image.new("RGB", (2, 2), color=(30, 60, 90)).save(output, format="PNG")
        png = output.getvalue()
        self.client.post(
            "/api/login",
            json={"username": "admin", "password": "correct horse battery staple"},
        )
        with patch.object(main, "gemini_generate", return_value=png):
            response = self.client.post(
                "/api/quick-generate",
                data={"prompt": "a safe test image"},
                files={"reference_image": ("photo.png", png, "image/png")},
            )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["image"])
        self.assertEqual(len(main.GENERATION_LOG), 1)

    def test_provider_failures_do_not_leak_upstream_details(self):
        self.client.post(
            "/api/login",
            json={"username": "admin", "password": "correct horse battery staple"},
        )
        with patch.object(
            main,
            "gemini_generate",
            side_effect=RuntimeError("sensitive upstream response and request metadata"),
        ):
            response = self.client.post(
                "/api/quick-generate",
                data={"prompt": "a safe test image"},
            )
        self.assertEqual(response.status_code, 502)
        self.assertNotIn("sensitive", response.text)
        self.assertIn("Reference:", response.json()["detail"])

    def test_oversized_content_length_is_rejected(self):
        response = self.client.post(
            "/api/login",
            content=b"",
            headers={"Content-Length": str(main.MAX_REQUEST_BODY_BYTES + 1)},
        )
        self.assertEqual(response.status_code, 413)

    def test_required_auth_configuration_fails_closed(self):
        old_env = main.APP_USERS_ENV
        old_legacy = main.ALLOW_LEGACY_PLAINTEXT_PASSWORDS
        old_legacy_min_length = main.LEGACY_PLAINTEXT_MIN_LENGTH
        try:
            main.APP_USERS_ENV = ""
            with self.assertRaises(RuntimeError):
                main._load_app_users()
            main.APP_USERS_ENV = "not-json"
            with self.assertRaises(RuntimeError):
                main._load_app_users()
            main.APP_USERS_ENV = '[{"username":"admin","password_hash":"pbkdf2_sha256$bad","role":"admin"}]'
            with self.assertRaises(RuntimeError):
                main._load_app_users()
            main.ALLOW_LEGACY_PLAINTEXT_PASSWORDS = False
            main.APP_USERS_ENV = '[{"username":"admin","password":"long legacy password","role":"admin"}]'
            with self.assertRaises(RuntimeError):
                main._load_app_users()

            main.ALLOW_LEGACY_PLAINTEXT_PASSWORDS = True
            main.LEGACY_PLAINTEXT_MIN_LENGTH = 6
            main.APP_USERS_ENV = '[{"username":"admin","password":"abc123","role":"admin"}]'
            migrated_users = main._load_app_users()
            self.assertEqual(len(migrated_users), 1)
            self.assertTrue(main._verify_password("abc123", migrated_users[0]["password_hash"]))
            self.assertNotIn("password", migrated_users[0])

            main.LEGACY_PLAINTEXT_MIN_LENGTH = 7
            with self.assertRaises(RuntimeError):
                main._load_app_users()
        finally:
            main.APP_USERS_ENV = old_env
            main.ALLOW_LEGACY_PLAINTEXT_PASSWORDS = old_legacy
            main.LEGACY_PLAINTEXT_MIN_LENGTH = old_legacy_min_length


if __name__ == "__main__":
    unittest.main()
