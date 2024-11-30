const express = require("express");
const {
    createTransaksi,
    getAllTransaksi,
    getTransaksiById,
    getTransaksiByUid,
    getStatus
} = require ("../controllers/Transaksi.js");

const router = express.Router();

router.post('/transaksi', createTransaksi);
router.get('/transaksi/byid/:id', getTransaksiById);
router.get('/transaksi/byuid/:uid', getTransaksiByUid);
router.get('/transaksi/status/:order_id', getStatus);
router.get('/transaksis', getAllTransaksi);
 
module.exports = router;