#!/usr/bin/env python3
"""Generate a password_hash value for an APP_USERS entry."""

import base64
import getpass
import hashlib
import secrets

ITERATIONS = 600_000


def _encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def main() -> None:
    password = getpass.getpass("Password (12+ characters): ")
    if len(password) < 12:
        raise SystemExit("Password must contain at least 12 characters.")
    if password != getpass.getpass("Confirm password: "):
        raise SystemExit("Passwords did not match.")
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, ITERATIONS)
    print(f"pbkdf2_sha256${ITERATIONS}${_encode(salt)}${_encode(digest)}")


if __name__ == "__main__":
    main()
