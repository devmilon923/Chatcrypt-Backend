const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const moment = require("moment-timezone");
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let chatDB = [];
let activeUser = [];
// Function to reset chat at midnight
const resetChat = () => {
  // Get the current BD time
  const bdCurrentTime = moment.tz("Asia/Dhaka");

  // Calculate the next midnight (end of the current day in BD timezone)
  const nextMidnight = bdCurrentTime.clone().endOf("day");

  // Calculate time until next midnight in milliseconds
  const timeUntilMidnight = nextMidnight.diff(bdCurrentTime);

  // Schedule a reset at midnight
  setTimeout(() => {
    chatDB = [];
    activeUser = [];

    // Reschedule the reset for the next day (recursion ensures it runs daily)
    resetChat();
  }, timeUntilMidnight);

  return timeUntilMidnight;
};
app.get("/", (req, res) => {
  res.send("Walcome");
});
io.on("connection", (socket) => {
  socket.on("joinRoom", (info) => {
    // const timeUntilMidnight = resetChat(); // Calculate time until reset
    // socket.emit("timestaps", timeUntilMidnight);
    const isNameTaken = activeUser.some(
      (user) =>
        user.room?.toLowerCase() === info.room?.toLowerCase() &&
        user.name?.toLowerCase() === info.name?.toLowerCase()
    );
    if (isNameTaken) {
      console.log(
        `Username "${info.name}" is already taken in room "${info.room}".`
      );
      socket.emit("serverResponse", {
        message: `User name must be unique in room`,
        type: false,
      });

      return;
    }
    // Check if the socket ID is already present in the specified room
    const isSocketIDTaken = activeUser.some(
      (user) =>
        user.room?.toLowerCase() === info.room?.toLowerCase() &&
        user.socket === socket.id
    );

    if (isSocketIDTaken) {
      console.log(
        `Socket ID "${socket.id}" is already associated with room "${info.room}".`
      );
      socket.emit("serverResponse", {
        message: `You are already in`,
        type: false,
      });

      return;
    }

    // console.log("Joining room:", info.room);
    socket.join(info.room);
    const user = { ...info, socket: socket.id };
    activeUser.unshift(user);

    const roomData = chatDB.filter((msg) => msg.room === info.room);
    const userData = activeUser.filter((user) => user.room === info.room);

    io.to(info.room).emit("chatEvent", roomData);

    io.to(info.room).emit("activeUserEvent", userData);
    socket.emit("serverResponse", {
      message: `You are in`,
      type: true,
    });
    socket.emit("status", true);
    return;
  });

  // Handle chat events
  socket.on("chatEvent", (data) => {
    chatDB.push(data);
    io.to(data.room).emit("chatEvent", chatDB);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    const userIndex = activeUser.findIndex((user) => user.socket === socket.id);

    if (userIndex !== -1) {
      const user = activeUser.splice(userIndex, 1)[0];
      const userData = activeUser.filter((u) => u.room === user.room);

      io.to(user.room).emit("activeUserEvent", userData);
      socket.emit("status", false);
    }
  });
});

// Start server
server.listen(4000, () => console.log("Server running on port 4000"));
