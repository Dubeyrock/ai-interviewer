import requests
import smtplib
from email.message import EmailMessage
from typing import Optional
from app.core.config import settings


def _render_invite_html(
    job_title: str,
    job_description: Optional[str],
    required_skills: Optional[list],
    invite_link: str,
    job_id: Optional[str] = None,
    hr_name: Optional[str] = None,
) -> str:
    skills_section = ""
    if required_skills:
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

    job_id_section = f"""
        <tr>
          <td style="padding: 10px 0; color: #4b5563; font-size: 14px;">
            <strong>Job ID:</strong> <span style="color: #6b7280; font-size: 14px;">{job_id}</span>
          </td>
        </tr>
    """ if job_id else ""

    hr_section = f"""
        <tr>
          <td style="padding: 10px 0; color: #4b5563; font-size: 14px;">
            <strong>HR Contact:</strong> <span style="color: #6b7280; font-size: 14px;">{hr_name}</span>
          </td>
        </tr>
    """ if hr_name else ""

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Interview Invite</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px; background-color: #f3f4f6;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <tr>
                <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px 40px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">Interview Invite</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px 40px;">
                  <p style="margin: 0 0 16px 0; color: #111827; font-size: 16px; line-height: 1.6;">Hello,</p>
                  <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                    You have been invited to apply for the position of <strong>{job_title}</strong>.
                  </p>

                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 10px 0;">
                    <tr>
                      <td style="padding: 10px 0; color: #4b5563; font-size: 14px;">
                        <strong>Role:</strong> <span style="color: #6b7280; font-size: 14px;">{job_title}</span>
                      </td>
                    </tr>
                    {job_id_section}
                    {hr_section}
                    <tr>
                      <td style="padding: 10px 0; color: #4b5563; font-size: 14px;">
                        <strong>Register / Apply:</strong> <a href="{invite_link}" style="color: #2563eb; text-decoration: none; font-size: 14px; font-weight: 500;">{invite_link}</a>
                      </td>
                    </tr>
                    {job_desc_section}
                    {skills_section}
                  </table>

                  <p style="margin: 20px 0 8px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                    Please register using the link above to start the interview process.
                  </p>
                  <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                    Best of luck!
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


def send_job_invite(
    to_email: str,
    job_title: str,
    job_description: Optional[str],
    required_skills: Optional[list],
    invite_link: str,
    job_id: Optional[str] = None,
    hr_name: Optional[str] = None,
):
    subject = f"Job Invite — {job_title}"
    body = _render_invite_html(
        job_title=job_title,
        job_description=job_description,
        required_skills=required_skills,
        invite_link=invite_link,
        job_id=job_id,
        hr_name=hr_name,
    )

    msg = EmailMessage()
    from_address = settings.smtp_user or "no-reply@example.com"
    msg["From"] = from_address
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.add_alternative(body, subtype="html")

    # Try SendGrid first
    if settings.sendgrid_api_key:
        try:
            response = requests.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={
                    "Authorization": f"Bearer {settings.sendgrid_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "personalizations": [{"to": [{"email": to_email}]}],
                    "from": {"email": from_address},
                    "subject": subject,
                    "content": [{"type": "text/html", "value": body}],
                },
                timeout=10,
            )
            response.raise_for_status()
            return
        except Exception as e:
            print(f"[Invite Service] SendGrid failed: {e}")

    # Fallback to SMTP
    smtp_host = settings.smtp_host or "localhost"
    smtp_port = settings.smtp_port or 25
    try:
        if getattr(settings, "smtp_use_ssl", False) or smtp_port == 465:
            smtp = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30)
        else:
            smtp = smtplib.SMTP(smtp_host, smtp_port, timeout=30)
            if settings.smtp_starttls:
                smtp.starttls()
        if settings.smtp_user and settings.smtp_pass:
            smtp.login(settings.smtp_user, settings.smtp_pass)
        smtp.send_message(msg)
        smtp.quit()
    except Exception as e:
        print(f"[Invite Service] Failed to send invite via SMTP: {e}")
        print("[Invite Service] Email content:\n", msg)
