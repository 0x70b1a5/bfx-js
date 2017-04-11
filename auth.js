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
    const url = 'https://api.bitfinex.com/v1'
    const body = new Buffer(JSON.stringify(payload))
      .toString('base64')

    const signature = crypto
      .createHmac('sha384', apiSecret)
      .update(body)
      .digest('hex')

    const headers = {
      'X-BFX-APIKEY': apiKey,
      'X-BFX-PAYLOAD': body,
      'X-BFX-SIGNATURE': signature
    }

    const options = {
      url: `${url}/${endpoint}`,
      headers,
      body
    }

    request.post(options, (error, response, body) => callback(error, response, body))
  }
}

module.exports = Auth;
