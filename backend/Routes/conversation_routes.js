const express = require("express");
const router = express.Router();

const {
  createConversation,
  getConversation,
  getConversationList,
  createGroup,
  addMembers,
  removeMember,
  updateGroupMeta,
  promoteAdmin,
  demoteAdmin,
  leaveGroup,
  deleteGroup,
} = require("../Controllers/conversation_controller.js");
const fetchuser = require("../middleware/fetchUser.js");

router.post("/", fetchuser, createConversation);
router.get("/:id", fetchuser, getConversation);
router.get("/", fetchuser, getConversationList);

// Group routes
router.post("/group/create", fetchuser, createGroup);
router.put("/group/add-members", fetchuser, addMembers);
router.put("/group/remove-member", fetchuser, removeMember);
router.put("/group/update", fetchuser, updateGroupMeta);
router.put("/group/promote", fetchuser, promoteAdmin);
router.put("/group/demote", fetchuser, demoteAdmin);
router.put("/group/leave", fetchuser, leaveGroup);
router.delete("/group/delete", fetchuser, deleteGroup);

module.exports = router;
