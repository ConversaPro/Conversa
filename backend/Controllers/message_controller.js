const Message = require("../Models/Message.js");
const Conversation = require("../Models/Conversation.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const imageupload = require("../config/imageupload.js");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
// Removed AWS S3 presign integration. Using Cloudinary via imageupload when needed.

const configuration = new GoogleGenerativeAI(process.env.GENERATIVE_API_KEY);
const modelId = "gemini-1.5-flash";
const model = configuration.getGenerativeModel({ model: modelId });

const sendMessage = async (req, res) => {
  let imageUrl = "";

  try {
    if (req.file) {
      imageUrl = await imageupload(req.file, false);
    }

    const { conversationId, senderId, text, audioUrl } = req.body;
    if (!conversationId || !senderId) {
      return res.status(400).json({ error: "conversationId and senderId are required" });
    }

    if (!text && !imageUrl && !audioUrl) {
      return res.status(400).json({ error: "Either text, image or audio is required" });
    }

    const conversation = await Conversation.findById(conversationId).populate(
      "members",
      "-password"
    );

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // create and save message (only include provided fields)
    const doc = {
      conversationId,
      senderId,
      seenBy: [{ user: senderId, seenAt: new Date() }],
    };
  if (text && text.trim() !== "") doc.text = text;
  if (imageUrl) doc.imageUrl = imageUrl;
  if (audioUrl) doc.audioUrl = audioUrl;

  console.log("[sendMessage] creating doc:", JSON.stringify(doc));
  const newMessage = await Message.create(doc);

    conversation.updatedAt = new Date();
    await conversation.save();

    return res.status(200).json(newMessage);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

// Upload a single image/file to Cloudinary and return the URL
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }
    const url = await imageupload(req.file, false);
    if (!url) {
      return res.status(500).json({ error: "Upload failed" });
    }
    return res.status(200).json({ url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const allMessage = async (req, res) => {
  try {
  const messages = await Message.find({
      conversationId: req.params.id,
      deletedFrom: { $ne: req.user.id },
  }).sort({ createdAt: 1 });

    messages.forEach(async (message) => {
      let isUserAddedToSeenBy = false;
      message.seenBy.forEach((element) => {
        if (element.user == req.user.id) {
          isUserAddedToSeenBy = true;
        }
      });
      if (!isUserAddedToSeenBy) {
        message.seenBy.push({ user: req.user.id });
      }
      await message.save();
    });

    res.json(messages);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const deletemesage = async (req, res) => {
  const msgid = req.body.messageid;
  const userids = req.body.userids || [];
  try {
    const message = await Message.findById(msgid);
    if (!message) {
      return res.status(404).send({ error: "Message not found" });
    }

    for (const userid of userids) {
      if (!message.deletedFrom.includes(userid)) {
        message.deletedFrom.push(userid);
      }
    }
    await message.save();
    res.status(200).send("Message deleted successfully");
  } catch (error) {
    console.log(error.message);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

// Presigned URL endpoint removed.

const getAiResponse = async (prompt, senderId, conversationId) => {
  if (!prompt || String(prompt).trim() === "") {
    return -1;
  }
  var currentMessages = [];
  const conv = await Conversation.findById(conversationId);
  const botId = conv.members.find((member) => member != senderId);

  const messagelist = await Message.find({
    conversationId: conversationId,
  })
    .sort({ createdAt: -1 })
    .limit(20);

  messagelist.forEach((message) => {
    if (message.senderId == senderId) {
      currentMessages.push({
        role: "user",
        parts: message.text,
      });
    } else {
      currentMessages.push({
        role: "model",
        parts: message.text,
      });
    }
  });

  // reverse currentMessages
  currentMessages = currentMessages.reverse();

  try {
    const chat = model.startChat({
      history: currentMessages,
      generationConfig: {
        maxOutputTokens: 2000,
      },
    });

    const result = await chat.sendMessage(prompt);
    const response = result.response;
    var responseText = response.text();

    if (responseText.length < 1) {
      responseText = "Woops!! thats soo long ask me something in short.";
      return -1;
    }

    await Message.create({
      conversationId: conversationId,
      senderId: senderId,
      text: prompt,
      seenBy: [{ user: botId, seenAt: new Date() }],
    });

    const botMessage = await Message.create({
      conversationId: conversationId,
      senderId: botId,
      text: responseText,
    });

    conv.latestmessage = responseText;
    await conv.save();

    return botMessage;
  } catch (error) {
    console.log(error.message);
    return "some error occured while generating response";
  }
};

const sendMessageHandler = async (data) => {
  try {
    const {
      text,
      imageUrl,
      audioUrl,
      senderId,
      conversationId,
      receiverId,
      isReceiverInsideChatRoom,
    } = data;

    if ((!text || String(text).trim() === "") && !imageUrl && !audioUrl) {
      return null;
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return null;
    }

    if (!isReceiverInsideChatRoom) {
      const createDoc = {
        conversationId,
        senderId,
        seenBy: [],
      };
  if (text && String(text).trim() !== "") createDoc.text = text;
  if (imageUrl) createDoc.imageUrl = imageUrl;
  if (audioUrl) createDoc.audioUrl = audioUrl;
      console.log(
        "[socket sendMessageHandler outside room] creating doc:",
        JSON.stringify(createDoc)
      );
      const message = await Message.create(createDoc);

      // update conversation latest message and increment unread count of receiver by 1
      conversation.latestmessage =
        text && String(text).trim() !== ""
          ? text
          : imageUrl
          ? "[image]"
          : audioUrl
          ? "[voice]"
          : conversation.latestmessage;
      if (Array.isArray(conversation.unreadCounts)) {
        conversation.unreadCounts = conversation.unreadCounts.map((unread) => {
          if (unread.userId.toString() === receiverId.toString()) {
            unread.count = (unread.count || 0) + 1;
          }
          return unread;
        });
      }
      await conversation.save();
      return message;
    } else {
      // create new message with seenBy receiver
      const createDoc = {
        conversationId,
        senderId,
        seenBy: [
          {
            user: receiverId,
            seenAt: new Date(),
          },
        ],
      };
  if (text && String(text).trim() !== "") createDoc.text = text;
  if (imageUrl) createDoc.imageUrl = imageUrl;
  if (audioUrl) createDoc.audioUrl = audioUrl;
      console.log(
        "[socket sendMessageHandler inside room] creating doc:",
        JSON.stringify(createDoc)
      );
      const message = await Message.create(createDoc);
      conversation.latestmessage =
        text && String(text).trim() !== ""
          ? text
          : imageUrl
          ? "[image]"
          : audioUrl
          ? "[voice]"
          : conversation.latestmessage;
      await conversation.save();
      return message;
    }
  } catch (err) {
    console.error("[sendMessageHandler] error creating message:", err);
    return null;
  }
};

const deleteMessageHandler = async (data) => {
  const { messageId, deleteFrom } = data;
  const message = await Message.findById(messageId);

  if (!message) {
    return false;
  }

  try {
    deleteFrom.forEach(async (userId) => {
      if (!message.deletedFrom.includes(userId)) {
        message.deletedFrom.push(userId);
      }
    });
    await message.save();

    return true;
  } catch (error) {
    console.log(error.message);
    return false;
  }
};

module.exports = {
  sendMessage,
  allMessage,
  getAiResponse,
  deletemesage,
  sendMessageHandler,
  deleteMessageHandler,
  uploadImage,
};
