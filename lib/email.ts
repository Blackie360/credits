import { render } from '@react-email/components'
import nodemailer from 'nodemailer'
import { createElement } from 'react'
import { RedemptionEmail } from '@/emails/redemption'

let transport: nodemailer.Transporter | null = null

function getRequiredEnv (key: string): string {
  const value = process.env[key]?.trim()
  if (!value) {
    throw new Error(`${key} environment variable is not set`)
  }
  return value
}

function getTransport () {
  if (transport) return transport

  const host = getRequiredEnv('SMTP_HOST')
  const user = getRequiredEnv('SMTP_USER')
  const pass = getRequiredEnv('SMTP_PASSWORD')
  const secure = process.env.SMTP_SECURE === 'true'

  transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure,
    auth: { user, pass },
    pool: false,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000
  })

  return transport
}

export async function verifySmtpConnection (): Promise<boolean> {
  return getTransport().verify()
}

export async function sendRedemptionEmail (
  to: string,
  name: string | null,
  code: string,
  url: string
): Promise<void> {
  const emailElement = createElement(RedemptionEmail, {
    name: name ?? undefined,
    code,
    redemptionUrl: url
  })

  const [html, text] = await Promise.all([
    render(emailElement),
    render(emailElement, { plainText: true })
  ])

  const from = getRequiredEnv('EMAIL_FROM')
  await getTransport().sendMail({
    from,
    to,
    subject: 'Claim Your Cursor Pro Credit',
    html,
    text
  })
}
