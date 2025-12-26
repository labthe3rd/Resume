import { NextResponse } from 'next/server'

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'Labthe3rd@gmail.com'

export async function POST(request) {
  try {
    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    const { name, email, phone, message } = await request.json()

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Format the email body
    const emailBody = `
New Contact Form Submission
============================

Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}

Message:
${message}

============================
Sent from Louis Bersine Portfolio Website
    `.trim()

    // Send email via Mailgun API
    const formData = new FormData()
    formData.append('from', `Portfolio Contact Form <mailgun@${MAILGUN_DOMAIN}>`)
    formData.append('to', CONTACT_EMAIL)
    formData.append('subject', `Portfolio Contact: ${name}`)
    formData.append('text', emailBody)
    formData.append('h:Reply-To', email)

    const response = await fetch(
      `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')}`
        },
        body: formData
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Mailgun error:', errorText)
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Email sent successfully' })

  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to process contact form' },
      { status: 500 }
    )
  }
}
