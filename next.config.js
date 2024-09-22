/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: false,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '**'
      }
    ]
  },
  // edit: updated to new key. Was previously `allowedForwardedHosts`
  experimental: { serverActions: { allowedOrigins: [ "localhost:3000", "https://opulent-space-lamp-jgxx447649xcp7j7.github.dev", ], }, }
  // allowedOrigins: ["localhost:3000", 'https://opulent-space-lamp-jgxx447649xcp7j7.github.dev']

}
