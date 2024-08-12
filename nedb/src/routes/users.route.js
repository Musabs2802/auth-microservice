const express = require('express')
const datastore = require('nedb-promises')

const router = express.Router()

const users = datastore.create('./src/databases/Users.db')

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params

        const user = await users.findOne({ _id: id })
        if (user) {
            return res.status(200).json({
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            })
        }
        else {
            return res.status(404).json({ message: "Item not found" })
        }
    }
    catch (error) {
        return res.status(500).json({ message: error.message })
    }
})

module.exports = router