const express = require('express')
const datastore = require('nedb-promises')

const router = express.Router()

const userRefreshTokens = datastore.create('./src/databases/UserRefreshTokens.db')

router.post('/', async (req, res) => {
    try {
        const { userId, refreshToken } = req.body

        if (refreshToken) {
            await userRefreshTokens.insert({ refreshToken, userId })
            return res.status(200).send()
        }
        else {
            return res.status(422).json({message: "Field(s) missing"})
        }
    }
    catch(error) {
        return res.status(500).json({message: error.message})
    }
})

router.get('/:refreshToken/:userId', async (req, res) => {
    try {
        const { refreshToken, userId } = req.params

        const dbUserRefreshToken = await userRefreshTokens.findOne({ refreshToken, userId })
        if (dbUserRefreshToken) {
            return res.status(200).json(dbUserRefreshToken.data)
        }
        else {
            return res.status(404).json({ message: "Item not found" })
        }
    }
    catch (error) {
        return res.status(500).json({ message: error.message })
    }
})

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params

        await userRefreshTokens.remove({ _id: id })
        await userRefreshTokens.compactDatafile()
        return res.status(200).send()
    }
    catch (error) {
        return res.status(500).json({ message: error.message })
    }
})

module.exports = router