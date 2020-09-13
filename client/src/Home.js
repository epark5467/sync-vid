import React, { useState } from "react";
import { TextField, Button, Divider } from "@material-ui/core";
import { Link } from "react-router-dom";
import "./App.scss";

function Home() {
    const [roomName, setRoomName] = useState("");

    const handleRoomNameInput = (event) => {
        setRoomName(event.target.value);
    };


    return (
        <div className="home-container">
            <div className="home-header">
               <h1>SyncVid</h1>
                <span>Watch online videos with your friends!</span> 
            </div>
            <div className="room-selection">
                <span className="room-selection-text">Enter Channel</span>
                <TextField className="room-name-input" value={roomName} 
                     onChange={handleRoomNameInput}></TextField>
                <Link to={`r/${roomName}`} className="enter-room-button"><Button>Join Room</Button></Link>
            </div>
        </div>
    )
};

export default Home; 