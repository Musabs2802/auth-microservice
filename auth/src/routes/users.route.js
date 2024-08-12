const express = require('express')
const axios = require('axios')
const authenticate = require('../middlewares/authenticate.middleware')

const router = express.Router()

router.get('/user', authenticate, async (req, res) => {
    try {
        const dbUser = await axios.get(`${process.env.DB_BASE_URL}/api/users/${req.user.id}`)

        if (dbUser.status == 200) {
            return res.status(200).json(dbUser.data)
        }
        else {
            return res.status(dbUser.status).json({message: dbUser.data.message})
        }
    }
    catch (error) {
        return res.status(500).json({message: error})
    }
})

module.exports = router