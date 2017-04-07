const crypto = require('crypto')
const cryptojs = require('crypto-js')
const request = require('request')
const apiKey = process.env.BFX_API_KEY
const apiSecret = process.env.BFX_API_SECRET

class Auth {
  constructor() {}

  get ws() {
    const authNonce = Date.now() * 1000
    const authPayload = 'AUTH' + authNonce
    const authSig = cryptojs
    .HmacSHA384(authPayload, apiSecret)
    .toString(cryptojs.enc.Hex)

    return {
      apiKey,
      authSig,
      authNonce,
      authPayload,
      event: 'auth',
      filter: [
        'trading',
        'balance'
      ]
    }
  }

  get rest() {
    const url = 'v2/auth/alerts'
    const nonce = Date.now().toString()
    const body = {}
    const rawBody = JSON.stringify(body)

    let signature = `/api/${url}${nonce}${rawBody}`
    signature = crypto
      .createHmac('sha384', apiSecret)
      .update(signature)
      .digest('hex')

    return {
      url: `https://api.bitfinex.com/${url}?type=price`,
      headers: {
        'bfx-nonce': nonce,
        'bfx-apikey': apiKey,
        'bfx-signature': signature
      },
      json: body
    }
  }
}

module.exports = Auth;
