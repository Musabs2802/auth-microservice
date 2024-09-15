const express = require('express')
const bcrypt = require('bcrypt')
const datastore = require('nedb-promises')

const router = express.Router()

const users = datastore.create('./src/databases/Users.db')
const userRefreshTokens = datastore.create('./src/databases/UserRefreshTokens.db')

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body

        if (!name || !email || !password) {
            return res.status(422).json({message: "Field(s) missing"})
        }

        if (await users.findOne({ email })) {
            return res.status(409).json({message: 'Email Duplicated'})
        }

        const hash = await bcrypt.hash(password, 10)

        const user = await users.insert({
            name, 
            email, 
            password: hash,
            role: role ?? 'member',
            '2faEnable': false,
            '2fsSecret': null 
        })

        return res.status(201).json({message: 'Item created', _id: user._id})
    }
    catch (error) {
        return res.status(500).json({message: error.message})
    }

})

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(422).json({message: "Field(s) missing"})
        }

        const user = await users.findOne({ email })
        if (user) {
            const isPasswordMatch = await bcrypt.compare(password, user.password)
            if (isPasswordMatch) {
                return res.status(200).json(user)
            }
            else {
                return res.status(401).json({ message: "Unauthorized" })
            }
        }
        else {
            return res.status(401).json({ message: "Unauthorized" })
        }
    }
    catch (error) {
        return res.status(500).json({ message: error.message })
    }
})

router.get('/id/:id', async (req, res) => {
    try {
        const { id } = req.params

        const user = await users.findOne({ _id: id })
        if (user) {
            return (200).json(user)
        }
        else {
            return res.status(401).json({ message: "Unauthorized" })
        }
    }
    catch (error) {
        return res.status(500).json({ message: error.message })
    }
})

router.post('/2fa/generate', async (req, res) => {
    try {
        const { userId, secret } = req.params

        await users.update({ _id: userId }, { $set: { '2faSecret': secret }})
        await users.compactDatafile()
    }
    catch (error) {
        return res.status(500).json({ message: error.message })
    }
})

router.post('/2fa/validate', async (req, res) => {
    try {
        const { userId } = req.params

        await users.update({ _id: userId }, { $set: { '2faEnables': true }})
        await users.compactDatafile()
    }
    catch (error) {
        return res.status(500).json({ message: error.message })
    }
})

router.post('/logout', async (req, res) => {
    try {
        const { userId } = req.params

        await userRefreshTokens.removeMany({ userId })
        await userRefreshTokens.compactDatafile()
        res.status(200).send()
    }
    catch (error) {
        return res.status(500).json({ message: error.message })
    }
})

module.exports = router