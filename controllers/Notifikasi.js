const admin = require('firebase-admin');
const db = require('../config/Database');

const serviceAccount = require('../config/agrojaya-a6b68-firebase-adminsdk-g0crx-d9563c5765.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://agrojaya-a6b68-default-rtdb.firebaseio.com/"  
});

exports.sendNotification = async (req, res) => {
    const { userId } = req.params;
    const { title, body } = req.body;

    try {
        // Ambil data pengguna dari database
        const [user] = await db.promise().query(
            'SELECT fcmToken FROM users WHERE id = ?',
            [userId]
        );

        if (user.length === 0) {
            return res.status(404).json({ msg: "Pengguna tidak ditemukan" });
        }

        if (!user[0].fcmToken) {
            return res.status(400).json({ msg: "FCM Token tidak tersedia untuk pengguna ini" });
        }

        // Siapkan pesan notifikasi
        const message = {
            token: user[0].fcmToken,
            notification: {
                title,
                body
            }
        };

        // Kirim notifikasi ke pengguna
        const response = await admin.messaging().send(message);

        // Simpan notifikasi di Realtime Database Firebase
        const waktu = Date.now(); // Waktu pengiriman dalam format milidetik
        const notificationData = {
            body,
            title,
            waktu
        };

        await admin.database().ref(`notifications/${userId}`).push(notificationData); // Simpan notifikasi di database

        res.status(200).json({
            msg: "Notifikasi berhasil dikirim dan disimpan",
            details: response
        });

    } catch (error) {
        console.error("Error in sendNotification:", error);
        res.status(500).json({
            msg: "Gagal mengirim notifikasi",
            error: error.message
        });
    }
};

exports.sendBroadcastNotification = async (req, res) => {
    const { title, body } = req.body;

    try {
        // Ambil semua FCM token yang tidak null dari database
        const [users] = await db.promise().query(
            'SELECT id, fcmToken FROM users WHERE fcmToken IS NOT NULL'
        );

        if (users.length === 0) {
            return res.status(404).json({
                msg: "Tidak ada pengguna dengan token FCM yang valid"
            });
        }

        // Array untuk menyimpan hasil pengiriman
        const results = {
            success: [],
            failed: []
        };

        // Kirim notifikasi ke setiap user
        for (const user of users) {
            try {
                const message = {
                    token: user.fcmToken,
                    notification: {
                        title,
                        body
                    }
                };

                // Kirim notifikasi
                const response = await admin.messaging().send(message);

                // Simpan notifikasi ke Firebase Realtime Database
                const waktu = Date.now(); // Waktu pengiriman dalam format milidetik
                const notificationData = {
                    body,
                    title,
                    waktu
                };

                // Simpan notifikasi di database
                await admin.database().ref(`notifications/${user.id}`).push(notificationData);

                results.success.push({
                    userId: user.id,
                    message: "Berhasil mengirim notifikasi",
                    messageId: response
                });

            } catch (error) {
                results.failed.push({
                    userId: user.id,
                    error: error.message
                });
            }
        }

        // Siapkan ringkasan hasil
        const summary = {
            totalUsers: users.length,
            berhasil: results.success.length,
            gagal: results.failed.length
        };

        res.status(200).json({
            msg: "Proses broadcast notifikasi selesai",
            ringkasan: summary,
            detailHasil: results
        });

    } catch (error) {
        console.error("Error dalam broadcast notifikasi:", error);
        res.status(500).json({
            msg: "Terjadi kesalahan saat mengirim broadcast notifikasi",
            error: error.message
        });
    }
};
