const express = require("express");
const {
    createPaket, getPaket, getPaketById
} = require ("../controllers/Paket.js");

const router = express.Router();

router.post('/paket', createPaket);
router.get('/data_paket', getPaket);
router.get('/data_paket/:id', getPaketById);
 
module.exports = router;