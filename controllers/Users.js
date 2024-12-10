const db = require('../config/Database'); 
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

exports.Register = async (req, res) => {
    const { uid, username, email, fcmToken } = req.body;

    try {
        // Periksa apakah UID sudah ada di database
        const [existingUser] = await db.promise().query(
            'SELECT id FROM users WHERE id = ?',
            [uid]
        );

        if (existingUser.length > 0) {
            return res.status(200).json({
                msg: "UID sudah terdaftar, tidak ada perubahan"
            });
        }

        // Jika UID belum ada, masukkan data baru ke database
        await db.promise().query(
            'INSERT INTO users (id, username, email, fcmToken) VALUES (?, ?, ?, ?)',
            [uid, username, email, fcmToken]
        );

    
        // Kirim notifikasi selamat datang jika ada fcmToken
        if (fcmToken) {
            try {
                const message = {
                    token: fcmToken,
                    notification: {
                        title: "Selamat Datang di Agrojaya",
                        body: "Selamat datang di Agrojaya, mulai pertanian yang menarik bersama kami",
                    },
                };

                // Kirim notifikasi menggunakan Firebase Admin SDK
                await admin.messaging().send(message);

                // Simpan notifikasi di Firebase Realtime Database
                const waktu = Date.now(); // Waktu pengiriman dalam format milidetik
                const notificationRef = admin.database().ref(`notifications/${uid}`);
                await notificationRef.push({
                    title: "Selamat Datang di Agrojaya",
                    body: "Selamat datang di Agrojaya, mulai pertanian yang menarik bersama kami",
                    waktu,
                });

                console.log('Notifikasi selamat datang berhasil dikirim dan disimpan');
            } catch (notifError) {
                console.error('Gagal mengirim notifikasi selamat datang:', notifError);
                // Tidak menghentikan proses registrasi jika notifikasi gagal
            }
        }

        res.status(201).json({
            msg: "Register Berhasil",
            details: {
                userId: uid,
                notificationSent: fcmToken ? true : false,
            },
        });
    } catch (error) {
        console.error("Error in Register:", error);
        res.status(400).json({
            msg: "Gagal melakukan registrasi",
            error: error.message,
        });
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

exports.UpdateUser = async (req, res) => {
    const { id } = req.params; 
    const { username, phoneNumber } = req.body; 

    try {
        const [user] = await db.promise().query(`
            SELECT id FROM users WHERE id = ?`, [id]);

        if (user.length === 0) {
            return res.status(404).json({ msg: "Pengguna tidak ditemukan" });
        }

      
        await db.promise().query(`
            UPDATE users
            SET username = ?, phoneNumber = ?
            WHERE id = ?`, [username, phoneNumber, id]);

        res.status(200).json({ msg: "Data pengguna berhasil diperbarui" });
    } catch (error) {
        console.error("Error in UpdateUser:", error);
        res.status(500).json({ msg: "Gagal memperbarui data pengguna", error: error.message });
    }
};

exports.UpdateToken = async (req, res) => {
    const { id } = req.params; 
    const { fcmToken } = req.body; 

    try {
        const [user] = await db.promise().query(`
            SELECT id FROM users WHERE id = ?`, [id]);

        if (user.length === 0) {
            return res.status(404).json({ msg: "Pengguna tidak ditemukan" });
        }

      
        await db.promise().query(`
            UPDATE users
            SET fcmToken = ?
            WHERE id = ?`, [fcmToken, id]);

        res.status(200).json({ msg: "Data fcmToken pengguna berhasil diperbarui" });
    } catch (error) {
        console.error("Error in UpdateUser:", error);
        res.status(500).json({ msg: "Gagal memperbarui data pengguna", error: error.message });
    }
};

exports.getUserById = async (req, res) => {
    const { id } = req.params; 

    try {
        const [users] = await db.promise().query(`
            SELECT * FROM users WHERE id = ?`, [id]);

        // Jika users tidak ditemukan
        if (users.length === 0) {
            return res.status(404).json({ msg: "users tidak ditemukan" });
        }

        res.status(200).json(users[0]); 
    } catch (error) {
        console.error("Error in getusersById:", error);
        res.status(500).json({ msg: "Gagal mengambil data users", error: error.message });
    }
};

