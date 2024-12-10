const express = require("express");
const {
    sendNotification, sendBroadcastNotification
} = require ("../controllers/Notifikasi.js");

const router = express.Router();

router.post('/notifikasi', sendBroadcastNotification)
router.post('/notifikasi/:userId', sendNotification);
 
module.exports = router;