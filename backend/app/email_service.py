import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_welcome_email(receiver_email, user_id, raw_password):
    SMTP_SERVER = "smtp.gmail.com"
    SMTP_PORT = 587
    SENDER_EMAIL = "mehrab7226@gmail.com" 
    SENDER_PASSWORD = "xzrj unrn lmsm pnmq" 

    msg = MIMEMultipart()
    msg['From'] = SENDER_EMAIL
    msg['To'] = receiver_email
    msg['Subject'] = "Welcome to the Hall Management System - Login Credentials"

    body = f"""
    Hello,

    An account has been successfully created for you in the Hall Management System.
    
    Your login credentials are:
    Username: {user_id}
    Password: {raw_password}

    Please log in and change your password as soon as possible.
    """
    msg.attach(MIMEText(body, 'plain'))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls() 
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email to {receiver_email}: {e}")
        return False