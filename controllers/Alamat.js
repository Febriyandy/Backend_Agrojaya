const db = require('../config/Database');


// Create Alamat
exports.createAlamat = async (req, res) => {
    const { uid, nama, noHp, provinsi, kabupaten, kecamatan, kelurahan, alamatLengkap, catatan } = req.body;

    try {
        // Cek apakah uid ada di tabel user
        const [userCheck] = await db.promise().query(`SELECT id FROM users WHERE id = ?`, [uid]);

        if (userCheck.length === 0) {
            return res.status(404).json({ success: false, msg: "UID tidak terdaftar pada tabel user" });
        }

        // Simpan data alamat ke database
        const query = `
            INSERT INTO alamat (uid, nama, noHp, provinsi, kabupaten, kecamatan, kelurahan, alamatLengkap, catatan)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const values = [uid, nama, noHp, provinsi, kabupaten, kecamatan, kelurahan, alamatLengkap, catatan];

        await db.promise().query(query, values);

        res.status(201).json({ success: true, msg: "Alamat berhasil disimpan" });
    } catch (error) {
        console.error("Error in createAlamat:", error);
        res.status(400).json({ success: false, msg: "Gagal menyimpan alamat", error: error.message });
    }
};


// Get Alamat By ID
exports.getAlamatById = async (req, res) => {
    const { id } = req.params;

    try {
        const [alamat] = await db.promise().query(`SELECT * FROM alamat WHERE id = ?`, [id]);

        if (alamat.length === 0) {
            return res.status(404).json({ msg: "Alamat tidak ditemukan" });
        }

        res.status(200).json(alamat[0]);
    } catch (error) {
        console.error("Error in getAlamatById:", error);
        res.status(500).json({ msg: "Gagal mengambil data alamat", error: error.message });
    }
};

// Get Alamat By UID
exports.getAlamatByUid = async (req, res) => {
    const { uid } = req.params;

    try {
        const [alamat] = await db.promise().query(`SELECT * FROM alamat WHERE uid = ? ORDER BY id DESC`, [uid]);

        if (alamat.length === 0) {
            // Berikan respon 201 dengan JSON kosong
            return res.status(201).json([]);
        }

        // Jika alamat ditemukan, kembalikan data alamat
        res.status(200).json(alamat);
    } catch (error) {
        console.error("Error in getAlamatByUid:", error);
        res.status(500).json({ msg: "Gagal mengambil data alamat", error: error.message });
    }
};


// Get All Alamat
exports.getAllAlamat = async (req, res) => {
    try {
        const [alamat] = await db.promise().query(`SELECT * FROM alamat ORDER BY id DESC`);

        res.status(200).json(alamat);
    } catch (error) {
        console.error("Error in getAllAlamat:", error);
        res.status(500).json({ msg: "Gagal mengambil semua data alamat", error: error.message });
    }
};


// Update Alamat
exports.updateAlamat = async (req, res) => {
    const { id } = req.params;
    const { nama, noHp, provinsi, kabupaten, kecamatan, kelurahan, alamatLengkap, catatan } = req.body;

    try {
        const [alamatCheck] = await db.promise().query(`SELECT id FROM alamat WHERE id = ?`, [id]);

        if (alamatCheck.length === 0) {
            return res.status(404).json({ success: false, msg: "Alamat tidak ditemukan" });
        }

        const query = `
            UPDATE alamat
            SET nama = ?, noHp = ?, provinsi = ?, kabupaten = ?, kecamatan = ?, kelurahan = ?, alamatLengkap = ?, catatan = ?
            WHERE id = ?`;
        const values = [nama, noHp, provinsi, kabupaten, kecamatan, kelurahan, alamatLengkap, catatan, id];

        await db.promise().query(query, values);

        res.status(200).json({ success: true, msg: "Alamat berhasil diperbarui" });
    } catch (error) {
        console.error("Error in updateAlamat:", error);
        res.status(500).json({ success: false, msg: "Gagal memperbarui alamat", error: error.message });
    }
};
