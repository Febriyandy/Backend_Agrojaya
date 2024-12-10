const db = require('../config/Database'); 
const jwt = require('jsonwebtoken');

exports.refreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        // Jika tidak ada refresh token, kembalikan status 401
        if (!refreshToken) return res.sendStatus(401);

        // Cek apakah refresh token ada di database
        const [users] = await db.promise().query(`
            SELECT id, username, email FROM users WHERE refresh_token = ?`, [refreshToken]);

        if (users.length === 0) return res.sendStatus(403); // Jika tidak ditemukan, kembalikan status 403

        const user = users[0];

        // Verifikasi refresh token
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
            if (err) return res.sendStatus(403);

            const { id: userId, username, email } = user;

            // Buat access token baru
            const accessToken = jwt.sign(
                { userId, username, email },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '15s' }
            );

            res.json({ accessToken });
        });
    } catch (error) {
        console.error("Error in refreshToken:", error);
        res.sendStatus(500);
    }
};
