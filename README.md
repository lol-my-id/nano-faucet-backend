<p align="center">
  <img src="https://github.com/lol-my-id/nano-faucet/blob/main/public/images/logo.png" width="200" alt="nano.lol.my.id">
</p>

# [nano.lol.my.id](https://nano.lol.my.id) backend
This is the backend of nano.lol.my.id, a NANO/BAN/XDG faucet. It is written in Express with @decorators/express and uses MongoDB as a database.
<br /><br />
The frontend can be found [here](https://github.com/lol-my-id/nano-faucet)
<br /><br />
It is a pretty bold move to open-source a backend (it's over for me if anyone finds a vulnerability), but I believe that the community can benefit from it. If you want to support me, you can donate to the faucet or to my NANO address: `nano_1iykwbzepxjqizaicq4mqsgs3bqsagwnr91dqtx63phudbo8mwqewyokk9ek`

## Technologies
| Name | Description |
| ---- | ----------- |
| [Node.js](https://nodejs.org) | JavaScript runtime |
| [TypeScript](https://typescriptlang.org) | JavaScript superset |
| [Express](https://expressjs.com) | Web framework |
| [@decorators/express](https://www.npmjs.com/package/@decorators/express) | Express decorators |
| [MongoDB](https://mongodb.com) | NoSQL database |
| [Mongoose](https://mongoosejs.com) | MongoDB object modeling |
| [hCaptcha](https://hcaptcha.com) | CAPTCHA service |

## Supported cryptocurrencies
- [Nano](https://nano.org)
- [Banano](https://banano.cc)
- [DogeNano](https://dogenano.io)

## Features
### Faucet
- Claim NANO, BAN, or XDG every 45 minutes
- Anti-bot protection (hCaptcha)

### Referral system
- Invite friends to earn 20% of their claims
- Referral link with unique code
- Referral statistics
- Payouts to referrers

## Installation
1. Clone the repository
2. Install dependencies
```bash
npm install
```
3. Rename .env.example to .env and fill in the required values
4. Start the server
as dev:
```bash
npm run dev
```

as prod:
```bash
npm run build
npm start
```

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.