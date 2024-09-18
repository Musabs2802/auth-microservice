const express = require('express')
const authenticate = require('../middlewares/authenticate.middleware')
const { authRegister, authLogin, authLogin2fa, authRefreshLogin, auth2faGenerate, authValidate2fa, authLogout } = require('../controllers/auth.controller')

const router = express.Router()

router.post('/register', authRegister)

router.post('/login', authLogin)

router.post('/login/2fa', authLogin2fa)

router.post('/refreshLogin', authRefreshLogin)

router.get('/2fa/generate', authenticate, auth2faGenerate)

router.post('/2fa/validate', authenticate, authValidate2fa)

router.post('/logout', authenticate, authLogout)

module.exports = router