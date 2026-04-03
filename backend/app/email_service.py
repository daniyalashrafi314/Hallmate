import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SENDER_EMAIL = os.getenv('SENDER_EMAIL', 'mehrab7226@gmail.com')
SENDER_PASSWORD = os.getenv('SENDER_PASSWORD', 'xzrj unrn lmsm pnmq')


def _send_email(receiver_email, subject, body):
    msg = MIMEMultipart()
    msg['From'] = SENDER_EMAIL
    msg['To'] = receiver_email
    msg['Subject'] = subject
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

def send_welcome_email(receiver_email, user_id, raw_password):
    subject = "Welcome to the Hall Management System - Login Credentials"
    body = f"""
    Hello,

    An account has been successfully created for you in the Hall Management System.
    
    Your login credentials are:
    Username: {user_id}
    Password: {raw_password}

    Please log in and change your password as soon as possible.
    """
    return _send_email(receiver_email, subject, body)


def send_student_deletion_email(receiver_email, student_id, student_name=None, hall_name=None):
    subject = "Hall Management System - Account Removed"
    display_name = student_name or "Student"
    hall_line = f"Hall: {hall_name}\n" if hall_name else ""
    body = f"""
    Hello {display_name},

    Your Hall Management System account has been removed by hall administration.

    Student ID: {student_id}
    {hall_line}
    If you believe this was done in error, please contact your hall office.
    """
    return _send_email(receiver_email, subject, body)