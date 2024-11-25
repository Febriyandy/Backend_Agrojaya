const db = require('../config/Database'); 
const path = require('path');

// Simpan Paket
exports.createPaket = async (req, res) => {
    const { nama_paket, harga, variasi_bibit, fitur, detail } = req.body;

    try {
        let link = "";
        let namaphoto = "";

        // Jika ada file yang diunggah
        if (req.files && req.files.photo) {
            const photo = Array.isArray(req.files.photo) ? req.files.photo[0] : req.files.photo;
            const photoName = photo.md5 + path.extname(photo.name); // Nama file unik
            const url_photo = `${req.protocol}://${req.get('host')}/paket/${photoName}`;

            // Simpan file ke direktori
            await photo.mv(`./public/paket/${photoName}`);

            link = url_photo;
            namaphoto = photoName;
        }

        // Simpan data paket ke database
        await db.promise().query(`
            INSERT INTO paket (nama_paket, harga, variasi_bibit, fitur, detail, photo)
            VALUES (?, ?, ?, ?, ?, ?)`, [
            nama_paket,
            harga,
            JSON.stringify(variasi_bibit),
            JSON.stringify(fitur),
            JSON.stringify(detail),
            link
        ]);

        res.status(201).json({ msg: "Paket berhasil disimpan" });
    } catch (error) {
        console.error("Error in createPaket:", error);
        res.status(400).json({ msg: "Gagal melakukan simpan paket", error: error.message });
    }
};

// Ambil Data Paket
exports.getPaket = async (req, res) => {
    try {
        const [paket] = await db.promise().query(`
            SELECT * FROM paket`);

        res.status(200).json(paket);
    } catch (error) {
        console.error("Error in getPaket:", error);
        res.status(500).json({ msg: "Gagal mengambil data paket", error: error.message });
    }
};

exports.getPaketById = async (req, res) => {
    const { id } = req.params; // Ambil id dari parameter URL

    try {
        const [paket] = await db.promise().query(`
            SELECT * FROM paket WHERE id = ?`, [id]);

        // Jika paket tidak ditemukan
        if (paket.length === 0) {
            return res.status(404).json({ msg: "paket tidak ditemukan" });
        }

        res.status(200).json(paket[0]); // Kembalikan paket pertama jika ditemukan
    } catch (error) {
        console.error("Error in getpaketById:", error);
        res.status(500).json({ msg: "Gagal mengambil data paket", error: error.message });
    }
};

