const express = require("express");
const {
    createAlamat, getAlamatById, getAlamatByUid, getAllAlamat
} = require ("../controllers/Alamat.js");

const router = express.Router();

router.post('/alamat', createAlamat);
router.get('/alamat/byid/:id', getAlamatById);
router.get('/alamat/byuid/:uid', getAlamatByUid);
router.get('/alamats', getAllAlamat);
 
module.exports = router;