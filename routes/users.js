const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const admin = require('firebase-admin');

const signInWithEmailAndPassword = require('firebase/auth');
// Initialize Firebase Admin SDK (ensure you've initialized it in your main app.js file)
// const admin = require('firebase-admin');

router.get('/', async (req, res) => {
    try {
        // Retrieve user list from Firebase Authentication
        const userList = await admin.auth().listUsers();
        const users = userList.users.map((userRecord) => {
            const user = userRecord.toJSON();
            // Omit sensitive information like passwordHash
            return {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                // Add more user properties as needed
            };
        });

        res.status(200).json(users);
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const userRecord = await admin.auth().getUser(req.params.id);
        const user = userRecord.toJSON();
        // Omit sensitive information like passwordHash
        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            // Add more user properties as needed
        };

        res.status(200).json(userData);
    } catch (error) {
        console.error('Error getting user by ID:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/register', async (req, res) => {
    console.log('Request Body:', req.body); // Log the request body
    try {
        const { email, password, phone, isAdmin, street, apartment, zip, city, country, displayName } = req.body;

        // Create user with email and password
        const userRecord = await admin.auth().createUser({
            email,
            password : bcrypt.hashSync(password, 10),
            displayName,
            phoneNumber: phone,
            disabled: false,
        });

        // Generate JWT token
        const secret = process.env.secret;
        const token = jwt.sign({
            userID: userRecord.uid,
            isAdmin: false,  // Adjust based on your user roles
        }, secret, { expiresIn: '1d' });

        res.status(200).send({ user: userRecord.email, token });
    }
    catch (error) {
        console.error('Error registering new user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
);
router.delete('/:id', async (req, res) => {
    try {
        await admin.auth().deleteUser(req.params.id);
        res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const userRecord = await admin.auth().getUserByEmail(email).catch((error) => {
            console.log(error);
        });
        const user = userRecord.toJSON();
        const passwordIsValid = bcrypt.compareSync(password, user.passwordHash);
        if (!passwordIsValid) {
            return res.status(401).send({ success: false, message: 'Invalid email/password' });
        }
        const secret = process.env.secret;
        const token = jwt.sign({
            userID: user.uid,
            isAdmin: false,  // Adjust based on your user roles
        }, secret, { expiresIn: '1d' });
        res.status(200).send({ user: user.email, token });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
);

router.get('/get/count', async (req, res) => {
    try {
        const userCount = await admin.auth().getUserCount();
        res.status(200).json({ userCount });
    }
    catch (error) {
        console.error('Error getting user count:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
