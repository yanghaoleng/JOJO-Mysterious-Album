#!/usr/bin/env python3
"""Print an ADMIN_PASSWORD_HASH value without storing the source password."""

import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from identity_mysql import scrypt_hash


if __name__ == "__main__":
    password = getpass.getpass("Admin password: ")
    if len(password) < 12:
        raise SystemExit("Password must contain at least 12 characters")
    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        raise SystemExit("Passwords do not match")
    print(scrypt_hash(password))
