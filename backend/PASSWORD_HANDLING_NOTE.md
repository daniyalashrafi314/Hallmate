# Password Handling Rule

- Hash passwords on write.
- Verify passwords on read with `verify_password`.
- Never store plaintext passwords in `USERS.password`.
- Keep hashing logic in `app/security/passwords.py`.
- Keep frontend forms responsible only for collecting and sending the password.
- Any database procedure that writes to `USERS.password` must receive a hashed value.