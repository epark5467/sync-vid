const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
let randomColor = require('randomcolor');
const io = require("socket.io")(server);
const cors = require("cors");

app.use(cors());


const NEW_MESSAGE = 'new_message';
const GET_USERS = 'get_users';
const GET_PLAYLIST = 'get_playlist';
const CHANGE_CURRENT_VIDEO = "change_current_video";



app.use(express.static(path.join(__dirname, 'build')));



// Listen on port 5000
const PORT = process.env.PORT || 5000;


app.get('/', (req, res) => {
    res.send(path.join(__dirname, 'build', 'index.html'));
});



server.listen(PORT, () => {console.log(`Listen on *: ${PORT}`)});


io.set('transports', ['websocket']);

var connections = []; // connection mangements
var playlists = [];

// Listen on every connection
io.on("connection", socket => {
    let thisRoom;
    let socketId = socket.client.id;
    let thisPlaylist;

    socket.on("JOIN_ROOM", roomName => {

        thisRoom = roomName;
        let roomExists = connections.filter(item => 
            item.roomName === thisRoom
        );

        if(roomExists.length > 0) {
            thisPlaylist = playlists.find(item=> item.roomName === thisRoom).playlist;
            socket.username = "Anonymous";
            socket.color = randomColor();
            socket.role = "guest";
            connections.push({id: socketId, roomName: thisRoom, username: socket.username, color: socket.color, role: socket.role});

            // find admin user for this room
            let currentAdmin = connections.find(item=> item.roomName === thisRoom && item.role === "admin");

            if(currentAdmin)
                // make a request to admin for current video information
                io.to(currentAdmin.id).emit("current_video_request", socketId);
        } else {
            thisPlaylist = [];  
            socket.username = "Admin";
            socket.role="admin";
            socket.color = randomColor();
            connections.push({id: socketId, roomName: thisRoom, username: socket.username, color: socket.color, role: socket.role});
            playlists.push({roomName: thisRoom, playlist: thisPlaylist});
        }
        
        let userInfo = {id: socketId, roomName: thisRoom, username: socket.username, color: socket.color, role: socket.role};
        socket.join(roomName);
        updateUserProp(userInfo);
        updateUserlist(thisRoom);
        updatePlaylist(thisPlaylist);
    });

    /*
    socket.on("JOIN_ROOM", roomName => {
        let roomExists = connections.find(function(item) {
            return item.roomName === roomName; 
        });

        thisRoom = roomName;
        let cookief = socket.handshake.headers.cookie;
        
        if(!cookief) {
            socket.username = 'Anonymous';
            socket.color = randomColor();
            socket.role = "guest";

            if(!roomExists) {

            }
        } else {
            let userCookie = cookie.parse(socket.handshake.headers.cookie).io;
            if(roomExists) {
                let thisRoomUsers = connections.find(function(item){
                    if(item.roomName == roomName)
                        return item.users;
                });

                let userInfo = thisRoomUsers.find(function(item) {
                    if(item.cookie == userCookie)  
                        return item;
                });

                if(!userInfo) {
                    socket.username = userInfo.username;
                    socket.color = userInfo.color;
                    socket.role = userInfo.role;
                } else {
                    socket.username = "Anonymous";
                    socket.color = randomColor();
                    socket.role = "guest";
                }
                socket.join(roomName);
            } else {
                let newRoomUsers = [];
                socket.username = "Anoymous";
                socket.color = randomColor();
                socket.role = "admin";
                newRoomUsers.push({cookie: userCookie, username: socket.username, color: socket.color , role: socket.role});
                let newRoom = { roomName: roomName, users: newRoomUsers };
                connections.push(newRoom);
                socket.join(roomName);
                 
            }
        }

        socket.emit("user_info", { username: socket.username, color: socket.color});
        console.log( socket.username + " joined room  " + roomName + " (" + cookief + ")");
        console.log
        updateUserlist();
    });
*/
    // Update Usernames in the client

    const updateUserlist = (roomName) => {
        let item = connections.filter(item=> item.roomName == roomName);

        io.to(thisRoom).emit(GET_USERS, connections);
    };

    // Update playlist
    const updatePlaylist = (item) => {
        io.to(thisRoom).emit(GET_PLAYLIST, item);
    };

    // Update current user info

    const updateUserProp = (data) => { 
        io.to(data.id).emit("user_info", { id: data.id, username: data.username, color: data.color, role: data.role});
    }

    // Listen on username updates 
    socket.on( "change_username" , newUsername => {
        socket.username = newUsername;
        connections.find(item=> item.id === socketId).username = newUsername;
        updateUserlist(thisRoom);
        updateUserProp(socketId);
    });

    socket.on("change_role", role => {
        socket.role = role;
    });

    socket.on("add_new_video", data => {
        if( thisPlaylist.length < 1 && data.isPlaying == false) {
            socket.emit("change_current_video", data.url);
        } else {
            thisPlaylist.push(data.url);
            updatePlaylist(thisPlaylist);
        }
    });

    socket.on("play_video", index => {
        let newURL = thisPlaylist[index];
        io.to(thisRoom).emit(CHANGE_CURRENT_VIDEO, newURL);
        thisPlaylist.splice(index, 1);
        playlists.find(item=> item.roomName === thisRoom).playlist = thisPlaylist;
        updatePlaylist(thisPlaylist);
    });

    socket.on("current_video_prop", data => {
        let video = {url: data.url, played: data.played};
        if(data.user == "all")
            io.to(thisRoom).emit("update_video", video);
        else
            io.to(data.user).emit("update_video", video);
    });

    socket.on("update_playlist", data => {        
        thisPlaylist = data;
        playlists.find(item=> item.roomName === thisRoom).playlist = thisPlaylist;
        updatePlaylist(thisPlaylist);
    });


    // Listen on new message
    socket.on(NEW_MESSAGE, (data) => {
        // broadcast the new message
        io.to(data.room).emit("INCOMING_MESSAGE", 
            { sender: data.sender, message: data.message, sentByCurrentUser: false});
    });

    socket.on('connect_error', () => {
        console.log("connect error");
    });

    // Disconnect
    socket.on('disconnect', data => {
        if(!socket.username)
            return

        // find the user and remove from the room
        connections = connections.filter(item=> item.id !== socketId);        
        if(socket.role === "admin" && connections.filter(item=> item.roomName === thisRoom).length > 0) {
            let nextAdmin = connections.find(item=> item.roomName === thisRoom);
            nextAdmin.role = "admin";
            updateUserProp(nextAdmin);           
        }
        updateUserlist(thisRoom);
        /*
        if(!socket.username)
            return;

        // find the user and delete from the userlist
        let user = undefined;
        for (let i = 0; i < thisUserlist.length; i++) {
            if(connections[i].id === socket.client) {
                user = connections[i];
                break;
            }
        }

        // Update the userlist
        updateUserlist();
        */

        // remove user from the room
        // if user was an admin, set new admin
    });
});