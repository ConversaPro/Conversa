const Conversation = require("../Models/Conversation.js");
const mongoose = require("mongoose");

const createConversation = async (req, res) => {
  try {
    const { members: memberIds } = req.body;

    if (!memberIds) {
      return res.status(400).json({
        error: "Please fill all the fields",
      });
    }

    const conv = await Conversation.findOne({
      members: { $all: memberIds },
    }).populate("members", "-password");

    if (conv) {
      conv.members = conv.members.filter(
        (memberId) => memberId !== req.user.id
      );
      return res.status(200).json(conv);
    }

    const newConversation = await Conversation.create({
      members: memberIds,
      unreadCounts: memberIds.map((memberId) => ({
        userId: memberId,
        count: 0,
      })),
    });

    await newConversation.populate("members", "-password");

    newConversation.members = newConversation.members.filter(
      (member) => member.id !== req.user.id
    );

    return res.status(200).json(newConversation);
  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal Server Error");
  }
};

const getConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id).populate(
      "members",
      "-password",
      "-phoneNum"
    );

    if (!conversation) {
      return res.status(404).json({
        error: "No conversation found",
      });
    }

    res.status(200).json(conversation);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

const getConversationList = async (req, res) => {
  const userId = req.user.id;

  try {
    const conversationList = await Conversation.find({
      members: { $in: userId },
    }).populate("members", "-password");

    if (!conversationList) {
      return res.status(404).json({
        error: "No conversation found",
      });
    }

    // For personal DMs, remove current user from members to show the other party.
    // For groups, keep all members and rely on 'name' for display.
    for (let i = 0; i < conversationList.length; i++) {
      if (!conversationList[i].isGroup) {
        conversationList[i].members = conversationList[i].members.filter(
          (member) => member.id !== userId
        );
      }
    }

    conversationList.sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    res.status(200).json(conversationList);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  createConversation,
  getConversation,
  getConversationList,
};

// ---------------- Group Chat APIs -----------------
const createGroup = async (req, res) => {
  try {
    const { name, description = "", memberIds = [], groupIcon = "" } = req.body;
    if (!name || !Array.isArray(memberIds) || memberIds.length < 2) {
      return res.status(400).json({ error: "Name and at least 2 members required" });
    }
    // include creator if not present
    const membersSet = new Set(memberIds.map(String));
    membersSet.add(String(req.user.id));
    const members = Array.from(membersSet).map((id) => new mongoose.Types.ObjectId(id));

    const group = await Conversation.create({
      isGroup: true,
      name,
      description,
      members,
      groupIcon,
      createdBy: req.user.id,
      admins: [req.user.id],
      unreadCounts: members.map((userId) => ({ userId, count: 0 })),
    });
    await group.populate("members", "-password");
    return res.status(201).json(group);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const ensureAdmin = async (conversationId, userId) => {
  const conv = await Conversation.findById(conversationId);
  if (!conv) return [null, "Conversation not found"];
  if (!conv.isGroup) return [null, "Not a group chat"];
  if (!conv.admins.map(String).includes(String(userId))) return [null, "Not an admin"];
  return [conv, null];
};

const addMembers = async (req, res) => {
  try {
    const { conversationId, memberIds = [] } = req.body;
    const [conv, err] = await ensureAdmin(conversationId, req.user.id);
    if (err) return res.status(403).json({ error: err });
    const addSet = new Set(conv.members.map(String));
    memberIds.forEach((id) => addSet.add(String(id)));
    conv.members = Array.from(addSet);
    // keep unreadCounts aligned
    const existing = new Set(conv.unreadCounts.map((u) => String(u.userId)));
    conv.unreadCounts = [...conv.unreadCounts, ...Array.from(addSet).filter((id) => !existing.has(String(id))).map((id) => ({ userId: id, count: 0 }))];
    await conv.save();
    await conv.populate("members", "-password");
    res.json(conv);
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const removeMember = async (req, res) => {
  try {
    const { conversationId, memberId } = req.body;
    const [conv, err] = await ensureAdmin(conversationId, req.user.id);
    if (err) return res.status(403).json({ error: err });
    conv.members = conv.members.filter((id) => String(id) !== String(memberId));
    conv.admins = conv.admins.filter((id) => String(id) !== String(memberId));
    conv.unreadCounts = conv.unreadCounts.filter((u) => String(u.userId) !== String(memberId));
    await conv.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateGroupMeta = async (req, res) => {
  try {
    const { conversationId, name, description, groupIcon } = req.body;
    const [conv, err] = await ensureAdmin(conversationId, req.user.id);
    if (err) return res.status(403).json({ error: err });
    if (name) conv.name = name;
    if (typeof description === 'string') conv.description = description;
    if (typeof groupIcon === 'string') conv.groupIcon = groupIcon;
    await conv.save();
    res.json(conv);
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const promoteAdmin = async (req, res) => {
  try {
    const { conversationId, memberId } = req.body;
    const [conv, err] = await ensureAdmin(conversationId, req.user.id);
    if (err) return res.status(403).json({ error: err });
    if (!conv.admins.map(String).includes(String(memberId))) conv.admins.push(memberId);
    await conv.save();
    res.json(conv);
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const demoteAdmin = async (req, res) => {
  try {
    const { conversationId, memberId } = req.body;
    const [conv, err] = await ensureAdmin(conversationId, req.user.id);
    if (err) return res.status(403).json({ error: err });
    conv.admins = conv.admins.filter((id) => String(id) !== String(memberId));
    await conv.save();
    res.json(conv);
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const leaveGroup = async (req, res) => {
  try {
    const { conversationId } = req.body;
    const conv = await Conversation.findById(conversationId);
    if (!conv || !conv.isGroup) return res.status(404).json({ error: "Not found" });
    conv.members = conv.members.filter((id) => String(id) !== String(req.user.id));
    conv.admins = conv.admins.filter((id) => String(id) !== String(req.user.id));
    conv.unreadCounts = conv.unreadCounts.filter((u) => String(u.userId) !== String(req.user.id));
    await conv.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const { conversationId } = req.body;
    const [conv, err] = await ensureAdmin(conversationId, req.user.id);
    if (err) return res.status(403).json({ error: err });
    await Conversation.findByIdAndDelete(conversationId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.createGroup = createGroup;
module.exports.addMembers = addMembers;
module.exports.removeMember = removeMember;
module.exports.updateGroupMeta = updateGroupMeta;
module.exports.promoteAdmin = promoteAdmin;
module.exports.demoteAdmin = demoteAdmin;
module.exports.leaveGroup = leaveGroup;
module.exports.deleteGroup = deleteGroup;
