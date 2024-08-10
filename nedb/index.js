const express = require('express')
const datastore = require('nedb-promises')
const bcrypt = require('bcrypt')

const app = express()

// Configure body parser
app.use(express.json())

const users = datastore.create('./databases/Users.db')

app.get('/', (req, res) => {
    res.status(200).json({message: "Datastore (nedb) Microservice"})
})

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body

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
            password: hash
        })

        return res.status(201).json({message: 'Item created', _id: user._id})
    }
    catch (error) {
        return res.status(500).json({message: error.message})
    }

})

app.post('/api/auth/login', async (req, res) => {
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

app.listen(3001, () => console.log("Microservice (nedb) started on port 3001"))