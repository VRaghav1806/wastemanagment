import os
import resend

resend.api_key = "re_6bvxSh3E_JWPWYfXHYJ2CDBkWgFLhU6A6"
admin_email = "raghav.v2024aids@sece.ac.in"

try:
    print(f"Attempting to send test email to {admin_email}...")
    params = {
        "from": "Circular Waste Intelligence <onboarding@resend.dev>",
        "to": [admin_email],
        "subject": "Resend API Test",
        "html": "<strong>Testing the Resend integration from Antigravity.</strong>"
    }
    r = resend.Emails.send(params)
    print("Success! Response:", r)
except Exception as e:
    print("Failed! Error:", str(e))
