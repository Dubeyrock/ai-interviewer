"""
Email Service — Resend.com
Professional email delivery for PratibhaAI
"""

import os
import smtplib
import resend
from typing import Optional
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.utils import formataddr
from app.core.config import settings

resend.api_key = settings.resend_api_key or os.getenv("RESEND_API_KEY", "")

FROM_EMAIL = settings.smtp_from or os.getenv("SMTP_FROM", "PratibhaAI <onboarding@resend.dev>")


def _send_email(
    to_email: str,
    subject: str,
    html: str,
    attachment_bytes: bytes | None = None,
    filename: str | None = None,
) -> bool:
    """Send an HTML email. Prefers configured SMTP (Gmail), falls back to
    Resend, then demo-mode console print. SMTP has no per-recipient restriction
    so it can deliver to any client email."""

    # 1) SMTP (Gmail / custom) — preferred, unrestricted recipients
    if settings.smtp_host and settings.smtp_user and settings.smtp_pass:
        try:
            msg = MIMEMultipart()
            msg["From"] = formataddr(("PratibhaAI", settings.smtp_user))
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(html, "html"))
            if attachment_bytes:
                part = MIMEApplication(attachment_bytes, Name=filename or "attachment.pdf")
                part["Content-Disposition"] = f'attachment; filename="{filename or "attachment.pdf"}"'
                msg.attach(part)

            if settings.smtp_use_ssl:
                with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port) as server:
                    server.login(settings.smtp_user, settings.smtp_pass)
                    server.sendmail(settings.smtp_user, [to_email], msg.as_string())
            else:
                with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                    if settings.smtp_starttls:
                        server.starttls()
                    server.login(settings.smtp_user, settings.smtp_pass)
                    server.sendmail(settings.smtp_user, [to_email], msg.as_string())

            print(f"Email sent via SMTP to {to_email}")
            return True
        except Exception as e:
            print(f"SMTP send failed: {e}")

    # 2) Resend (requires a verified domain for non-owner recipients)
    if resend.api_key:
        try:
            payload = {"from": FROM_EMAIL, "to": [to_email], "subject": subject, "html": html}
            if attachment_bytes:
                import base64
                payload["attachments"] = [
                    {
                        "content": base64.b64encode(attachment_bytes).decode("utf-8"),
                        "filename": filename or "receipt.pdf",
                    }
                ]
            response = resend.Emails.send(payload)
            print(f"Email sent via Resend: {response}")
            return True
        except Exception as e:
            print(f"Resend email failed: {e}")

    # 3) Demo mode
    print("SMTP / RESEND_API_KEY not configured — Demo mode")
    print(f"Email to: {to_email} | Subject: {subject}")
    return False


def _render_schedule_email_html(
    candidate_name: str,
    meeting_link: str,
    time: str,
    hr_name: str,
    interview_role: str = "",
    job_description: Optional[str] = None,
    required_skills: Optional[list] = None,
    job_id: Optional[str] = None,
) -> str:
    skills_section = ""
    if required_skills and len(required_skills) > 0:
        skills_list = "".join(f"<li>{skill}</li>" for skill in required_skills)
        skills_section = f"""
        <tr>
          <td style="padding: 10px 0; color: #4b5563; font-size: 14px;">
            <strong>Required Skills:</strong>
            <ul style="margin: 6px 0 0 18px; padding: 0; color: #6b7280; font-size: 14px;">
              {skills_list}
            </ul>
          </td>
        </tr>
        """

    job_desc_section = ""
    if job_description:
        job_desc_section = f"""
        <tr>
          <td style="padding: 10px 0; color: #4b5563; font-size: 14px;">
            <strong>Job Description:</strong>
            <p style="margin: 6px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">{job_description}</p>
          </td>
        </tr>
        """

    job_id_section = ""
    if job_id:
        job_id_section = f"""
        <tr>
          <td style="padding: 10px 0; color: #4b5563; font-size: 14px;">
            <strong>Job ID:</strong> <span style="color: #6b7280; font-size: 14px;">{job_id}</span>
          </td>
        </tr>
        """

    hr_section = ""
    if hr_name:
        hr_section = f"""
        <tr>
          <td style="padding: 10px 0; color: #4b5563; font-size: 14px;">
            <strong>HR Contact:</strong> <span style="color: #6b7280; font-size: 14px;">{hr_name}</span>
          </td>
        </tr>
        """

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Interview Scheduled</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px; background-color: #f3f4f6;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <tr>
                <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px 40px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">Interview Scheduled</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px 40px;">
                  <p style="margin: 0 0 16px 0; color: #111827; font-size: 16px; line-height: 1.6;">Dear <strong>{candidate_name}</strong>,</p>
                  <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                    Congratulations! Your interview has been successfully scheduled for the position of <strong>{interview_role or 'the advertised role'}</strong>. We are excited to learn more about you and your experience.
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 10px 0;">
                    <tr>
                      <td style="padding: 10px 0; color: #4b5563; font-size: 14px;">
                        <strong>Interview Role:</strong> <span style="color: #6b7280; font-size: 14px;">{interview_role or 'N/A'}</span>
                      </td>
                    </tr>
                    {job_id_section}
                    {hr_section}
                    <tr>
                      <td style="padding: 10px 0; color: #4b5563; font-size: 14px;">
                        <strong>Date & Time:</strong> <span style="color: #6b7280; font-size: 14px;">{time}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #4b5563; font-size: 14px;">
                        <strong>Meeting Link:</strong> <a href="{meeting_link}" style="color: #2563eb; text-decoration: none; font-size: 14px; font-weight: 500;">{meeting_link}</a>
                      </td>
                    </tr>
                    {job_desc_section}
                    {skills_section}
                  </table>

                  <p style="margin: 20px 0 8px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                    Please join the meeting a few minutes early to ensure a smooth experience. If you have any questions, feel free to reach out to us.
                  </p>
                  <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                    We look forward to speaking with you. Best of luck!
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #9ca3af; font-size: 12px;">Best regards, <br><strong style="color: #6b7280;">HR Team</strong></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """


def send_schedule_email(
    to_email: str,
    candidate_name: str,
    meeting_link: str,
    time: str,
    hr_name: str = "HR Team",
    subject: Optional[str] = None,
    job_title: Optional[str] = None,
    job_description: Optional[str] = None,
    required_skills: Optional[list] = None,
    job_id: Optional[str] = None,
):
    if not resend.api_key:
        print("RESEND_API_KEY not set — Demo mode")
        print(f"To: {to_email} | Meet: {meeting_link}")
        return

    interview_role = job_title or ""
    if subject is None:
        subject = f"Interview Scheduled — {interview_role or 'Role'} | PratibhaAI"

    html = _render_schedule_email_html(
        candidate_name=candidate_name,
        meeting_link=meeting_link,
        time=time,
        hr_name=hr_name,
        interview_role=interview_role,
        job_description=job_description,
        required_skills=required_skills,
        job_id=job_id,
    )

    try:
        response = _send_email(to_email=to_email, subject=subject, html=html)
        return response
    except Exception as e:
        print(f"Resend email failed: {e}")
        raise


def _render_demo_confirmation_body(name: str, email: str, company: Optional[str], preferred_date: Optional[str], message: Optional[str]) -> str:
    company_section = ""
    if company:
        company_section = f"""
        <tr>
          <td style="padding: 10px 0; color: #4b5563; font-size: 14px;">
            <strong>Company:</strong> <span style="color: #6b7280; font-size: 14px;">{company}</span>
          </td>
        </tr>
        """

    date_section = ""
    if preferred_date:
        date_section = f"""
        <tr>
          <td style="padding: 10px 0; color: #4b5563; font-size: 14px;">
            <strong>Preferred Date:</strong> <span style="color: #6b7280; font-size: 14px;">{preferred_date}</span>
          </td>
        </tr>
        """

    message_section = ""
    if message:
        message_section = f"""
        <tr>
          <td style="padding: 10px 0; color: #4b5563; font-size: 14px;">
            <strong>Message:</strong>
            <p style="margin: 6px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">{message}</p>
          </td>
        </tr>
        """

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Demo Request Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px; background-color: #f3f4f6;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <tr>
                <td style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 30px 40px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">Demo Request Received</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px 40px;">
                  <p style="margin: 0 0 16px 0; color: #111827; font-size: 16px; line-height: 1.6;">Hi <strong>{name}</strong>,</p>
                  <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                    Thank you for booking a demo with PratibhaAI. We have received your request and our team will reach out within 24 hours to schedule your personalized walkthrough.
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 10px 0;">
                    <tr>
                      <td style="padding: 10px 0; color: #4b5563; font-size: 14px;">
                        <strong>Name:</strong> <span style="color: #6b7280; font-size: 14px;">{name}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #4b5563; font-size: 14px;">
                        <strong>Email:</strong> <span style="color: #6b7280; font-size: 14px;">{email}</span>
                      </td>
                    </tr>
                    {company_section}
                    {date_section}
                    {message_section}
                  </table>

                  <p style="margin: 20px 0 8px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                    If you have any questions in the meantime, feel free to reply to this email.
                  </p>
                  <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                    Best regards,<br>
                    <strong>PratibhaAI Team</strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #9ca3af; font-size: 12px;">© {datetime.now().year} PratibhaAI — Made in India 🇮🇳</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """


def send_demo_confirmation_email(
    to_email: str,
    name: str,
    company: Optional[str] = None,
    preferred_date: Optional[str] = None,
    message: Optional[str] = None,
    subject: Optional[str] = None,
):
    if subject is None:
        subject = "Demo Request Confirmation — PratibhaAI"
    body = _render_demo_confirmation_body(
        name=name,
        email=to_email,
        company=company,
        preferred_date=preferred_date,
        message=message,
    )

    if not resend.api_key:
        print("RESEND_API_KEY not set — Demo mode")
        print(f"Demo confirmation email to: {to_email}")
        return

    try:
        response = _send_email(to_email=to_email, subject=subject, html=body)
        return response
    except Exception as e:
        print(f"Resend demo confirmation email failed: {e}")
        raise


def send_interview_complete_email(
    to_email: str,
    candidate_name: str,
    score: float,
    recommendation: str,
    job_role: str = "",
):
    if not resend.api_key:
        print(f"Demo: Interview complete email to {to_email}")
        return

    rec_config = {
        "SELECTED":   {"color": "#10b981", "text": "Congratulations! You have been shortlisted.", "emoji": "🎉"},
        "HOLD":       {"color": "#f59e0b", "text": "Your profile is under review.",               "emoji": "⏳"},
        "REJECTED":   {"color": "#ef4444", "text": "Thank you for your interest.",                "emoji": "📝"},
        "PENDING":    {"color": "#6366f1", "text": "Results will be shared within 48 hours.",     "emoji": "⏰"},
    }
    cfg = rec_config.get(recommendation.upper(), rec_config["PENDING"])

    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body{{margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4}}
  .wrap{{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden}}
  .hdr{{background:linear-gradient(135deg,#10b981,#059669);padding:32px;text-align:center}}
  .hdr h1{{color:#fff;margin:0;font-size:24px}}
  .body{{padding:32px}}
  .score-box{{text-align:center;padding:24px;background:#f8fafc;border-radius:12px;margin:20px 0}}
  .score{{font-size:48px;font-weight:700;color:#10b981}}
  .rec-box{{background:{cfg["color"]}15;border:2px solid {cfg["color"]};border-radius:12px;padding:20px;text-align:center;margin:20px 0}}
  .rec-text{{color:{cfg["color"]};font-weight:700;font-size:16px}}
  .footer{{background:#f8fafc;padding:20px;text-align:center;font-size:12px;color:#94a3b8}}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <h1>🤖 PratibhaAI</h1>
    <p style="color:rgba(255,255,255,.85);margin:6px 0 0">Interview Completed</p>
  </div>
  <div class="body">
    <p style="font-size:17px;color:#1e293b">
      Dear <strong>{candidate_name}</strong>,
    </p>
    <p style="color:#475569;font-size:14px">
      Your interview for <strong>{job_role}</strong> has been 
      completed. Here are your results:
    </p>
    <div class="score-box">
      <p style="color:#64748b;font-size:13px;margin:0 0 8px">Your Score</p>
      <div class="score">{score:.0f}</div>
      <p style="color:#94a3b8;font-size:13px;margin:8px 0 0">out of 100</p>
    </div>
    <div class="rec-box">
      <div style="font-size:32px">{cfg["emoji"]}</div>
      <div class="rec-text">{recommendation.upper()}</div>
      <p style="color:#475569;font-size:13px;margin:8px 0 0">
        {cfg["text"]}
      </p>
    </div>
    <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:20px 0">
      <p style="color:#166534;font-size:13px;margin:0">
        <strong>What happens next?</strong><br>
        Our HR team will review your performance and contact 
        you within <strong>48 hours</strong>.
      </p>
    </div>
    <p style="color:#475569;font-size:14px">
      Best regards,<br>
      <strong>PratibhaAI Team</strong>
    </p>
  </div>
  <div class="footer">
    <p>© {datetime.now().year} PratibhaAI. All rights reserved.</p>
  </div>
</div>
</body>
</html>
"""

    try:
        response = _send_email(
            to_email=to_email,
            subject=f"Interview Result — {job_role} | PratibhaAI",
            html=html,
        )
        return response
    except Exception as e:
        print(f"Resend result email failed: {e}")
        raise


def send_subscription_success_email(
    to_email: str,
    name: str,
    amount: str,
    txn_id: str,
    plan_name: str,
    invoice_pdf_path: str
):
    if not resend.api_key and not (settings.smtp_host and settings.smtp_user and settings.smtp_pass):
        print("RESEND_API_KEY / SMTP not configured — Demo mode")
        print(f"Subscription success email to: {to_email} | Invoice attached: {invoice_pdf_path}")
        return

    pdf_bytes = None
    try:
        with open(invoice_pdf_path, "rb") as f:
            pdf_bytes = f.read()
    except Exception as e:
        print(f"Failed to read invoice pdf for email: {e}")

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to PratibhaAI Premium</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f5f7; padding: 20px; margin: 0;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <tr>
          <td align="center" style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 40px 20px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Welcome to Premium!</h1>
            <p style="color: #e6f4ea; margin: 5px 0 0 0;">Your PratibhaAI Growth plan is now active</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px 40px; color: #333333;">
            <p>Hi <strong>{name}</strong>,</p>
            <p>Thank you for upgrading to the <strong>PratibhaAI Growth Plan</strong>! Your payment has been successfully received, and your account has been upgraded.</p>
            
            <table width="100%" style="border-collapse: collapse; margin: 20px 0;">
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 0; color: #64748b; font-weight: bold;">Plan Name</td>
                <td style="padding: 10px 0; text-align: right; font-weight: bold;">Growth Plan (Monthly)</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 0; color: #64748b;">Amount Paid</td>
                <td style="padding: 10px 0; text-align: right; font-weight: bold;">₹{amount}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 0; color: #64748b;">Transaction ID</td>
                <td style="padding: 10px 0; text-align: right; font-family: monospace;">{txn_id}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 0; color: #64748b;">Status</td>
                <td style="padding: 10px 0; text-align: right; color: #16a34a; font-weight: bold;">Paid / Success</td>
              </tr>
            </table>

            <p>We have attached the official PDF receipt/invoice to this email for your records.</p>
            <p>With the Growth plan, you now have access to:</p>
            <ul>
              <li>100 interviews per month</li>
              <li>Realtime Emotion AI & confidence analysis</li>
              <li>Detailed PDF scoring reports and custom job roles setup</li>
              <li>Full candidate video recording logs</li>
            </ul>
            <p style="margin-top: 30px;">If you have any questions or need support, please contact us at <a href="mailto:support@pratibhaai.com">support@pratibhaai.com</a>.</p>
            <p>Best regards,<br/><strong>PratibhaAI Team</strong></p>
          </td>
        </tr>
        <tr>
          <td align="center" style="background-color: #f8fafc; padding: 20px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
            © {datetime.now().year} PratibhaAI — Made in India 🇮🇳
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    _send_email(
        to_email=to_email,
        subject="Payment Successful — PratibhaAI Premium Receipt",
        html=html,
        attachment_bytes=pdf_bytes,
        filename="receipt.pdf",
    )


def send_subscription_cancelled_email(
    to_email: str,
    name: str
):
    if not resend.api_key:
        print("RESEND_API_KEY not set — Demo mode")
        print(f"Subscription cancelled email to: {to_email}")
        return

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Subscription Cancelled — PratibhaAI</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f5f7; padding: 20px; margin: 0;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <tr>
          <td align="center" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Subscription Cancelled</h1>
            <p style="color: #fee2e2; margin: 5px 0 0 0;">Your premium features are now downgraded</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px 40px; color: #333333;">
            <p>Hi <strong>{name}</strong>,</p>
            <p>This is to confirm that your <strong>PratibhaAI Growth Plan</strong> subscription has been cancelled, and your account has been downgraded to the <strong>Starter (Free)</strong> plan.</p>
            
            <p>You can still upgrade back to premium at any time if you need additional interview capacity, emotion AI analysis, or customized job setup.</p>
            
            <p style="margin-top: 30px;">If this was a mistake or you have any concerns, please reply to this email or reach out to us at <a href="mailto:support@pratibhaai.com">support@pratibhaai.com</a>.</p>
            
            <p>Best regards,<br/><strong>PratibhaAI Team</strong></p>
          </td>
        </tr>
        <tr>
          <td align="center" style="background-color: #f8fafc; padding: 20px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
            © {datetime.now().year} PratibhaAI — Made in India 🇮🇳
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    _send_email(
        to_email=to_email,
        subject="Subscription Cancelled — PratibhaAI",
        html=html,
    )

