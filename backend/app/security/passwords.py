from werkzeug.security import check_password_hash, generate_password_hash


def hash_password(password: str) -> str:
    return generate_password_hash(password)


def verify_password(stored_password: str, entered_password: str) -> bool:
    if not stored_password or not entered_password:
        return False

    # Support hashed passwords (preferred) and fallback to raw compare for legacy data.
    if looks_like_hashed_password(stored_password):
        return check_password_hash(stored_password, entered_password)

    return stored_password == entered_password

def looks_like_hashed_password(value: str) -> bool:
    return isinstance(value, str) and value.startswith(("scrypt:", "pbkdf2:", "argon2:", "sha256:"))
