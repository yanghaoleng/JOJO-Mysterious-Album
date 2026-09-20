import os
import unittest
import uuid
from unittest.mock import patch

import identity_mysql


class IdentityHelpersTest(unittest.TestCase):
    def test_scrypt_hash_verifies_only_original_password(self):
        encoded = identity_mysql.scrypt_hash("a-long-test-password")
        self.assertTrue(identity_mysql.verify_admin_password("a-long-test-password", encoded))
        self.assertFalse(identity_mysql.verify_admin_password("wrong-password", encoded))
        self.assertFalse(identity_mysql.verify_admin_password("a-long-test-password", "broken"))

    def test_token_digest_uses_server_side_pepper(self):
        with patch.dict(os.environ, {"SESSION_TOKEN_PEPPER": "a" * 32}, clear=False):
            first = identity_mysql.token_digest("browser-token")
            self.assertEqual(first, identity_mysql.token_digest("browser-token"))
        with patch.dict(os.environ, {"SESSION_TOKEN_PEPPER": "b" * 32}, clear=False):
            self.assertNotEqual(first, identity_mysql.token_digest("browser-token"))

    def test_uuid_parser_returns_binary_uuid(self):
        value = uuid.uuid4()
        self.assertEqual(identity_mysql.parse_uuid(str(value)), value.bytes)
        with self.assertRaisesRegex(ValueError, "invalid_user_id"):
            identity_mysql.parse_uuid("not-a-user")

    def test_admin_session_is_signed_and_scoped_to_configured_user(self):
        environment = {"ADMIN_USERNAME": "tester", "ADMIN_SESSION_SECRET": "s" * 32}
        with patch.dict(os.environ, environment, clear=False):
            value = identity_mysql.make_admin_session("tester")
            self.assertTrue(identity_mysql.valid_admin_session(value))
            self.assertFalse(identity_mysql.valid_admin_session(value + "changed"))
        with patch.dict(os.environ, {**environment, "ADMIN_USERNAME": "someone-else"}, clear=False):
            self.assertFalse(identity_mysql.valid_admin_session(value))


if __name__ == "__main__":
    unittest.main()

