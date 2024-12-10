const express = require("express");
const {
    createAlamat, getAlamatById, getAlamatByUid, getAllAlamat, updateAlamat
} = require ("../controllers/Alamat.js");

const router = express.Router();

router.post('/alamat', createAlamat);
router.get('/alamat/byid/:id', getAlamatById);
router.put('/alamat/:id', updateAlamat);
router.get('/alamat/byuid/:uid', getAlamatByUid);
router.get('/alamats', getAllAlamat);
 
module.exports = router;