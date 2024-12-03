const db = require('../config/Database');
const Midtrans = require("midtrans-client");
const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv");

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
      "Pesanan dibuat",
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
    const statusResponse = await snap.transaction.status(order_id);

    // Periksa jika status_code adalah 404
    if (statusResponse.status_code === '404') {
      return res.status(201).json({ message: 'Silahkan pilih Metode Pembayaran' });
    }

    let statusDatabase;
    if (statusResponse.transaction_status === 'settlement') {
      statusDatabase = 'Pembayaran Sukses';
    } else if (statusResponse.transaction_status === 'pending') {
      statusDatabase = 'Menunggu Pembayaran';
    } else if (statusResponse.transaction_status === 'cancel') {
      statusDatabase = 'Pembayaran Gagal';
    } else {
      statusDatabase = 'lainnya';
    }

    let statusTransaksi;
    if (statusResponse.transaction_status === 'settlement') {
      statusTransaksi = 'Pesanan Dibuat';
    } else if (statusResponse.transaction_status === 'pending') {
      statusTransaksi = 'Menunggu Pembayaran';
    } else if (statusResponse.transaction_status === 'cancel') {
      statusTransaksi = 'Pembayaran Gagal';
    } else {
      statusTransaksi = 'lainnya';
    }

    const query = `
      UPDATE transaksi 
      SET status_pembayaran = ? 
      WHERE order_id = ?
    `;
    await db.promise().execute(query, [statusDatabase, order_id]);

    const query1 = `
      UPDATE transaksi 
      SET status_transaksi = ? 
      WHERE order_id = ?
    `;
    await db.promise().execute(query1, [statusTransaksi, order_id]);

    res.status(200).json(statusResponse);
  } catch (error) {
    console.error('Error getting transaction status:', error);
    res.status(500).json({ error: 'Silahkan Pilih Metode Pembayaran' });
  }
};
