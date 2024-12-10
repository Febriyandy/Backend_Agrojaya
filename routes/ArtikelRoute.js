const express = require("express");
const {
    createArtikel, getArtikel, getArtikelById
} = require ("../controllers/Artikel.js");

const router = express.Router();

router.post('/artikel', createArtikel);
router.get('/artikels', getArtikel);
router.get('/artikel/:id', getArtikelById);
 
module.exports = router;