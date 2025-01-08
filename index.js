const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

const chatDB = [];
let activeUser = [];

// Log active users for debugging
console.log(activeUser);

io.on("connection", (socket) => {
  // Join room logic
  socket.on("joinRoom", (info) => {
    const checkSocketID = activeUser.filter(
      (user) => user.socket === socket.id
    );

    const checkUser = checkSocketID.some(
      (user) => user.name.toLowerCase() === info.name.toLowerCase()
    );

    if (checkUser) {
      console.log("User with this name already exists.");
      return socket.emit("serverResponse", {
        message: "User with this name already exists in the room",
        type: false,
      });
    } else {
      console.log("Joining room:", info.room);
      socket.join(info.room);
      const user = { ...info, socket: socket.id };
      activeUser.unshift(user);

      const roomData = chatDB.filter((msg) => msg.room === info.room);
      const userData = activeUser.filter((user) => user.room === info.room);

      io.to(info.room).emit("chatEvent", roomData);
      io.to(info.room).emit("activeUserEvent", userData);
    }
  });

  // Handle chat events
  socket.on("chatEvent", (data) => {
    chatDB.unshift(data);
    io.to(data.room).emit("chatEvent", chatDB);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    const userIndex = activeUser.findIndex((user) => user.socket === socket.id);

    if (userIndex !== -1) {
      const user = activeUser.splice(userIndex, 1)[0];
      const userData = activeUser.filter((u) => u.room === user.room);
      io.to(user.room).emit("activeUserEvent", userData);
    }
  });
});

// Start server
server.listen(4000, () => console.log("Server running on port 4000"));
