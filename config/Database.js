const mysql = require("mysql2");

// Konfigurasi koneksi ke database
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "db_agrojaya",
    port: 3306,
});

// Membuka koneksi ke database
db.connect((err) => {
    if (err) {
        console.error("Koneksi ke database gagal:", err);
    } else {
        console.log("Koneksi ke database berhasil.");
    }
});

module.exports = db;
