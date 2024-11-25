const express = require("express");
const {
    Login, Logout, Register
} = require ("../controllers/Users.js");
const { refreshToken } = require ("../controllers/RefreshToken.js");

const router = express.Router();

router.post('/login', Login);
router.post('/register', Register);
router.get('/token', refreshToken);
router.delete('/logout', Logout);
 
module.exports = router;