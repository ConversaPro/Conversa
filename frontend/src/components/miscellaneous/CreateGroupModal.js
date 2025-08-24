import React, { useContext, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Textarea,
  Avatar,
  HStack,
  useToast,
} from "@chakra-ui/react";
import chatContext from "../../context/chatContext";

export default function CreateGroupModal({ isOpen, onClose }) {
  const { myChatList, hostName, fetchData, setMyChatList } = useContext(chatContext);
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState([]);

  const selectable = useMemo(
    () => myChatList?.map((c) => c.members?.[0]).filter(Boolean) || [],
    [myChatList]
  );

  const submit = async () => {
    try {
      if (!name || selected.length < 2) {
        toast({ title: "Name + at least 2 people required", status: "warning" });
        return;
      }
  const res = await fetch(`${hostName}/conversation/group/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify({ name, description, memberIds: selected.map((u) => u._id) }),
      });
  if (!res.ok) throw new Error(await res.text());
  const group = await res.json();
  toast({ title: "Group created", status: "success" });
  // optimistic add to list
  setMyChatList?.((prev) => [group, ...(prev || [])]);
  await fetchData?.();
      onClose();
    } catch (e) {
      toast({ title: "Failed to create group", description: String(e), status: "error" });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create New Group</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Input placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} mb={3} />
          <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} mb={4} />
          <CheckboxGroup value={selected.map((u) => u._id)}>
            <Stack maxH="45vh" overflowY="auto">
              {selectable.map((u) => (
                <HStack key={u._id} spacing={3}>
                  <Checkbox
                    isChecked={selected.some((s) => s._id === u._id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelected((prev) => [...prev, u]);
                      else setSelected((prev) => prev.filter((s) => s._id !== u._id));
                    }}
                  />
                  <Avatar size="sm" src={u.profilePic} name={u.name} />
                  <Box>{u.name}</Box>
                </HStack>
              ))}
            </Stack>
          </CheckboxGroup>
        </ModalBody>
        <ModalFooter>
          <Button mr={3} onClick={onClose}>Cancel</Button>
          <Button colorScheme="purple" onClick={submit}>Create</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
