const db = require('../config/Database');
const Midtrans = require("midtrans-client");
const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv");
const admin = require('firebase-admin');

dotenv.config();
// Konfigurasi Midtrans
const snap = new Midtrans.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

exports.createTransaksi = async (req, res) => {
  const {
    uid,
    nama_pengguna,
    email,
    paket_id,
    nama_paket,
    alamat_id,
    total_harga,
    variasi_bibit,
  } = req.body;

  try {
    const order_id = `AGROJAYA${paket_id}${uuidv4()}`;

    // Mendapatkan tanggal transaksi dalam format DD/MM/YYYY
    const today = new Date();
    const tanggal = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${today.getFullYear()}`;

    // Parameter untuk transaksi Midtrans
    const parameter = {
      transaction_details: {
        order_id: order_id,
        gross_amount: total_harga,
      },
      item_details: {
        id: order_id,
        name: nama_paket,
        price: total_harga,
        quantity: 1,
      },
      customer_details: {
        first_name: nama_pengguna,
        email: email,
      },
      callbacks: {
        transaction_status: {
          success: `${process.env.FRONT_END_URL}/callback/success`,
          pending: `${process.env.FRONT_END_URL}/callback/pending`,
          failure: `${process.env.FRONT_END_URL}/callback/failure`,
        },
      },
    };

    // Membuat transaksi di Midtrans
    const token = await snap.createTransaction(parameter);
    console.log("Token:", token);

    // Memeriksa keberadaan Paket
    const [paket] = await db.promise().query("SELECT * FROM paket WHERE id = ?", [paket_id]);

    if (paket.length === 0) {
      return res.status(404).json({ success: false, msg: "Paket tidak ditemukan" });
    }

    // Menyimpan transaksi ke database
    const query = `
      INSERT INTO Transaksi 
      (order_id, uid, paket_id, alamat_id, total_harga, variasi_bibit, tanggal, status_pembayaran, status_transaksi, snap_token, snap_redirect_url) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      order_id,
      uid,
      paket_id,
      alamat_id,
      total_harga,
      variasi_bibit,
      tanggal, 
      "Menunggu Pembayaran",
      "Menunggu Pembayaran",
      token.token,
      token.redirect_url,
    ];

    await db.promise().query(query, values);

    // Mengambil data transaksi lengkap setelah disimpan
    const [data] = await db.promise().query(`
      SELECT t.*, p.nama_paket, p.photo AS photo_paket, 
             a.nama AS nama_alamat, a.noHp, a.provinsi, a.kabupaten, 
             a.kecamatan, a.kelurahan, a.alamatLengkap, a.catatan 
      FROM transaksi t
      JOIN paket p ON t.paket_id = p.id
      JOIN alamat a ON t.alamat_id = a.id
      WHERE t.order_id = ?
    `, [order_id]);

    const [user] = await db.promise().query('SELECT fcmToken FROM users WHERE id = ?', [uid]);
    if (user.length > 0 && user[0].fcmToken) {
      const message = {
        token: user[0].fcmToken,
        notification: {
          title: "Pesanan Berhasil Dibuat",
          body: `Pesanan ${nama_paket} berhasil dibuat. Silakan lakukan pembayaran.`
        }
      };
      await admin.messaging().send(message);

      // Simpan notifikasi ke Firebase
      const notifRef = admin.database().ref(`notifications/${uid}`);
      const waktu = Date.now();
      await notifRef.push({
        title: "Pesanan Berhasil Dibuat",
        body: `Pesanan ${nama_paket} berhasil dibuat. Silakan lakukan pembayaran.`,
        waktu: waktu
      });
    }

    res.status(201).json({ success: true, msg: "Transaksi berhasil disimpan", data: data[0] });
  } catch (error) {
    console.error("Error in createTransaction:", error);
    res.status(500).json({ success: false, msg: "Internal Server Error", error: error.message });
  }
};

// Get Transaksi By ID
exports.getTransaksiById = async (req, res) => {
  const { order_id } = req.params;

  try {
      const [transaksi] = await db.promise().query(`
        SELECT t.*, p.nama_paket, p.photo AS photo_paket, 
               a.nama AS nama_alamat, a.noHp, a.provinsi, a.kabupaten, 
               a.kecamatan, a.kelurahan, a.alamatLengkap, a.catatan 
        FROM transaksi t
        JOIN paket p ON t.paket_id = p.id
        JOIN alamat a ON t.alamat_id = a.id
        WHERE t.order_id = ?
      `, [order_id]);

      if (transaksi.length === 0) {
          return res.status(404).json({ msg: "Transaksi tidak ditemukan" });
      }

      res.status(200).json(transaksi[0]);
  } catch (error) {
      console.error("Error in getTransaksiById:", error);
      res.status(500).json({ msg: "Gagal mengambil data transaksi", error: error.message });
  }
};

// Get Transaksi By UID
exports.getTransaksiByUid = async (req, res) => {
  const { uid } = req.params;

  try {
    const [transaksi] = await db.promise().query(`
      SELECT t.*, p.nama_paket, p.photo AS photo_paket, 
             a.nama AS nama_alamat, a.noHp, a.provinsi, a.kabupaten, 
             a.kecamatan, a.kelurahan, a.alamatLengkap, a.catatan 
      FROM transaksi t
      JOIN paket p ON t.paket_id = p.id
      JOIN alamat a ON t.alamat_id = a.id
      WHERE t.uid = ?
      ORDER BY t.id DESC 
    `, [uid]);

    if (transaksi.length === 0) {
      // Berikan respon 201 dengan JSON kosong
      return res.status(201).json([]);
    }

    // Jika transaksi ditemukan, kembalikan data transaksi
    res.status(200).json(transaksi);
  } catch (error) {
    console.error("Error in getTransaksiByUid:", error);
    res.status(500).json({ msg: "Gagal mengambil data transaksi", error: error.message });
  }
};



// Get All Transaksi
exports.getAllTransaksi = async (req, res) => {
  try {
      const [transaksi] = await db.promise().query(`
        SELECT t.*, p.nama_paket, p.photo AS photo_paket, 
               a.nama AS nama_alamat, a.noHp, a.provinsi, a.kabupaten, 
               a.kecamatan, a.kelurahan, a.alamatLengkap, a.catatan 
        FROM transaksi t
        JOIN paket p ON t.paket_id = p.id
        JOIN alamat a ON t.alamat_id = a.id
        ORDER BY t.id DESC
      `);

      res.status(200).json(transaksi);
  } catch (error) {
      console.error("Error in getAllTransaksi:", error);
      res.status(500).json({ msg: "Gagal mengambil semua data transaksi", error: error.message });
  }
};

exports.getStatus = async (req, res) => {
  try {
      const { order_id } = req.params;

      // Ambil status transaksi dari Midtrans
      const statusResponse = await snap.transaction.status(order_id);

      // Periksa jika status_code adalah 404
      if (statusResponse.status_code === '404') {
          return res.status(201).json({ message: 'Silahkan pilih Metode Pembayaran' });
      }

      // Tentukan status pembayaran dan transaksi berdasarkan status dari Midtrans
      let statusDatabase;
      let statusTransaksi;

      switch (statusResponse.transaction_status) {
          case 'settlement':
              statusDatabase = 'Pembayaran Sukses';
              statusTransaksi = 'Pesanan Dibuat';
              break;
          case 'pending':
              statusDatabase = 'Menunggu Pembayaran';
              statusTransaksi = 'Menunggu Pembayaran';
              break;
          case 'cancel':
              statusDatabase = 'Pembayaran Gagal';
              statusTransaksi = 'Pembayaran Gagal';
              break;
          default:
              statusDatabase = 'Transaksi Gagal';
              statusTransaksi = 'Transaksi Gagal';
      }

      // Update status pembayaran di database
      const updatePaymentStatusQuery = `
          UPDATE transaksi 
          SET status_pembayaran = ?, status_transaksi = ?
          WHERE order_id = ?
      `;
      await db.promise().execute(updatePaymentStatusQuery, [statusDatabase, statusTransaksi, order_id]);

      // Jika status settlement, kirim notifikasi
      if (statusResponse.transaction_status === 'settlement') {
          try {
              // Ambil fcmToken user berdasarkan order_id
              const [userResult] = await db.promise().query(`
                  SELECT u.fcmToken, t.uid 
                  FROM users u 
                  JOIN transaksi t ON u.id = t.uid 
                  WHERE t.order_id = ?
              `, [order_id]);

              if (userResult.length > 0 && userResult[0].fcmToken) {
                  const { fcmToken, uid } = userResult[0];

                  // Kirim notifikasi pembayaran sukses
                  const message = {
                      token: fcmToken,
                      notification: {
                          title: "Pembayaran Sukses",
                          body: "Pembayaran Anda sukses, pesanan Anda akan segera kami proses"
                      }
                  };
                  await admin.messaging().send(message);

                  // Simpan notifikasi ke Firebase Realtime Database
                  const waktu = Date.now(); // Format waktu dalam milidetik
                  await admin.database().ref(`notifications/${uid}`).push({
                      title: "Pembayaran Sukses",
                      body: "Pembayaran Anda sukses, pesanan Anda akan segera kami proses",
                      waktu,
                  });
              }
          } catch (error) {
              console.error('Error sending notification:', error);
          }
      }

      // Kirim respons ke klien
      res.status(200).json(statusResponse);
  } catch (error) {
      console.error('Error getting transaction status:', error);
      res.status(500).json({ error: 'Terjadi kesalahan dalam memproses status transaksi' });
  }
};


exports.updateStatusTransaksi = async (req, res) => {
  const { order_id } = req.params;
  const { status_transaksi } = req.body;

  try {
      // Cek apakah transaksi dengan order_id tersebut ada
      const [transaksi] = await db.promise().query(
          'SELECT t.*, u.fcmToken, u.id AS uid FROM transaksi t JOIN users u ON t.uid = u.id WHERE t.order_id = ?',
          [order_id]
      );

      if (transaksi.length === 0) {
          return res.status(404).json({
              msg: "Transaksi tidak ditemukan"
          });
      }

      // Update status transaksi
      await db.promise().execute(
          'UPDATE transaksi SET status_transaksi = ? WHERE order_id = ?',
          [status_transaksi, order_id]
      );

      // Persiapkan data notifikasi berdasarkan status
      let notificationData = null;
      switch (status_transaksi) {
          case "Teknisi Menuju Lokasi Anda":
              notificationData = {
                  title: "Teknisi Menuju Lokasi Anda",
                  body: "Teknisi kami segera sampai ke alamat anda, mohon menunggu"
              };
              break;
          case "Proses Pemasangan":
              notificationData = {
                  title: "Proses Pemasangan",
                  body: "Teknisi kami dalam proses pemasangan paket pesanan anda"
              };
              break;
          case "Pesanan Selesai":
              notificationData = {
                  title: "Pesanan Selesai",
                  body: "Terimakasih sudah menggunakan jasa kami, selamat bertani dengan menyenangkan"
              };
              break;
          default:
              return res.status(400).json({
                  msg: "Status transaksi tidak valid"
              });
      }

      // Kirim notifikasi jika FCM token tersedia
      if (notificationData && transaksi[0].fcmToken) {
          const { fcmToken, uid } = transaksi[0];
          const message = {
              token: fcmToken,
              notification: notificationData
          };

          await admin.messaging().send(message);

          // Simpan notifikasi ke Firebase
          const waktu = Date.now();
          const notifRef = admin.database().ref(`notifications/${uid}`);
          await notifRef.push({
              ...notificationData,
              waktu
          });

          return res.status(200).json({
              msg: "Status transaksi berhasil diupdate",
              status: status_transaksi,
              notifikasi: "Notifikasi berhasil dikirim"
          });
      }

      // Jika tidak ada FCM token
      return res.status(200).json({
          msg: "Status transaksi berhasil diupdate",
          status: status_transaksi,
          notifikasi: "Tidak ada token FCM"
      });

  } catch (error) {
      console.error('Error updating transaction status:', error);
      res.status(500).json({
          msg: "Gagal mengupdate status transaksi",
          error: error.message
      });
  }
};
