from __future__ import annotations

import base64
from pathlib import Path
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm

def generate_invoice_pdf(
    output_path: str,
    user_name: str,
    user_email: str,
    amount: str,
    txn_id: str,
    plan_name: str
) -> str:
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    
    c = canvas.Canvas(str(path), pagesize=A4)
    width, height = A4
    
    # Draw Green header strip
    c.setFillColor(colors.HexColor("#064e3b"))  # Deep green
    c.rect(0, height - 28 * mm, width, 28 * mm, fill=1, stroke=0)
    
    # Header Text
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(18 * mm, height - 16 * mm, "PratibhaAI")
    
    c.setFont("Helvetica", 10)
    c.drawRightString(width - 18 * mm, height - 12 * mm, "INVOICE / RECEIPT")
    c.drawRightString(width - 18 * mm, height - 18 * mm, f"Date: {datetime.now().strftime('%d %B %Y')}")
    
    # Body Text
    c.setFillColor(colors.HexColor("#1e293b"))  # Slate 800
    
    # Invoice details
    c.setFont("Helvetica-Bold", 12)
    c.drawString(18 * mm, height - 42 * mm, "Payment Details")
    
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#475569"))  # Slate 600
    c.drawString(18 * mm, height - 52 * mm, "Transaction ID:")
    c.drawString(18 * mm, height - 58 * mm, "Plan:")
    c.drawString(18 * mm, height - 64 * mm, "Amount:")
    c.drawString(18 * mm, height - 70 * mm, "Status:")
    
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#0f172a"))  # Slate 900
    c.drawString(50 * mm, height - 52 * mm, txn_id)
    c.drawString(50 * mm, height - 58 * mm, plan_name.capitalize())
    c.drawString(50 * mm, height - 64 * mm, f"INR {amount}")
    
    c.setFillColor(colors.HexColor("#16a34a"))  # Green-600 for SUCCESS
    c.setFont("Helvetica-Bold", 9)
    c.drawString(50 * mm, height - 70 * mm, "PAID / SUCCESS")
    
    # Billed To
    c.setFillColor(colors.HexColor("#1e293b"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(18 * mm, height - 85 * mm, "Billed To")
    
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawString(18 * mm, height - 95 * mm, "Customer Name:")
    c.drawString(18 * mm, height - 101 * mm, "Customer Email:")
    
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawString(50 * mm, height - 95 * mm, user_name)
    c.drawString(50 * mm, height - 101 * mm, user_email)
    
    # Pricing Table Header
    c.setStrokeColor(colors.HexColor("#cbd5e1"))
    c.setLineWidth(0.5)
    c.line(18 * mm, height - 112 * mm, width - 18 * mm, height - 112 * mm)
    
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawString(20 * mm, height - 118 * mm, "Description")
    c.drawRightString(width - 20 * mm, height - 118 * mm, "Amount (INR)")
    
    c.line(18 * mm, height - 122 * mm, width - 18 * mm, height - 122 * mm)
    
    # Pricing Table Item
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawString(20 * mm, height - 130 * mm, f"PratibhaAI {plan_name.capitalize()} Plan - 30 Days Subscription")
    c.drawRightString(width - 20 * mm, height - 130 * mm, f"{amount}")
    
    c.line(18 * mm, height - 136 * mm, width - 18 * mm, height - 136 * mm)
    
    # Total
    c.setFont("Helvetica-Bold", 10)
    c.drawString(20 * mm, height - 144 * mm, "Total Paid")
    c.drawRightString(width - 20 * mm, height - 144 * mm, f"₹{amount}")
    
    c.line(18 * mm, height - 148 * mm, width - 18 * mm, height - 148 * mm)
    
    # Subtext / Terms
    c.setFont("Helvetica-Oblique", 8)
    c.setFillColor(colors.HexColor("#64748b"))
    c.drawString(18 * mm, height - 160 * mm, "Note: This is a system-generated electronic receipt and does not require a physical signature.")
    c.drawString(18 * mm, height - 165 * mm, "The subscription features have been instantly activated on your dashboard.")
    
    # Footer
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.drawCentredString(width / 2, 15 * mm, "Thank you for choosing PratibhaAI — Hire Smarter, Interview Faster!")
    c.drawCentredString(width / 2, 10 * mm, "Support: support@pratibhaai.com | Web: www.pratibhaai.com")
    
    c.save()
    return str(path)
