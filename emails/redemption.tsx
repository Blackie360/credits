import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text
} from '@react-email/components'

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

interface RedemptionEmailProps {
  name?: string
  code: string
  redemptionUrl: string
}

export const RedemptionEmail = ({
  name,
  code,
  redemptionUrl
}: RedemptionEmailProps) => {
  const greeting = name ? `Hi ${name},` : 'Hi,'

  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-[#0d0d0d] font-sans">
          <Preview>You&apos;ve redeemed your Cursor Pro credit. Click here to claim it.</Preview>
          <Container className="mx-auto my-0 px-6 py-12 max-w-[600px]">
            <Img
              src={`${baseUrl}/CUBE_2D_DARK.png`}
              width={48}
              height={48}
              alt="Cursor Kenya"
              className="mb-6"
            />
            <Heading className="text-2xl font-bold text-white mt-0 mb-6">
              Cursor Pro Credit Redeemed
            </Heading>
            <Section className="my-6 mx-0">
              <Text className="text-base leading-6 text-[#a3a3a3]">
                {greeting}
              </Text>
              <Text className="text-base leading-6 text-[#a3a3a3]">
                You&apos;ve successfully redeemed your Cursor Pro referral credit.
              </Text>
              <Text className="text-base leading-6 text-[#a3a3a3]">
                Your referral code: <strong className="text-white font-mono">{code}</strong>
              </Text>
              <Section className="my-8 text-center">
                <Button
                  href={redemptionUrl}
                  className="bg-[#0052CC] text-white px-6 py-3 rounded-lg font-semibold"
                >
                  Claim your Cursor Pro credit
                </Button>
              </Section>
              <Text className="text-base leading-6 text-[#a3a3a3]">
                Or copy and paste this link:{' '}
                <Link href={redemptionUrl} className="text-[#0052CC] underline">
                  {redemptionUrl}
                </Link>
              </Text>
            </Section>
            <Text className="text-base leading-6 text-[#a3a3a3]">
              Best,
              <br />
              Cursor Kenya
            </Text>
            <Hr className="border-[#262626] mt-12" />
            <Text className="text-[#525252] text-xs leading-6 mt-4">
              Cursor Kenya
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

RedemptionEmail.PreviewProps = {
  name: 'Guest',
  code: 'ZCS5PIUVIIPX',
  redemptionUrl: 'https://cursor.com/referral?code=ZCS5PIUVIIPX'
} as RedemptionEmailProps

export default RedemptionEmail
