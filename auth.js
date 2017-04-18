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

  rest(endpoint, payload, callback) {
    const url = `v2/${endpoint}`
    const nonce = (Date.now()*1000).toString()
    const rawBody = JSON.stringify(payload)

    let signature = `/api/${url}${nonce}${rawBody}`
    signature = crypto
      .createHmac('sha384', apiSecret)
      .update(signature)
      .digest('hex')

    const options = {
      url: `https://api.bitfinex.com/${url}`,
      headers: {
        'bfx-nonce': nonce,
        'bfx-apikey': apiKey,
        'bfx-signature': signature
      },
      json: payload
    }

    request.post(options, (error, response, body) => callback(error, response, body))
  }
}

module.exports = Auth;
