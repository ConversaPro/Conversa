const Conversation = require("../Models/Conversation.js");
const User = require("../Models/User.js");
const Message = require("../Models/Message.js");
const {
  getAiResponse,
  sendMessageHandler,
  deleteMessageHandler,
} = require("../Controllers/message_controller.js");

// In-memory set to track users currently on a call
const activeCallUsers = new Set();

module.exports = (io, socket) => {
  let currentUserId = null;

  // Setup user in a room
  socket.on("setup", async (id) => {
    currentUserId = id;
    socket.join(id);
    console.log("User joined personal room", id);
    socket.emit("user setup", id);

    // change isOnline to true
    await User.findByIdAndUpdate(id, { isOnline: true });

    const conversations = await Conversation.find({
      members: { $in: [id] },
    });

    conversations.forEach((conversation) => {
      const sock = io.sockets.adapter.rooms.get(conversation.id);
      if (sock) {
        console.log("Other user is online is sent to: ", id);
        io.to(conversation.id).emit("receiver-online", {});
      }
    });
  });

  // Join chat room
  socket.on("join-chat", async (data) => {
    const { roomId, userId } = data;

    console.log("User joined chat room", roomId);
    const conv = await Conversation.findById(roomId);
    socket.join(roomId);

    // set joined user unread to 0
    conv.unreadCounts = conv.unreadCounts.map((unread) => {
      if (unread.userId == userId) {
        unread.count = 0;
      }
      return unread;
    });
    await conv.save({ timestamps: false });

    io.to(roomId).emit("user-joined-room", userId);
  });

  // Leave chat room
  socket.on("leave-chat", (room) => {
    socket.leave(room);
  });

  const handleSendMessage = async (data) => {
    console.log("Received message: ");

    var isSentToBot = false;

  const { conversationId, senderId, text, imageUrl, audioUrl } = data;
    const conversation = await Conversation.findById(conversationId).populate(
      "members"
    );

    // processing for AI chatbot only for text messages
    conversation.members.forEach(async (member) => {
      if (member._id != senderId && member.email.endsWith("bot") && text && text.trim() !== "") {
        // this member is a bot
        isSentToBot = true;
        // send typing event
        io.to(conversationId).emit("typing", { typer: member._id.toString() });
        // generating AI response

        const mockUserMessage = {
          id_: Date.now().toString(),
          conversationId: conversationId,
          senderId: senderId,
          text: text,
          seenBy: [
            {
              user: member._id.toString(),
              seenAt: new Date(),
            },
          ],
          imageUrl: imageUrl,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        io.to(conversationId).emit("receive-message", mockUserMessage);

        const responseMessage = await getAiResponse(
          text,
          senderId,
          conversationId
        );

        if (responseMessage == -1) {
          return;
        }

        io.to(conversationId).emit("receive-message", responseMessage);
        io.to(conversationId).emit("stop-typing", {
          typer: member._id.toString(),
        });
      }
    });

    if (isSentToBot) {
      return;
    }

    // processing for personal chat
    const receiverId = conversation.members.find(
      (member) => member._id != senderId
    )._id;

    const receiverPersonalRoom = io.sockets.adapter.rooms.get(
      receiverId.toString()
    );

    let isReceiverInsideChatRoom = false;

    if (receiverPersonalRoom) {
      const receiverSid = Array.from(receiverPersonalRoom)[0];
      const convRoom = io.sockets.adapter.rooms.get(conversationId);
      if (convRoom && typeof convRoom.has === "function") {
        isReceiverInsideChatRoom = convRoom.has(receiverSid);
      } else {
        isReceiverInsideChatRoom = false;
      }
    }

    const message = await sendMessageHandler({
  text,
  imageUrl,
  audioUrl,
      senderId,
      conversationId,
      receiverId,
      isReceiverInsideChatRoom,
    });
    if (message) {
      const payload = message.toObject ? message.toObject() : message;
      if (data.clientId) {
        payload.clientId = data.clientId;
      }
      io.to(conversationId).emit("receive-message", payload);
    }

    // sending notification to receiver
    if (!isReceiverInsideChatRoom) {
      console.log("Emitting new message to: ", receiverId.toString());
      io.to(receiverId.toString()).emit("new-message-notification", message);
    }
  };

  // Send message
  socket.on("send-message", handleSendMessage);

  const handleDeleteMessage = async (data) => {
    const { messageId, deleteFrom, conversationId } = data;
    const deleted = await deleteMessageHandler({ messageId, deleteFrom });
    if (deleted && deleteFrom.length > 1) {
      io.to(conversationId).emit("message-deleted", data);
    }
  };

  // Send message
  socket.on("delete-message", handleDeleteMessage);

  // Typing indicator
  socket.on("typing", (data) => {
    io.to(data.conversationId).emit("typing", data);
  });

  // Stop typing indicator
  socket.on("stop-typing", (data) => {
    io.to(data.conversationId).emit("stop-typing", data);
  });

  // ---------------------------
  // WebRTC Calling - Signaling
  // ---------------------------
  const forwardToUser = (userId, event, payload) => {
    if (!userId) return;
    io.to(userId.toString()).emit(event, payload);
  };

  socket.on("call-initiate", async (data) => {
    // data: { fromUserId, toUserId, conversationId, callType }
    const { fromUserId, toUserId, conversationId, callType } = data || {};
    if (!fromUserId || !toUserId || !conversationId) return;

    if (activeCallUsers.has(toUserId) || activeCallUsers.has(fromUserId)) {
      // target busy
      forwardToUser(fromUserId, "call-busy", { toUserId });
      return;
    }
    forwardToUser(toUserId, "incoming-call", {
      fromUserId,
      toUserId,
      conversationId,
      callType,
    });
  });

  socket.on("call-accept", (data) => {
    const { fromUserId, toUserId, conversationId, callType } = data || {};
    activeCallUsers.add(fromUserId);
    activeCallUsers.add(toUserId);
    forwardToUser(fromUserId, "call-accepted", {
      fromUserId,
      toUserId,
      conversationId,
      callType,
      acceptedAt: Date.now(),
    });
  });

  socket.on("call-reject", (data) => {
    const { fromUserId, toUserId, conversationId, callType, reason } = data || {};
    forwardToUser(fromUserId, "call-rejected", {
      fromUserId,
      toUserId,
      conversationId,
      callType,
      reason: reason || "rejected",
    });
  });

  socket.on("webrtc-offer", (data) => {
    const { toUserId } = data || {};
    forwardToUser(toUserId, "webrtc-offer", data);
  });

  socket.on("webrtc-answer", (data) => {
    const { toUserId } = data || {};
    forwardToUser(toUserId, "webrtc-answer", data);
  });

  socket.on("webrtc-ice-candidate", (data) => {
    const { toUserId } = data || {};
    forwardToUser(toUserId, "webrtc-ice-candidate", data);
  });

  socket.on("call-end", (data) => {
    const { fromUserId, toUserId } = data || {};
    forwardToUser(toUserId, "call-ended", data);
    activeCallUsers.delete(fromUserId);
    activeCallUsers.delete(toUserId);
  });

  socket.on("log-call", async (data) => {
    try {
      const {
        conversationId,
        senderId,
        callType, // 'audio' | 'video'
        callStatus, // 'ended' | 'rejected' | 'missed'
        startedAt,
        endedAt,
      } = data || {};
      if (!conversationId || !senderId) return;
      const durationMs = startedAt && endedAt ? Math.max(0, Number(endedAt) - Number(startedAt)) : 0;
      const msg = await Message.create({
        conversationId,
        senderId,
        text: "", // no text for call logs
        callType,
        callStatus,
        callStartedAt: startedAt ? new Date(Number(startedAt)) : null,
        callEndedAt: endedAt ? new Date(Number(endedAt)) : null,
        callDurationMs: durationMs,
      });
      try {
        const conv = await Conversation.findById(conversationId);
        if (conv) {
          conv.latestmessage = callType === 'video' ? '[video call]' : '[voice call]';
          await conv.save({ timestamps: false });
        }
      } catch {}

      // Push to the conversation room so both sides see it
      io.to(conversationId).emit("receive-message", msg?.toObject ? msg.toObject() : msg);
    } catch (e) {
      console.error("Failed to log call:", e.message);
    }
  });

  // Disconnect
  socket.on("disconnect", async () => {
    console.log("A user disconnected", currentUserId, socket.id);
    try {
      await User.findByIdAndUpdate(currentUserId, {
        isOnline: false,
        lastSeen: new Date(),
      });
    } catch (error) {
      console.error("Error updating user status on disconnect:", error);
    }

    const conversations = await Conversation.find({
      members: { $in: [currentUserId] },
    });

    conversations.forEach((conversation) => {
      const sock = io.sockets.adapter.rooms.get(conversation.id);
      if (sock) {
        console.log("Other user is offline is sent to: ", currentUserId);
        io.to(conversation.id).emit("receiver-offline", {});
      }
    });
  });
};
