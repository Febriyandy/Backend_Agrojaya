const express = require("express");
const {
    createPaket, getPaket, getPaketById
} = require ("../controllers/Paket.js");

const router = express.Router();

router.post('/paket', createPaket);
router.get('/pakets', getPaket);
router.get('/paket/:id', getPaketById);
 
module.exports = router;