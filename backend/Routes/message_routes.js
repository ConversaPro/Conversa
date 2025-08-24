const express = require("express");
const router = express.Router();
const multer = require("multer");

const upload = multer();

const { sendMessage, allMessage, deletemesage, uploadImage } = require(
  "../Controllers/message_controller.js"
);
const fetchuser = require("../middleware/fetchUser.js");

router.get("/:id/:userid", fetchuser, allMessage);
router.post("/send", fetchuser, upload.single("file"), sendMessage);
router.post("/delete", fetchuser, deletemesage);
router.post("/upload", fetchuser, upload.single("file"), uploadImage);
// Voice message upload (uses same controller with resource_type:auto)
router.post("/upload-audio", fetchuser, upload.single("file"), uploadImage);

module.exports = router;
