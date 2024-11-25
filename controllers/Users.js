const db = require('../config/Database'); 
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


exports.Register = async (req, res) => {
    const { uid, username, email } = req.body;

    try {
        // Periksa apakah UID sudah ada di database
        const [existingUser] = await db.promise().query(`
            SELECT id FROM users WHERE id = ?`, [uid]);

        if (existingUser.length > 0) {
            // Jika UID sudah ada, kembalikan respon berhasil tanpa menambah data baru
            return res.status(200).json({ msg: "UID sudah terdaftar, tidak ada perubahan" });
        }

        // Jika UID belum ada, masukkan data baru
        await db.promise().query(`
            INSERT INTO users (id, username, email)
            VALUES (?, ?, ?)`, [uid, username, email]);

        res.status(201).json({ msg: "Register Berhasil" });
    } catch (error) {
        console.error("Error in Register:", error);
        res.status(400).json({ msg: "Gagal melakukan registrasi", error: error.message });
    }
};


// Login
exports.Login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Cek apakah user dengan email tertentu ada
        const [user] = await db.promise().query(`
            SELECT id, username, email, password FROM users WHERE email = ?`, [email]);

        if (user.length === 0) {
            return res.status(400).json({ msg: "Email tidak ditemukan, silahkan daftar" });
        }

        const match = await bcrypt.compare(password, user[0].password);
        if (!match) {
            return res.status(400).json({ msg: "Password Salah, harap coba lagi" });
        }

        const { id: userId, username, email: userEmail } = user[0];
        const accessToken = jwt.sign(
            { userId, username, userEmail },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '20s' }
        );

        const refreshToken = jwt.sign(
            { userId, username, userEmail },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '1d' }
        );

        // Update refresh token di database
        await db.promise().query(`
            UPDATE users SET refresh_token = ? WHERE id = ?`, [refreshToken, userId]);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 1 hari
        });

        // Return the access token and user details in the response
        res.json({
            accessToken,
            user: {
                id: userId,
                name: username,  // using 'username' as the 'name'
                email: userEmail,
            }
        });
    } catch (error) {
        console.error("Error in login:", error);
        res.status(500).json({ msg: "Internal Server Error" });
    }
};


exports.Logout = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.sendStatus(204);

    try {
        // Query untuk mencari user berdasarkan refresh token
        const [rows] = await db.promise().query(`
            SELECT id
            FROM users
            WHERE refresh_token = ?`, [refreshToken]);

        const user = rows[0];
        if (!user) return res.sendStatus(204);

        const userId = user.id;

        // Hapus refresh token dari database
        await db.promise().query(`
            UPDATE users
            SET refresh_token = NULL
            WHERE id = ?`, [userId]);

        res.clearCookie('refreshToken');
        return res.sendStatus(200);
    } catch (error) {
        console.error("Error in logout:", error);
        res.status(500).json({ msg: "Internal Server Error" });
    }
};
