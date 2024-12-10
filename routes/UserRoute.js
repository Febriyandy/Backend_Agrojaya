const express = require("express");
const {
    Login, Logout, Register, UpdateUser, getUserById, UpdateToken
} = require ("../controllers/Users.js");
const { refreshToken } = require ("../controllers/RefreshToken.js");

const router = express.Router();

router.post('/login', Login);
router.post('/register', Register);
router.get('/token', refreshToken);
router.delete('/logout', Logout);
router.put('/users/:id', UpdateUser);
router.put('/users/token/:id', UpdateToken);
router.get('/users/:id', getUserById);
 
module.exports = router;