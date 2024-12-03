const db = require('../config/Database'); 
const path = require('path');


exports.createArtikel = async (req, res) => {
    const { judul, penulis, tanggal, isi } = req.body;

    try {
        let link = "";

        // Jika ada file yang diunggah
        if (req.files && req.files.photo) {
            const photo = Array.isArray(req.files.photo) ? req.files.photo[0] : req.files.photo;
            const photoName = photo.md5 + path.extname(photo.name); // Nama file unik
            const url_photo = `${req.protocol}://${req.get('host')}/artikel/${photoName}`;

            // Simpan file ke direktori
            try {
                await photo.mv(`./public/artikel/${photoName}`);
                link = url_photo; // Tetapkan URL photo jika berhasil diunggah
            } catch (fileError) {
                console.error("Error saving file:", fileError);
                return res.status(500).json({ msg: "Gagal menyimpan file photo", error: fileError.message });
            }
        }

        // Simpan data artikel ke database
        const query = `
            INSERT INTO artikel (judul, penulis, tanggal, isi, photo)
            VALUES (?, ?, ?, ?, ?)`;
        const values = [judul, penulis, tanggal, isi, link];

        await db.promise().query(query, values);

        res.status(201).json({ msg: "Artikel berhasil disimpan" });
    } catch (error) {
        console.error("Error in createArtikel:", error);
        res.status(400).json({ msg: "Gagal melakukan simpan artikel", error: error.message });
    }
};


// Ambil Data Artikel
exports.getArtikel = async (req, res) => {
    try {
        const [artikel] = await db.promise().query(`
            SELECT * FROM artikel ORDER BY id DESC`);

        res.status(200).json(artikel);
    } catch (error) {
        console.error("Error in getartikel:", error);
        res.status(500).json({ msg: "Gagal mengambil data artikel", error: error.message });
    }
};

// Ambil Data Artikel Berdasarkan ID
exports.getArtikelById = async (req, res) => {
    const { id } = req.params; // Ambil id dari parameter URL

    try {
        const [artikel] = await db.promise().query(`
            SELECT * FROM artikel WHERE id = ?`, [id]);

        // Jika artikel tidak ditemukan
        if (artikel.length === 0) {
            return res.status(404).json({ msg: "Artikel tidak ditemukan" });
        }

        res.status(200).json(artikel[0]); // Kembalikan artikel pertama jika ditemukan
    } catch (error) {
        console.error("Error in getArtikelById:", error);
        res.status(500).json({ msg: "Gagal mengambil data artikel", error: error.message });
    }
};
