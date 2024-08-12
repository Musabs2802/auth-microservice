const express = require('express')
const authenticate = require('../middlewares/authenticate.middleware')
const authorize = require('../middlewares/authorize.middleware')

const router = express.Router()

router.get('/', authenticate, authorize(['moderator', 'admin']), async (req, res) => {
    return res.status(200).json({ message: "Admin / Moderator Authorized Endpoints" })
})

module.exports = router