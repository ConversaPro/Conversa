import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  IconButton,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Tag,
  TagLabel,
  TagRightIcon,
  Text,
  useToast,
} from "@chakra-ui/react";
import { AddIcon, DeleteIcon, EditIcon, StarIcon } from "@chakra-ui/icons";
import chatContext from "../../context/chatContext";

const GroupInfoModal = ({ isOpen, onClose, conversation }) => {
  const toast = useToast();
  const ctx = useContext(chatContext);
  const {
    user,
    hostName,
    fetchData,
    setReceiver,
    mutedConversations,
    setMutedConversations,
    pinnedConversations,
    setPinnedConversations,
  } = ctx;

  const isAdmin = useMemo(() => {
    return conversation?.admins?.map(String).includes(String(user?._id));
  }, [conversation, user]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [groupIcon, setGroupIcon] = useState("");
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (conversation?._id) {
      setName(conversation.name || "");
      setDescription(conversation.description || "");
      setGroupIcon(conversation.groupIcon || "");
      setMembers(conversation.members || []);
    }
  }, [conversation]);

  const updateMeta = async () => {
    try {
      setSaving(true);
      const res = await fetch(`${hostName}/conversation/group/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify({ conversationId: conversation._id, name, description, groupIcon }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchData();
      setReceiver((r) => ({ ...r, name, profilePic: groupIcon }));
      toast({ title: "Group updated", status: "success", duration: 2000 });
    } catch (e) {
      toast({ title: "Update failed", description: String(e), status: "error" });
    } finally {
      setSaving(false);
    }
  };

  const pickIcon = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Upload via backend existing message upload endpoint for simplicity
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${hostName}/message/upload`, {
        method: "POST",
        headers: { "auth-token": localStorage.getItem("token") },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      setGroupIcon(data.url || data.secure_url || data.path);
    } catch (e) {
      toast({ title: "Icon upload failed", description: String(e), status: "error" });
    }
  };

  const removeMember = async (memberId) => {
    try {
      const res = await fetch(`${hostName}/conversation/group/remove-member`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify({ conversationId: conversation._id, memberId }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMembers((m) => m.filter((u) => u._id !== memberId));
      fetchData();
    } catch (e) {
      toast({ title: "Failed", description: String(e), status: "error" });
    }
  };

  const promote = async (memberId) => {
    try {
      const res = await fetch(`${hostName}/conversation/group/promote`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify({ conversationId: conversation._id, memberId }),
      });
      if (!res.ok) throw new Error(await res.text());
      fetchData();
    } catch (e) {
      toast({ title: "Failed", description: String(e), status: "error" });
    }
  };

  const demote = async (memberId) => {
    try {
      const res = await fetch(`${hostName}/conversation/group/demote`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify({ conversationId: conversation._id, memberId }),
      });
      if (!res.ok) throw new Error(await res.text());
      fetchData();
    } catch (e) {
      toast({ title: "Failed", description: String(e), status: "error" });
    }
  };

  const addMembers = async () => {
    try {
      // Fetch addable users from non-friends list for now
      const resUsers = await fetch(`${hostName}/user/non-friends`, {
        method: "GET",
        headers: { "auth-token": localStorage.getItem("token") },
      });
      const all = await resUsers.json();
      const selectable = all.filter((u) => !members.find((m) => m._id === u._id));
      if (selectable.length === 0) {
        toast({ title: "No users to add", status: "info" });
        return;
      }
      const ids = selectable.slice(0, 5).map((u) => u._id); // quick add first 5
      const res = await fetch(`${hostName}/conversation/group/add-members`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify({ conversationId: conversation._id, memberIds: ids }),
      });
      if (!res.ok) throw new Error(await res.text());
      fetchData();
      toast({ title: `Added ${ids.length} members`, status: "success" });
    } catch (e) {
      toast({ title: "Add failed", description: String(e), status: "error" });
    }
  };

  const leaveGroup = async () => {
    try {
      const res = await fetch(`${hostName}/conversation/group/leave`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify({ conversationId: conversation._id }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchData();
      onClose();
      toast({ title: "Left group", status: "success" });
    } catch (e) {
      toast({ title: "Leave failed", description: String(e), status: "error" });
    }
  };

  const deleteGroup = async () => {
    try {
      const res = await fetch(`${hostName}/conversation/group/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify({ conversationId: conversation._id }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchData();
      onClose();
      toast({ title: "Group deleted", status: "success" });
    } catch (e) {
      toast({ title: "Delete failed", description: String(e), status: "error" });
    }
  };

  const toggleMute = () => {
    const id = conversation._id;
    setMutedConversations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const togglePin = () => {
    const id = conversation._id;
    setPinnedConversations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const isMuted = mutedConversations.includes(conversation._id);
  const isPinned = pinnedConversations.includes(conversation._id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Group info</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            <Flex align="center" gap={4}>
              <Image
                src={groupIcon || "https://via.placeholder.com/100"}
                alt="icon"
                boxSize="64px"
                borderRadius="full"
                objectFit="cover"
              />
              {isAdmin && (
                <Button as="label" leftIcon={<EditIcon />}>Change icon
                  <input type="file" accept="image/*" hidden onChange={pickIcon} />
                </Button>
              )}
            </Flex>
            <Box>
              <Text fontSize="sm" color="gray.400">Name</Text>
              <Input value={name} onChange={(e) => setName(e.target.value)} isDisabled={!isAdmin} />
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.400">Description</Text>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} isDisabled={!isAdmin} />
            </Box>
            <HStack>
              <Tag colorScheme={isMuted ? "red" : "green"} cursor="pointer" onClick={toggleMute}>
                <TagLabel>{isMuted ? "Unmute" : "Mute"}</TagLabel>
                <TagRightIcon as={isMuted ? DeleteIcon : StarIcon} />
              </Tag>
              <Tag colorScheme={isPinned ? "purple" : "gray"} cursor="pointer" onClick={togglePin}>
                <TagLabel>{isPinned ? "Unpin" : "Pin"}</TagLabel>
                <TagRightIcon as={StarIcon} />
              </Tag>
            </HStack>
            {isAdmin && (
              <Button onClick={updateMeta} isLoading={saving} colorScheme="purple">Save changes</Button>
            )}

            <Divider />
            <Flex align="center" justify="space-between">
              <Text fontWeight="bold">Members ({members.length})</Text>
              {isAdmin && (
                <Button leftIcon={<AddIcon />} size="sm" onClick={addMembers}>Add members</Button>
              )}
            </Flex>
            <Stack spacing={2} maxH="240px" overflowY="auto">
              {members.map((m) => {
                const admin = conversation.admins?.map(String).includes(String(m._id));
                return (
                  <Flex key={m._id} align="center" justify="space-between">
                    <HStack>
                      <Avatar size="sm" src={m.profilePic} name={m.name} />
                      <Box>
                        <Text>{m.name} {String(m._id) === String(user._id) ? "(You)" : ""}</Text>
                        {admin && <Text fontSize="xs" color="purple.300">admin</Text>}
                      </Box>
                    </HStack>
                    {isAdmin && String(m._id) !== String(user._id) && (
                      <HStack>
                        {admin ? (
                          <Button size="xs" variant="ghost" onClick={() => demote(m._id)}>Demote</Button>
                        ) : (
                          <Button size="xs" variant="ghost" onClick={() => promote(m._id)}>Make admin</Button>
                        )}
                        <IconButton aria-label="remove" size="xs" onClick={() => removeMember(m._id)} icon={<DeleteIcon />} />
                      </HStack>
                    )}
                  </Flex>
                );
              })}
            </Stack>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={3}>
            <Button onClick={onClose}>Close</Button>
            {isAdmin ? (
              <Button onClick={deleteGroup} colorScheme="red" variant="outline">Delete group</Button>
            ) : (
              <Button onClick={leaveGroup} colorScheme="red" variant="outline">Leave group</Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default GroupInfoModal;
